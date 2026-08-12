import { useState, useCallback } from 'react';
import { Form, message, App } from 'antd';
import { useStepUpSummary } from '@/shared/hooks/useStepUpSummary';
import useUndoRedo from '@/shared/hooks/useUndoRedo';
import {
  createVariable,
  updateVariable,
  deleteVariable,
} from '@/features/admin/services/variableService';

export function useVariableForm({ variableId, variable, initialValues, onSave, formatters, fieldLabels }) {
  const { modal } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [, setUpdatingStatus] = useState(false);

  const isNew = variableId === 'new' || !variable;

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
    title: 'Confirm Changes',
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
          return 'This will activate the variable and make it available for use in business permits.';
        case 'disabled':
          return 'This will disable the variable. It will no longer be available for new business permits.';
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
              await deleteVariable(variableId, { stepUpToken });
              message.success('Variable disabled successfully');
              if (onSave) onSave();
            } else {
              await updateVariable(variableId, { isActive: true }, { stepUpToken });
              message.success('Variable activated successfully');
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
          const created = await createVariable(values, { stepUpToken });
          message.success('Variable created successfully');
          onSave?.(created);
        } else {
          const updated = await updateVariable(variableId, values, { stepUpToken });
          message.success('Variable updated successfully');
          onSave?.(updated);
        }
        resetChangeTracking(initialValues);
        resetHistory(initialValues);
      } catch (error) {
        console.error('Failed to save variable:', error);
        message.error(error.response?.data?.error?.message || 'Failed to save variable');
      } finally {
        setSaving(false);
      }
    },
    [form, isNew, variableId, initialValues, onSave, resetChangeTracking, resetHistory]
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
      console.error('Failed to confirm variable changes:', error);
      message.error(error?.message || 'Failed to confirm variable changes');
    }
  }, [confirmWithStepUp, saveOperation]);

  const handleSummaryClose = () => closeSummary();

  const changesSummaryModal = (
    <ChangesSummary
      onConfirm={handleConfirm}
      formatters={formatters}
      fieldLabels={fieldLabels}
    />
  );

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
    changesSummaryModal,
  };
}
