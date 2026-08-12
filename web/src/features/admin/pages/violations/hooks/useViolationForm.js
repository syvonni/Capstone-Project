import { useState, useCallback } from 'react';
import { Form, message, App } from 'antd';
import { useStepUpSummary } from '@/shared/hooks/useStepUpSummary';
import useUndoRedo from '@/shared/hooks/useUndoRedo';
import { createViolation, updateViolation } from '@/features/admin/services/violationService';

export function useViolationForm({ violationId, violation, initialValues, onSave }) {
  const { modal } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [, setUpdatingStatus] = useState(false);

  const isNew = violationId === 'new' || !violation;

  const {
    hasChanges,
    changedFields,
    resetChangeTracking,
    handleValuesChange,
    openSummary,
    closeSummary,
    confirmWithStepUp,
    runWithStepUp,
    stepUpModal,
    ChangesSummary,
  } = useStepUpSummary({
    initialValues,
    title: 'Confirm Violation Changes',
    confirmText: 'Use Passkey To Confirm',
    cancelText: 'Cancel',
  });

  const { undo, redo, pushHistory, resetHistory, canUndo, canRedo } = useUndoRedo();

  const handleUndo = useCallback(() => {
    const entry = undo();
    if (entry) {
      form.setFieldsValue(entry);
      handleValuesChange(entry, entry);
    }
  }, [form, undo, handleValuesChange]);

  const handleRedo = useCallback(() => {
    const entry = redo();
    if (entry) {
      form.setFieldsValue(entry);
      handleValuesChange(entry, entry);
    }
  }, [form, redo, handleValuesChange]);

  const handleFormValuesChange = useCallback(
    (changedValues, _allValues) => {
      const currentValues = form.getFieldsValue();
      const changed = Object.keys(initialValues).some(
        (key) =>
          key in currentValues &&
          JSON.stringify(currentValues[key]) !== JSON.stringify(initialValues[key])
      );
      if (changed) {
        pushHistory(currentValues);
      }
      handleValuesChange(changedValues, currentValues);
    },
    [form, initialValues, pushHistory, handleValuesChange]
  );

  const handleStatusChange = async (status) => {
    const newStatusLabel = status === 'active' ? 'Active' : 'Disabled';

    const getStatusMessage = (newStatus) => {
      switch (newStatus) {
        case 'active':
          return 'This will activate the violation and make it available for use in inspections.';
        case 'disabled':
          return 'This will disable the violation. It will no longer be available for new inspections.';
        default:
          return `Are you sure you want to change the status to ${newStatusLabel}?`;
      }
    };

    modal.confirm({
      title: 'Change Status',
      content: getStatusMessage(status),
      okText: 'Change',
      cancelText: 'Cancel',
      onOk: async () => {
        setUpdatingStatus(true);
        try {
          await runWithStepUp(async (stepUpToken) => {
            if (status === 'disabled') {
              await updateViolation(violationId, { isActive: false }, { stepUpToken });
              message.success('Violation disabled successfully');
              if (onSave) onSave();
            } else {
              await updateViolation(violationId, { isActive: true }, { stepUpToken });
              message.success('Violation activated successfully');
              if (onSave) onSave();
            }
          });
        } catch (error) {
          if (error?.message !== 'Step-up cancelled') {
            console.error('Failed to update status:', error);
            message.error(error.message || 'Failed to update status');
          }
        } finally {
          setUpdatingStatus(false);
        }
      },
    });
  };

  const saveOperation = useCallback(
    async (stepUpToken) => {
      setSaving(true);
      try {
        const values = form.getFieldsValue();
        if (isNew) {
          const created = await createViolation(values, { stepUpToken });
          message.success('Violation created successfully');
          onSave?.(created);
        } else {
          const updated = await updateViolation(violationId, values, { stepUpToken });
          message.success('Violation updated successfully');
          onSave?.(updated);
        }
        resetChangeTracking(initialValues);
        resetHistory(initialValues);
      } catch (error) {
        console.error('Failed to save violation:', error);
        message.error(error.response?.data?.error?.message || 'Failed to save violation');
      } finally {
        setSaving(false);
      }
    },
    [form, isNew, violationId, initialValues, onSave, resetChangeTracking, resetHistory]
  );

  const handleSave = () => {
    if (isNew) {
      runWithStepUp(saveOperation);
    } else {
      openSummary();
    }
  };

  const handleConfirm = useCallback(async () => {
    try {
      await confirmWithStepUp(saveOperation);
    } catch (error) {
      if (
        error?.message === 'Step-up cancelled' ||
        error?.name === 'NotAllowedError' ||
        error?.name === 'AbortError'
      ) {
        return;
      }
      console.error('Failed to confirm violation save:', error);
      message.error(error.message || 'Failed to save violation');
    }
  }, [confirmWithStepUp, saveOperation]);

  const handleSummaryClose = () => closeSummary();

  return {
    form,
    saving,
    hasChanges,
    changedFields,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    handleFormValuesChange,
    handleStatusChange,
    handleSave,
    handleConfirm,
    handleSummaryClose,
    resetChangeTracking,
    resetHistory,
    stepUpModal,
    ChangesSummary,
  };
}
