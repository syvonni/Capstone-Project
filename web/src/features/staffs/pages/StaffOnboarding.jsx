import { useState, useEffect } from 'react'
import { Row, Col, theme } from 'antd'
import { useStaffOnboarding } from '../hooks/useStaffOnboarding'
import StaffLayout from '@/shared/components/StaffLayout'
import OnboardingStepContent from '@/shared/components/OnboardingStepContent'
import { mfaStatus } from '@/features/authentication/services/mfaService'
import { getProfile } from '@/features/authentication/services/authService'
import { useAuthSession } from '@/features/authentication'

// MFA always required for staff when backend sets mustSetupMfa (no dev bypass)
const bypassMfaDev = false

export default function StaffOnboarding() {
  const [currentStep, setCurrentStep] = useState(0)
  const [completingOnboarding, setCompletingOnboarding] = useState(false)
  const { login, currentUser: authCurrentUser } = useAuthSession()
  const {
    form,
    submitting,
    mustChange,
    mustMfa: mustMfaRaw,
    currentUser,
    homePath,
    handleCredentialsFinish,
    navigate,
  } = useStaffOnboarding({
    onCredentialsSuccess: () => setCurrentStep(2),
  })
  const mustMfa = mustMfaRaw
  const { token } = theme.useToken()
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [checkingMfa, setCheckingMfa] = useState(false)

  // Check MFA status on mount. MFA counts as enabled if TOTP, passkey, or fingerprint is set up.
  useEffect(() => {
    if (bypassMfaDev) {
      setMfaEnabled(true)
      return
    }
    if (!currentUser?.email) return
    let cancelled = false
    setCheckingMfa(true)
    mfaStatus(currentUser.email)
      .then((status) => {
        if (cancelled) return
        const enabled = !!status?.enabled || status?.method === 'passkey' || !!status?.fprintEnabled
        setMfaEnabled(enabled)
      })
      .catch((err) => console.error('Failed to check MFA status:', err))
      .finally(() => { if (!cancelled) setCheckingMfa(false) })
    return () => { cancelled = true }
  }, [currentUser?.email])

  // Single source of truth for step routing once MFA status is known
  useEffect(() => {
    if (checkingMfa) return
    // Skip MFA step if already enabled
    if (currentStep === 2 && mfaEnabled) {
      setCurrentStep(3)
    }
  }, [currentStep, mfaEnabled, checkingMfa])

  const handleComplete = async () => {
    setCompletingOnboarding(true)
    try {
      // Fetch fresh profile to ensure mustChangeCredentials and mustSetupMfa are cleared
      const fresh = await getProfile()
      const merged = { ...currentUser, ...fresh, token: currentUser?.token }
      const remember = !!localStorage.getItem('auth__currentUser')
      login(merged, { remember })
    } catch (e) {
      console.error('[StaffOnboarding] Failed to refresh profile before dashboard', e)
      // Fallback: navigate anyway to avoid being stuck
      setCompletingOnboarding(false)
      navigate(homePath, { replace: true })
    }
  }

  // Navigate after auth context has updated with cleared flags
  useEffect(() => {
    if (completingOnboarding && authCurrentUser && !authCurrentUser.mustChangeCredentials && !authCurrentUser.mustSetupMfa) {
      // Auth context has been updated with cleared flags, safe to navigate
      navigate(homePath, { replace: true })
    }
  }, [completingOnboarding, authCurrentUser, navigate, homePath])

  return (
    <StaffLayout
      hideSidebar
      noContentWrap
      pageTitle="Onboarding"
    >
      <div
        style={{
          paddingBottom: 128,
          background: token.colorBgContainer,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        <Row justify="center" align="middle" style={{ flex: 1 }}>
          <Col xs={24} sm={24} md={20} lg={18} xl={16}>
            <OnboardingStepContent
              variant="staff"
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              mustChange={mustChange}
              mustMfa={mustMfa}
              currentUser={currentUser}
              form={form}
              handleCredentialsFinish={handleCredentialsFinish}
              submitting={submitting}
              checkingMfa={checkingMfa}
              mfaEnabled={mfaEnabled}
              onComplete={handleComplete}
              passwordExpired={!!currentUser?.passwordExpired}
              onBack={() => setCurrentStep(Math.max(0, currentStep - 1))}
              mode={currentUser?.passwordExpired ? 'password-expired' : 'onboarding'}
            />
          </Col>
        </Row>
      </div>
    </StaffLayout>
  )
}
