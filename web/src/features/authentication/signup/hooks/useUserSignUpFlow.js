import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthSession } from '@/features/authentication'

export function useUserSignUpFlow() {
  const navigate = useNavigate()
  const { login } = useAuthSession()
  const [step, setStep] = useState('form')
  const [emailForVerify, setEmailForVerify] = useState('')
  const [devCodeForVerify, setDevCodeForVerify] = useState('')

  const verifyEmail = useCallback(({ email, devCode }) => {
    setEmailForVerify(String(email || '').trim())
    setDevCodeForVerify(String(devCode || ''))
    setStep('verify')
  }, [])

  const resetFlow = useCallback(() => {
    setStep('form')
    setEmailForVerify('')
    setDevCodeForVerify('')
  }, [])

  const handleVerificationSubmit = useCallback((created) => {
    const rawUser = created?.user ?? created
    const token = rawUser?.token ?? created?.token
    const withToken = rawUser && token
      ? { ...rawUser, token }
      : created && token
        ? { ...created, token }
        : null

    if (!withToken || !withToken.token) {
      navigate('/login', { replace: true })
      return
    }

    const role = String(withToken?.role?.slug ?? withToken?.role ?? '').toLowerCase()

    try {
      login(withToken, { remember: false })
    } catch { /* ignore */ }

    if (role === 'admin') {
      navigate('/admin/dashboard', { replace: true })
      return
    }
    const staffRoles = ['staff', 'lgu_officer', 'inspector']
    if (staffRoles.includes(role)) {
      navigate(withToken?.mustChangeCredentials || withToken?.mustSetupMfa ? '/staff/onboarding' : '/staff', { replace: true })
      return
    }
    if (role === 'business_owner') {
      // New business owners go through onboarding (MFA setup with skip option)
      navigate(withToken?.mustSetupMfa || withToken?.mustChangeCredentials ? '/business-owner/onboarding' : '/owner', { replace: true })
      return
    }
    navigate('/owner', { replace: true })
  }, [navigate, login])

  return { step, emailForVerify, devCodeForVerify, verifyEmail, resetFlow, handleVerificationSubmit }
}
