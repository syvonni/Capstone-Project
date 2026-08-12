import { Form } from 'antd';
import { useState } from 'react';

export function usePasswordChangeTotpVerification({ onSubmit, email } = {}) {
  const [form] = Form.useForm();
  const [isSubmitting, setSubmitting] = useState(false);

  const handleFinish = async (values) => {
    const code = String(values.verificationCode || '')
      .replace(/\D/g, '')
      .slice(0, 6);

    // Validate code format
    if (code.length !== 6) {
      form.setFields([{ name: 'verificationCode', errors: ['Code must be exactly 6 digits'] }]);
      return;
    }

    setSubmitting(true);
    try {
      // Don't verify TOTP here - pass the code to the password change flow
      // The backend will verify the TOTP code when changing the password
      form.resetFields();
      if (typeof onSubmit === 'function') {
        onSubmit({
          email,
          totpVerified: true,
          totpCode: code, // Pass the actual TOTP code
          code: code, // Also pass as 'code' for compatibility
          allowedToReset: true,
        });
      }
    } catch {
      // Error handling is done by the password change flow
    } finally {
      setSubmitting(false);
    }
  };

  return { form, handleFinish, isSubmitting };
}

export default usePasswordChangeTotpVerification;
