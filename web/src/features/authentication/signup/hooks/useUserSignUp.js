import { Form } from 'antd';
import { useRef, useState } from 'react';
import { signupStart, signup } from '@/features/authentication/services';
import { useAuthNotification, useNotifier } from '@/shared/notifications.js';

export function useUserSignUp({ onBegin, onSubmit, getCaptchaToken } = {}) {
  const [form] = Form.useForm();
  const [isSubmitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const { success, error } = useNotifier();
  const { notificationSuccess } = useAuthNotification();

  const handleFinish = async (values) => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;

    const payload = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: String(values.email || '').trim(),
      phoneNumber: values.phoneNumber,
      password: values.password,
      termsAccepted: values.termsAndConditions === true,
      role: values.role || 'business_owner',
    };
    if (values.middleName) payload.middleName = values.middleName;
    if (values.suffix) payload.suffix = values.suffix;
    if (typeof getCaptchaToken === 'function') {
      const token = getCaptchaToken();
      if (token) payload.captchaToken = token;
    }

    // Include PIS fields if provided (step 2 of signup)
    if (values.address && typeof values.address === 'object') {
      payload.address = {
        street: values.address.streetAddress ?? values.address.street ?? '',
        barangay: values.address.barangayName ?? values.address.barangay ?? '',
        city: values.address.cityName ?? values.address.city ?? '',
        province: values.address.provinceName ?? values.address.province ?? '',
        zipCode: values.address.postalCode ?? values.address.zipCode ?? '',
      };
    }
    if (values.sex) payload.sex = values.sex;
    if (values.maritalStatus) payload.maritalStatus = values.maritalStatus;
    if (values.dateOfBirth) {
      // Convert dayjs/moment to ISO string for API
      payload.dateOfBirth = values.dateOfBirth.toISOString
        ? values.dateOfBirth.toISOString()
        : values.dateOfBirth;
    }
    if (values.placeOfBirth) payload.placeOfBirth = values.placeOfBirth;
    if (values.nationality) payload.nationality = values.nationality;
    if (values.fatherName) payload.fatherName = values.fatherName;
    if (values.motherName) payload.motherName = values.motherName;
    if (values.distinctiveMark) payload.distinctiveMark = values.distinctiveMark;
    if (values.highestEducationalAttainment)
      payload.highestEducationalAttainment = values.highestEducationalAttainment;

    try {
      setSubmitting(true);
      if (typeof onBegin === 'function') {
        const data = await signupStart(payload);
        success('Verification code sent to your email');
        onBegin({ email: values.email, serverData: data });
      } else {
        const created = await signup(payload);
        notificationSuccess('Account created', 'Your account has been created successfully.');
        form.resetFields();
        if (typeof onSubmit === 'function') onSubmit(created);
      }
    } catch (err) {
      const msg = String(err?.message || '').toLowerCase();

      if (msg.includes('email already exists')) {
        error('This email is already registered. Please log in or use a different email.');
        return;
      }

      if (msg.includes('too many') || msg.includes('wait')) {
        // Extract seconds if present
        const match = msg.match(/(?:in|wait)\s+(\d+)\s*s/i);
        if (match && match[1]) {
          error(`Too many requests. Please wait ${match[1]}s before trying again.`);
        } else {
          error('Too many requests. Please wait a moment.');
        }
      } else {
        console.error('Signup error:', err);
        error(err, 'Failed to create account');
      }
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  return { form, handleFinish, isSubmitting };
}
