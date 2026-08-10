import { useState, useEffect } from 'react'
import { Typography, Grid, Select, Button } from 'antd'
import { theme } from 'antd'
import { LockOutlined, MailOutlined, DeleteOutlined } from '@ant-design/icons'
import LoggedInMfaManager from '@/features/authentication/mfa/components/LoggedInMfaManager.jsx'
import MfaSetup from '@/features/authentication/mfa/components/MfaSetup.jsx'
import LoggedInPasswordChangeFlow from '@/features/authentication/flows/account-management/components/LoggedInPasswordChangeFlow.jsx'
import LoggedInEmailChangeFlow from '@/features/authentication/flows/account-management/components/LoggedInEmailChangeFlow.jsx'
import EmailChangeGracePeriod from '@/features/authentication/flows/account-management/components/EmailChangeGracePeriod.jsx'
import MfaReenrollmentAlert from '@/features/authentication/flows/account-management/components/MfaReenrollmentAlert.jsx'
import ActiveSessions from '@/features/user/components/sessions/ActiveSessions.jsx'
import { usePasskeyManager } from '@/features/authentication/passkey/hooks/usePasskeyManager'
import { useLoggedInMfaManager } from '@/features/authentication/hooks'
import { DeleteAccountFlow, DeletionScheduledBanner, useAuthSession } from '@/features/authentication'
import { SECURITY_SECTIONS } from '@/features/user/constants'

const { Title, Paragraph } = Typography

const SECTION_PANEL_WIDTH = 220
/** Centered content width for section detail (login-style consistency) */
const CENTERED_CONTENT_MAX_WIDTH = 420

function getSecuritySections(showPasswordSection, showDeleteAccountSection, showEmailSection = true, showSessionsSection = true, showMfaSection = true) {
  return SECURITY_SECTIONS.filter((s) => {
    if (s.key === 'password' && !showPasswordSection) return false
    if (s.key === 'deleteAccount' && !showDeleteAccountSection) return false
    if (s.key === 'email' && !showEmailSection) return false
    if (s.key === 'sessions' && !showSessionsSection) return false
    if (s.key === 'mfa' && !showMfaSection) return false
    return true
  })
}

