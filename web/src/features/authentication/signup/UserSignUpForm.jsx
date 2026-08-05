// UserSignUpForm.jsx — Two-step signup: Account info → PIS fields
import React from 'react'
import { Form } from '@/shared/components/AppForm'
import { Input, Button, Checkbox, Typography, Row, Col, Grid, Divider, message, theme } from 'antd'
import { useNavigate, Link } from 'react-router-dom'

import { useUserSignUp, useUserSignUpFlow, useMaintenanceStatus, useResendSignupCode } from '@/features/authentication/hooks'
import PasswordStrengthIndicator from '@/features/authentication/components/PasswordStrengthIndicator.jsx'
import VerificationForm from '@/features/authentication/components/VerificationForm.jsx'
import PersonalInformationForm from './components/PersonalInformationForm.jsx'
import {
  signUpPasswordRules as passwordRules,
  signUpConfirmPasswordRules,
  termsRules,
} from '@/features/authentication/utils/validations'

import TurnstileWidget from '@/features/authentication/components/TurnstileWidget.jsx'
import { usePasswordStrength } from '../utils/signup/usePasswordStrength.js'
import { useStepNavigation } from '../utils/signup/useStepNavigation.js'
import { useDemoDataPrefill } from '../utils/signup/useDemoDataPrefill.js'

const { Title, Text } = Typography
const { useBreakpoint } = Grid
const { useToken } = theme

