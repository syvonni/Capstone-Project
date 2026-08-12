/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useState, useCallback } from 'react';
import { Form, message, App } from 'antd';
import { useStepUpSummary } from '@/shared/hooks/useStepUpSummary';
import useUndoRedo from '@/shared/hooks/useUndoRedo';
import {
  createInspectionItem,
  updateInspectionItem,
} from '@/features/admin/services/inspectionItemService';

export function useInspectionItemForm({ inspectionItemId, inspectionItem, initialValues, onSave }) {
  const { modal } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [, setUpdatingStatus] = useState(false);

  const isNew = inspectionItemId === 'new' || !inspectionItem;

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
    title: 'Confirm Inspection Item Changes',
    confirmText: 'Use Passkey To Confirm',
    cancelText: 'Cancel',
  });

  const { undo, redo, pushHistory, resetHistory, canUndo, canRedo } = useUndoRedo();

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

  const handleStatusChange = async (status) => {
    const newStatusLabel = status === 'active' ? 'Active' : 'Disabled';

    const getStatusMessage = (newStatus) => {
      switch (newStatus) {
        case 'active':
          return 'This will activate the inspection item and make it available for use in checklists.';
        case 'disabled':
          return 'This will disable the inspection item. It will no longer be available for new checklists.';
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
              await updateInspectionItem(inspectionItemId, { isActive: false }, { stepUpToken });
              message.success('Inspection item disabled successfully');
              if (onSave) onSave();
            } else {
              await updateInspectionItem(inspectionItemId, { isActive: true }, { stepUpToken });
              message.success('Inspection item activated successfully');
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
          const created = await createInspectionItem(values, { stepUpToken });
          message.success('Inspection item created successfully');
          onSave?.(created);
        } else {
          const updated = await updateInspectionItem(inspectionItemId, values, { stepUpToken });
          message.success('Inspection item updated successfully');
          onSave?.(updated);
        }
        resetChangeTracking(initialValues);
        resetHistory(initialValues);
      } catch (error) {
        console.error('Failed to save inspection item:', error);
        message.error(error.response?.data?.error?.message || 'Failed to save inspection item');
      } finally {
        setSaving(false);
      }
    },
    [form, isNew, inspectionItemId, initialValues, onSave, resetChangeTracking, resetHistory]
  );

  const handleSave = useCallback(() => {
    if (isNew) {
      return runWithStepUp(saveOperation);
    }
    openSummary();
  }, [isNew, runWithStepUp, saveOperation, openSummary]);

  const handleConfirm = useCallback(async () => {
    try {
      await confirmWithStepUp(saveOperation);
    } catch (error) {
      console.error('Step-up verification failed:', error);
      message.error(error?.message || 'Step-up verification failed');
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