export default function SecurityTabContent({ showPasswordSection = false, showDeleteAccountSection = false, showEmailSection = true, showSessionsSection = true, showMfaSection = true }) {
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const sections = getSecuritySections(showPasswordSection, showDeleteAccountSection, showEmailSection, showSessionsSection, showMfaSection)
  const [selectedKey, setSelectedKey] = useState('mfa')
  const [passwordShowingFlow, setPasswordShowingFlow] = useState(false)
  const [emailShowingFlow, setEmailShowingFlow] = useState(false)
  const [mfaShowingSetupForm, setMfaShowingSetupForm] = useState(false)
  const [deleteAccountShowingFlow, setDeleteAccountShowingFlow] = useState(false)
  const { isAdmin, hasPasskeys } = usePasskeyManager()
  const { refetchMfaStatus } = useLoggedInMfaManager()
  const { currentUser } = useAuthSession()

  useEffect(() => {
    if (!showPasswordSection && selectedKey === 'password') setSelectedKey('mfa')
  }, [showPasswordSection, selectedKey])

  useEffect(() => {
    if (selectedKey === 'deleteAccount' && !showDeleteAccountSection) setSelectedKey('mfa')
  }, [selectedKey, showDeleteAccountSection])

  // Refetch MFA status when user opens the MFA section (e.g. after onboarding so Settings shows correct state)
  useEffect(() => {
    if (selectedKey === 'mfa') {
      refetchMfaStatus()
    }
  }, [selectedKey, refetchMfaStatus])

  useEffect(() => {
    setPasswordShowingFlow(false)
    setEmailShowingFlow(false)
    setMfaShowingSetupForm(false)
    setDeleteAccountShowingFlow(false)
  }, [selectedKey])

  /** Intro card style for Password and Email (matches MFA/Passkey alert style) */
  const introCardStyle = (t) => ({
    padding: 24,
    background: t.colorFillAlter,
    border: `1px solid ${t.colorBorderSecondary}`,
    borderRadius: t.borderRadiusLG,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 20,
  })

  const renderDetail = () => {
    const centeredWrapperStyle = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      flex: 1,
      minHeight: 0,
      overflow: 'auto',
      padding: '0 16px 24px',
    }
    const centeredContentStyle = {
      maxWidth: CENTERED_CONTENT_MAX_WIDTH,
      width: '100%',
    }
    if (selectedKey === 'mfa') {
      if (mfaShowingSetupForm) {
        return (
          <div style={{ ...centeredWrapperStyle }}>
            <div style={centeredContentStyle}>
              <Button type="text" onClick={() => setMfaShowingSetupForm(false)} style={{ marginBottom: 16, paddingLeft: 0 }}>
                ← Back
              </Button>
              <MfaSetup
                onComplete={() => {
                  setMfaShowingSetupForm(false)
                  refetchMfaStatus()
                }}
              />
            </div>
          </div>
        )
      }
      return (
        <div style={{ ...centeredWrapperStyle }}>
          <div style={centeredContentStyle}>
            
            <MfaReenrollmentAlert onSetupClick={() => setMfaShowingSetupForm(true)} />
            <LoggedInMfaManager
              isAdmin={isAdmin}
              hasPasskeys={hasPasskeys}
              onOpenSetupForm={() => setMfaShowingSetupForm(true)}
            />
          </div>
        </div>
      )
    }
    if (selectedKey === 'password' && showPasswordSection) {
      if (passwordShowingFlow) {
        return (
          <div style={{ ...centeredWrapperStyle }}>
            <div style={centeredContentStyle}>
              <LoggedInPasswordChangeFlow onBackToStart={() => setPasswordShowingFlow(false)} />
            </div>
          </div>
        )
      }
      return (
        <div style={{ ...centeredWrapperStyle }}>
          <div style={centeredContentStyle}>
            <div style={introCardStyle(token)}>
              <LockOutlined style={{ fontSize: 32, color: token.colorPrimary }} />
              <div>
                <Title level={5} style={{ margin: 0, marginBottom: 4 }}>Password</Title>
                <Paragraph type="secondary" style={{ margin: 0 }}>
                  Change your password to keep your account secure. We&apos;ll send a verification code to your email first.
                </Paragraph>
              </div>
              <Button type="primary" onClick={() => setPasswordShowingFlow(true)} icon={<LockOutlined />}>
                Change password
              </Button>
            </div>
          </div>
        </div>
      )
    }
    if (selectedKey === 'email') {
      if (emailShowingFlow) {
        return (
          <div style={{ ...centeredWrapperStyle }}>
            <div style={centeredContentStyle}>
              <EmailChangeGracePeriod />
              <LoggedInEmailChangeFlow onBackToStart={() => setEmailShowingFlow(false)} />
            </div>
          </div>
        )
      }
      return (
        <div style={{ ...centeredWrapperStyle }}>
          <div style={centeredContentStyle}>
            <EmailChangeGracePeriod />
            <div style={introCardStyle(token)}>
              <MailOutlined style={{ fontSize: 32, color: token.colorPrimary }} />
              <div>
                <Title level={5} style={{ margin: 0, marginBottom: 4 }}>Email Address</Title>
                <Paragraph type="secondary" style={{ margin: 0 }}>
                  Update the email address used for sign-in and account notifications. We&apos;ll verify your current email first.
                </Paragraph>
              </div>
              <Button type="primary" onClick={() => setEmailShowingFlow(true)} icon={<MailOutlined />}>
                Update email address
              </Button>
            </div>
          </div>
        </div>
      )
    }
    if (selectedKey === 'sessions') {
      return (
        <div style={{ ...centeredWrapperStyle }}>
          <div style={centeredContentStyle}>
            <ActiveSessions />
          </div>
        </div>
      )
    }
    if (selectedKey === 'deleteAccount' && showDeleteAccountSection) {
      if (currentUser?.deletionPending) {
        return (
          <div style={{ ...centeredWrapperStyle }}>
            <div style={centeredContentStyle}>
              <DeletionScheduledBanner />
            </div>
          </div>
        )
      }
      if (!deleteAccountShowingFlow) {
        return (
          <div style={{ ...centeredWrapperStyle }}>
            <div style={centeredContentStyle}>
              <div style={introCardStyle(token)}>
                <DeleteOutlined style={{ fontSize: 32, color: token.colorError }} />
                <div>
                  <Title level={5} style={{ margin: 0, marginBottom: 4 }}>Delete account</Title>
                  <Paragraph type="secondary" style={{ margin: 0 }}>
                    Remove your account access after identity verification. Some records may be retained where required for BPLO, legal, audit, or government record-keeping purposes.
                  </Paragraph>
                </div>
                <Button type="primary" danger onClick={() => setDeleteAccountShowingFlow(true)} icon={<DeleteOutlined />}>
                  Request account deletion
                </Button>
              </div>
            </div>
          </div>
        )
      }
      return (
        <div style={{ ...centeredWrapperStyle }}>
          <div style={centeredContentStyle}>
            <DeleteAccountFlow onBackToStart={() => setDeleteAccountShowingFlow(false)} />
          </div>
        </div>
      )
    }
    return null
  }

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <div style={{ flexShrink: 0, marginBottom: 24, textAlign: 'center' }}>
          <Title level={4} style={{ marginBottom: 4 }}>Security</Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            Manage password, two-factor authentication, email, and active sessions.
          </Paragraph>
        </div>
        <Select
          value={selectedKey}
          onChange={setSelectedKey}
          options={sections.map((s) => ({ value: s.key, label: s.label }))}
          style={{ width: '100%', maxWidth: CENTERED_CONTENT_MAX_WIDTH, margin: '0 auto 16px', display: 'block' }}
        />
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {renderDetail()}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: 0 }}>
      <div style={{ flexShrink: 0, marginBottom: 24, textAlign: 'center' }}>
        <Title level={4} style={{ marginBottom: 4 }}>Security</Title>
        <Paragraph type="secondary" style={{ margin: 0 }}>
          Manage password, two-factor authentication, email, and active sessions.
        </Paragraph>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
      <div
        style={{
          flexShrink: 0,
          width: SECTION_PANEL_WIDTH,
          minWidth: SECTION_PANEL_WIDTH,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          paddingRight: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          overflowY: 'auto',
        }}
      >
        {sections.map((section) => {
          const IconComponent = section.icon
          return (
          <Button
            key={section.key}
            type={selectedKey === section.key ? 'primary' : 'default'}
            icon={IconComponent ? <IconComponent /> : undefined}
            onClick={() => setSelectedKey(section.key)}
            style={{
              textAlign: 'left',
              justifyContent: 'flex-start',
              fontWeight: selectedKey === section.key ? 600 : 400,
              whiteSpace: 'normal',
              height: 'auto',
              minHeight: 40,
              padding: '8px 12px',
              lineHeight: 1.4,
            }}
          >
            {section.label}
          </Button>
          )
        })}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: token.colorBgContainer }}>
        {renderDetail()}
      </div>
    </div>
    </div>
  )
}