export default function UserSignUpForm({ extraContent }) {
  const { token } = useToken()
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const turnstileRef = React.useRef(null)
  const turnstileSiteKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_TURNSTILE_SITE_KEY) || ''
  const maintenance = useMaintenanceStatus()

  const { step, emailForVerify, devCodeForVerify, verifyEmail, handleVerificationSubmit } = useUserSignUpFlow()
  const resendHook = useResendSignupCode({ email: emailForVerify, cooldownSec: 60 })
  const { form, handleFinish, isSubmitting } = useUserSignUp({
    getCaptchaToken: turnstileSiteKey ? () => turnstileRef.current?.getToken?.() ?? '' : undefined,
    onBegin: ({ email, serverData }) => {
      verifyEmail({ email, devCode: serverData?.devCode })
    },
    onSubmit: () => {
      navigate('/login')
    },
  })

  const { passwordValue, setPasswordValue } = usePasswordStrength('')
  const { currentStep, handleNextStep, handlePreviousStep } = useStepNavigation(form)

  const showPrefillButton = import.meta.env.DEV === true
  const { handleFillDemoData, handleFillInvalidData } = useDemoDataPrefill(form, setPasswordValue, handlePreviousStep)

  if (step === 'verify') {
    return (
      <VerificationForm
        title="Verify Your Email"
        email={emailForVerify}
        devCode={devCodeForVerify}
        onSubmit={handleVerificationSubmit}
        verificationType="signup"
        maxWidth={480}
        onResend={resendHook.handleResend}
        isResending={resendHook.isSending}
        isCooling={resendHook.isCooling}
        remaining={resendHook.remaining}
      />
    )
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {extraContent && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: isMobile ? 20 : 24 }}>
          {extraContent}
        </div>
      )}

      <Form
        name="userSignUp"
        form={form}
        layout="vertical"
        onFinish={async (values) => {
          // Check maintenance mode before proceeding with registration
          if (maintenance.active) {
            message.warning('Registration is temporarily unavailable due to maintenance. Please try again later.')
            return
          }
          
          try {
            await handleFinish(values)
          } finally {
            turnstileRef.current?.reset?.()
          }
        }}
        size="default"
        requiredMark="*"
        style={{ maxWidth: 500, width: '100%' }}
      >
        <Title level={isMobile ? 4 : 3} style={{ marginBottom: 48, textAlign: 'center' }}>
          Register An Account
        </Title>

        {/* ── Step 1: Account Information ── */}
        <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
          <PersonalInformationForm form={form} showNameFields={true} showAccountInfo={true} showPIS={false} />

          <Form.Item
            name="password"
            label={<span>Password<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
            rules={passwordRules}
          >
            <Input.Password
              placeholder="Create password"
              onChange={(e) => setPasswordValue(e?.target?.value ?? '')}
            />
          </Form.Item>
          <PasswordStrengthIndicator value={passwordValue} minLength={12} />
          <Form.Item
            name="confirmPassword"
            label={<span>Confirm Password<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
            dependencies={['password']}
            hasFeedback
            rules={signUpConfirmPasswordRules}
            style={{ marginBottom: isMobile ? 20 : 24 }}
          >
            <Input.Password placeholder="Confirm password" />
          </Form.Item>
          <Form.Item
            name="termsAndConditions"
            valuePropName="checked"
            rules={termsRules}
            style={{ marginBottom: isMobile ? 20 : 24 }}
          >
            <Checkbox style={{ fontSize: isMobile ? 13 : undefined }}>
              I have read and agree to the{' '}
              <Link to="/terms" style={{ color: token.colorPrimary, textDecoration: 'underline' }}>Terms of Service</Link>{' '}
              and{' '}
              <Link to="/privacy" style={{ color: token.colorPrimary, textDecoration: 'underline' }}>Privacy Policy</Link>.
            </Checkbox>
          </Form.Item>

          <Form.Item style={{ marginBottom: isMobile ? 16 : 20 }}>
            <Button type="primary" onClick={handleNextStep} block size="default">
              Continue
            </Button>
          </Form.Item>
        </div>

        {/* ── Step 2: PIS (Personal Information Sheet) ── */}
        <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
          <PersonalInformationForm form={form} showNameFields={false} showAccountInfo={false} showPIS={true} />

          <Row gutter={16} style={{ marginTop: 8 }}>
            <Col xs={12}>
              <Button block onClick={handlePreviousStep}>
                Back
              </Button>
            </Col>
            <Col xs={12}>
              <Button type="primary" htmlType="submit" loading={isSubmitting} disabled={isSubmitting} block>
                Create Account
              </Button>
            </Col>
          </Row>

          <div
            style={{
              marginTop: 20,
              marginBottom: 8,
              padding: '12px 14px',
              background: token.colorFillAlter,
              border: `1px solid ${token.colorBorder}`,
              borderRadius: 8,
            }}
          >
            <Text strong style={{ display: 'block', color: token.colorTextHeading, fontSize: 14, marginBottom: 4 }}>
              Why we ask for this information
            </Text>
            <Text style={{ display: 'block', color: token.colorTextSecondary, fontSize: 13, lineHeight: 1.5 }}>
              We use your details only to create and protect your account, verify your identity, and process permit-related requests in this system.
            </Text>
            <Text style={{ display: 'block', color: token.colorTextSecondary, fontSize: 13, lineHeight: 1.5 }}>
              For full details on handling and protection of your data, please see our <Link to="/privacy" style={{ color: token.colorPrimary, textDecoration: 'underline' }}>Privacy Policy</Link>.
            </Text>
          </div>

          {turnstileSiteKey ? (
            <Row gutter={16}>
              <Col xs={24} style={{ marginTop: isMobile ? 20 : 24, marginBottom: 0, display: 'flex', justifyContent: 'center', width: '100%' }}>
                <Form.Item style={{ marginBottom: 0 }}>
                  <TurnstileWidget ref={turnstileRef} siteKey={turnstileSiteKey} token={token} />
                </Form.Item>
              </Col>
            </Row>
          ) : null}

        </div>

        {/* ── Footer links ── */}
        <Divider style={{ margin: '12px 0' }} />
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">Already have an account? </Text>
          <Button
            type="link"
            onClick={() => navigate('/login')}
            style={{ padding: 0, fontWeight: 600, color: token.colorPrimary }}
            className="auth-link-hover"
          >
            Login
          </Button>
        </div>

        {showPrefillButton && (
          <div style={{ textAlign: 'center', marginBottom: 16, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button type="link" onClick={handleFillDemoData} style={{ fontSize: 13, color: token.colorTextTertiary }}>
              Fill demo data
            </Button>
            <Button type="link" onClick={handleFillInvalidData} style={{ fontSize: 13, color: token.colorTextTertiary }}>
              Fill invalid data
            </Button>
          </div>
        )}

      </Form>
    </div>
  )
}
