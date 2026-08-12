import { useEffect, useState, useCallback, useRef } from 'react';
import { Form } from 'antd';
import dayjs from 'dayjs';
import { useAuthSession } from '@/features/authentication';
import {
  getUserProfile,
  updateUserProfile,
  updateBusinessOwnerProfileName,
  updateBusinessOwnerProfileContact,
  updateBusinessOwnerProfilePis,
} from '@/features/user/services/userService.js';
import { useAuthNotification, useNotifier } from '@/shared/notifications.js';
import { setFormError } from '@/shared/utils/errorMessages.js';

export function useEditUserProfileForm({ onSubmit } = {}) {
  const [form] = Form.useForm();
  const [isLoading, setLoading] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const { currentUser, role, login } = useAuthSession();
  const { notificationSuccess } = useAuthNotification();
  const { error } = useNotifier();

  const initialValuesRef = useRef({});
  const [isDirty, setDirty] = useState(false);
  const [, setOptimisticValues] = useState(null);
  const [profileValues, setProfileValues] = useState({});

  // Function to reset form to initial values
  const resetForm = useCallback(() => {
    form.setFieldsValue(initialValuesRef.current);
    setDirty(false);
  }, [form]);

  const roleSlug = String(role?.slug || role || '').toLowerCase();
  const isBusinessOwner = roleSlug === 'business_owner';
  const isStaffOrAdmin = roleSlug === 'staff' || roleSlug === 'admin';
  const showExtendedFields = isBusinessOwner || isStaffOrAdmin;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUserProfile(currentUser, role);
      const base = {
        firstName: data?.firstName || '',
        lastName: data?.lastName || '',
        phoneNumber: data?.phoneNumber || '09',
      };
      const values = showExtendedFields
        ? {
            ...base,
            middleName: data?.middleName ?? '',
            suffix: data?.suffix ?? '',
            sex: data?.sex ?? undefined,
            dateOfBirth: data?.dateOfBirth ? dayjs(data.dateOfBirth) : undefined,
            email: data?.email ?? '',
            maritalStatus: data?.maritalStatus ?? undefined,
            placeOfBirth: data?.placeOfBirth ?? '',
            nationality: data?.nationality ?? '',
            fatherName: data?.fatherName ?? '',
            motherName: data?.motherName ?? '',
            distinctiveMark: data?.distinctiveMark ?? '',
            highestEducationalAttainment: data?.highestEducationalAttainment ?? undefined,
            address: {
              streetAddress: data?.address?.street ?? '',
              postalCode: data?.address?.zipCode ?? '',
              province: data?.address?.province ?? undefined,
              city: data?.address?.city ?? undefined,
              barangay: data?.address?.barangay ?? undefined,
              provinceName: data?.address?.provinceName ?? '',
              cityName: data?.address?.cityName ?? '',
              barangayName: data?.address?.barangayName ?? '',
            },
          }
        : base;
      form.setFieldsValue(values);
      initialValuesRef.current = values;
      setProfileValues(values);
      setDirty(false);
    } catch (err) {
      console.error('Load user profile error:', err);
      error(err, 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [form, currentUser, role, error, showExtendedFields]);

  useEffect(() => {
    load();
  }, [load]);

  const handleValuesChange = useCallback((_, allValues) => {
    try {
      const dirty = JSON.stringify(allValues) !== JSON.stringify(initialValuesRef.current);
      setDirty(dirty);
    } catch {
      // ignore
    }
  }, []);

  const handleFinish = async (values) => {
    try {
      setSubmitting(true);
      setOptimisticValues(values);
      const previousValues = form.getFieldsValue(true);
      form.setFieldsValue(values);
      initialValuesRef.current = values;
      setDirty(false);

      try {
        let data = null;
        if (showExtendedFields) {
          const namePayload = {
            firstName: values.firstName,
            lastName: values.lastName,
            middleName: values.middleName ?? '',
            suffix: values.suffix ?? '',
            sex: values.sex ?? '',
            dateOfBirth: values.dateOfBirth
              ? values.dateOfBirth.toDate?.() || values.dateOfBirth
              : undefined,
          };
          const contactPayload = { phoneNumber: values.phoneNumber };
          const addr = values.address || {};
          const pisPayload = {
            address: {
              street: addr.streetAddress ?? '',
              zipCode: addr.postalCode ?? '',
              province: addr.province ?? '',
              city: addr.city ?? '',
              barangay: addr.barangay ?? '',
            },
            maritalStatus: values.maritalStatus ?? '',
            placeOfBirth: values.placeOfBirth ?? '',
            nationality: values.nationality ?? '',
            fatherName: values.fatherName ?? '',
            motherName: values.motherName ?? '',
            distinctiveMark: values.distinctiveMark ?? '',
            highestEducationalAttainment: values.highestEducationalAttainment ?? '',
          };
          const nameRes = await updateBusinessOwnerProfileName(namePayload, currentUser, role);
          const contactRes = await updateBusinessOwnerProfileContact(
            contactPayload,
            currentUser,
            role
          );
          const pisRes = await updateBusinessOwnerProfilePis(pisPayload, currentUser, role);
          data = {
            user: { ...currentUser, ...nameRes?.user, ...contactRes?.user, ...pisRes?.user },
          };
        } else {
          data = await updateUserProfile(
            {
              firstName: values.firstName,
              lastName: values.lastName,
              phoneNumber: values.phoneNumber,
            },
            currentUser,
            role
          );
        }
        notificationSuccess('Profile updated', 'Your profile has been saved successfully.');
        initialValuesRef.current = form.getFieldsValue(true);
        setProfileValues(initialValuesRef.current);
        setOptimisticValues(null);

        const nextUser = data?.user || data;
        if (!nextUser?.token && currentUser?.token) nextUser.token = currentUser.token;
        try {
          const remember = !!localStorage.getItem('auth__currentUser');
          login(nextUser, { remember });
        } catch {
          login(nextUser, { remember: false });
        }
        if (typeof onSubmit === 'function') onSubmit(nextUser);
      } catch (err) {
        console.error('Update user profile error:', err);
        form.setFieldsValue(previousValues);
        initialValuesRef.current = previousValues;
        setProfileValues(previousValues);
        setOptimisticValues(null);
        const currentValues = form.getFieldsValue(true);
        setDirty(JSON.stringify(currentValues) !== JSON.stringify(previousValues));
        const { field, message } = setFormError(form, err);
        if (!field) error(err, message || 'Failed to update profile');
      } finally {
        setSubmitting(false);
      }
    } catch (err) {
      console.error('Update user profile error:', err);
      const { field, message } = setFormError(form, err);
      if (!field) error(err, message || 'Failed to update profile');
      setSubmitting(false);
    }
  };

  return {
    form,
    isLoading,
    isSubmitting,
    handleFinish,
    reload: load,
    isDirty,
    handleValuesChange,
    resetForm,
    profileValues,
  };
}
