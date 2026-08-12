/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { App, theme, message, Form } from 'antd';
import { HistoryOutlined, SaveOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons';
import DetailHeader from '@/shared/components/DetailHeader';
import AuditHistoryModal from '@/shared/audit/components/AuditHistoryModal';
import AuditEventDetails from '@/shared/audit/components/AuditEventDetails';
import VariableFeeOverview from './VariableFeeOverview';
import VariableFeeConfiguration from './VariableFeeConfiguration';
import { useStepUpSummary } from '@/shared/hooks/useStepUpSummary';
import { useAudit } from '@/shared/audit/hooks/useAudit';
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes';
import {
  createVariableFeeRule,
  updateVariableFeeRule,
  disableVariableFeeRule,
} from '@/features/admin/services/feeService';
import { getVariablesByVariableFeeRuleId } from '@/features/admin/services/variableService';

const CALCULATION_METHOD_OPTIONS = [
  { value: 'floor_area', label: 'Floor Area' },
  { value: 'capitalization', label: 'Capitalization' },
  { value: 'bracketed', label: 'Bracketed' },
  { value: 'classification', label: 'Classification' },
  { value: 'per_unit', label: 'Per Unit' },
  { value: 'yes_no', label: 'Yes/No' },
  { value: 'custom', label: 'Custom' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
];

export default function VariableFeeDetailPanel({ ruleId, rule, onSave, _categoryOptions = [] }) {
  const { token } = theme.useToken();
  const { modal } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCustomMethod, setIsCustomMethod] = useState(false);
  const [previewValue, setPreviewValue] = useState(100);
  const [selectedCalculationMethod, setSelectedCalculationMethod] = useState('floor_area');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [, setUpdatingStatus] = useState(false);
  const [_dependentLobs, _setDependentLobs] = useState([]);
  const [_loadingLobs, _setLoadingLobs] = useState(false);
  const [associatedVariables, setAssociatedVariables] = useState([]);
  const [loadingVariables, setLoadingVariables] = useState(false);

  const loading = saving || loadingVariables;

  const { auditLogs, auditLoading, refresh } = useAudit('variable-fee-rule', ruleId);

  const isNew = ruleId === 'new';

  const initialValues = useMemo(
    () => ({
      name: rule?.name || '',
      notes: rule?.notes || rule?.description || '',
      question: rule?.question || '',
      calculationMethod: rule?.calculationMethod || 'floor_area',
      customCalculationMethod: rule?.customCalculationMethod || '',
      baseRate: rule?.baseRate || 0,
      unit: rule?.unit || '',
      brackets: rule?.brackets || [],
      classifications: rule?.classifications || [],
      isActive: rule?.isActive !== undefined ? rule.isActive : true,
    }),
    [
      rule?.name,
      rule?.notes,
      rule?.description,
      rule?.question,
      rule?.calculationMethod,
      rule?.customCalculationMethod,
      rule?.baseRate,
      rule?.unit,
      rule?.brackets,
      rule?.classifications,
      rule?.isActive,
    ]
  );

  const {
    hasChanges,
    resetChangeTracking,
    handleValuesChange,
    openSummary,
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

  useEffect(() => {
    if (rule || isNew) {
      form.setFieldsValue(initialValues);
      setIsCustomMethod(rule?.calculationMethod === 'custom');
      setSelectedCalculationMethod(rule?.calculationMethod || 'floor_area');
      setSelectedUnit(rule?.unit || '');
      resetChangeTracking(initialValues);
    }
  }, [initialValues, isNew, form, rule, resetChangeTracking]);

  useEffect(() => {
    const fetchAssociatedVariables = async () => {
      if (!ruleId || ruleId === 'new') {
        setAssociatedVariables([]);
        return;
      }

      setLoadingVariables(true);
      try {
        const variables = await getVariablesByVariableFeeRuleId(ruleId);
        setAssociatedVariables(variables);
      } catch (error) {
        console.error('Failed to fetch associated variables:', error);
        setAssociatedVariables([]);
      } finally {
        setLoadingVariables(false);
      }
    };

    fetchAssociatedVariables();
  }, [ruleId]);

  const handleCalculationMethodChange = (value) => {
    setSelectedCalculationMethod(value);
    setIsCustomMethod(value === 'custom');
    // Reset unit when calculation method changes
    form.setFieldValue('unit', '');
    setSelectedUnit('');
    // Initialize with one bracket when switching to bracketed method
    if (value === 'bracketed') {
      form.setFieldValue('brackets', [{ minValue: 0, maxValue: null, fixedAmount: 0 }]);
      form.setFieldValue('classifications', []);
    } else if (value === 'classification') {
      form.setFieldValue('classifications', [{ name: '', fee: 0, description: '' }]);
      form.setFieldValue('brackets', []);
    } else {
      form.setFieldValue('brackets', []);
      form.setFieldValue('classifications', []);
    }
  };

  const handleUnitChange = (value) => {
    setSelectedUnit(value);
  };

  const saveOperation = useCallback(
    async (stepUpToken) => {
      setSaving(true);
      try {
        const values = await form.validateFields();

        const payload = {
          name: values.name,
          notes: values.notes,
          question: values.question,
          calculationMethod: values.calculationMethod,
          customCalculationMethod:
            values.calculationMethod === 'custom' ? values.customCalculationMethod : null,
          baseRate:
            values.calculationMethod === 'bracketed' ||
            values.calculationMethod === 'classification'
              ? null
              : values.baseRate,
          unit: values.unit,
          categories: values.categories,
          brackets: values.calculationMethod === 'bracketed' ? values.brackets : [],
          classifications:
            values.calculationMethod === 'classification' ? values.classifications : [],
          isActive: values.isActive,
        };

        console.log('Saving variable fee rule:', payload);

        if (isNew) {
          await createVariableFeeRule(payload, { stepUpToken });
          message.success('Variable fee rule created successfully');
        } else {
          await updateVariableFeeRule(ruleId, payload, { stepUpToken });
          message.success('Variable fee rule updated successfully');
        }
        resetChangeTracking(initialValues);
        if (onSave) onSave();
      } catch (error) {
        if (error?.message !== 'Step-up cancelled') {
          console.error('Failed to save variable fee rule:', error);
          message.error(error.message || 'Failed to save variable fee rule');
        }
      } finally {
        setSaving(false);
      }
    },
    [form, isNew, ruleId, initialValues, resetChangeTracking, onSave, setSaving]
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
        error?.name === 'NotAllowedError' ||
        error?.name === 'AbortError' ||
        error?.message === 'Step-up cancelled'
      ) {
        return;
      }
      console.error('Failed to confirm variable fee rule changes:', error);
      message.error(error.message || 'Failed to confirm variable fee rule changes');
    }
  }, [confirmWithStepUp, saveOperation]);

  const handleEnterEditMode = () => {
    setIsEditMode(true);
  };

  const handleExitEditMode = () => {
    setIsEditMode(false);
    form.setFieldsValue(initialValues);
    resetChangeTracking(initialValues);
  };

  const handleStatusChange = async (status) => {
    const newStatusLabel = status === 'active' ? 'Active' : 'Disabled';

    const getStatusMessage = (newStatus) => {
      switch (newStatus) {
        case 'active':
          return 'This will activate the variable fee rule and make it available for use in business permits.';
        case 'disabled':
          return 'This will disable the variable fee rule. It will no longer be available for new business permits.';
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
              await disableVariableFeeRule(ruleId, { stepUpToken });
              message.success('Variable fee rule disabled successfully');
              if (onSave) onSave();
            } else {
              await updateVariableFeeRule(ruleId, { isActive: true }, { stepUpToken });
              message.success('Variable fee rule activated successfully');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DetailHeader
        primaryButton={{
          text: 'Save',
          icon: <SaveOutlined />,
          onClick: handleSave,
          loading: saving,
          disabled: !hasChanges,
          type: 'primary',
        }}
        showUndoRedo={true}
        onUndo={() => message.info('Undo not available for constants')}
        onRedo={() => message.info('Redo not available for constants')}
        canUndo={false}
        canRedo={false}
        iconButtons={[
          { icon: <HistoryOutlined />, onClick: () => setHistoryModalOpen(true), title: 'History' },
        ]}
        actionButtons={
          isEditMode
            ? [
                {
                  text: 'Exit Edit Mode',
                  icon: <CloseOutlined />,
                  onClick: handleExitEditMode,
                  type: 'default',
                },
              ]
            : [
                {
                  text: 'Edit',
                  icon: <EditOutlined />,
                  onClick: handleEnterEditMode,
                  type: 'default',
                },
              ]
        }
        instructionSlotId="admin-variable-fee-rules"
        selectFields={
          !isNew
            ? [
                {
                  label: 'Status',
                  value: rule?.isActive ? 'active' : 'disabled',
                  onChange: handleStatusChange,
                  width: 120,
                  options: STATUS_OPTIONS,
                },
              ]
            : []
        }
      />
      <AuditHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        auditLogs={auditLogs}
        loading={auditLoading}
        onRefresh={refresh}
        DetailPanelComponent={AuditEventDetails}
        eventDescriptions={AUDIT_EVENT_INFO.filter((e) => e.event.startsWith('variable_fee_rule_'))}
      />
      {stepUpModal}
      <ChangesSummary onConfirm={handleConfirm} />
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {isEditMode ? (
          <VariableFeeConfiguration
            form={form}
            initialValues={initialValues}
            handleValuesChange={handleValuesChange}
            handleCalculationMethodChange={handleCalculationMethodChange}
            handleUnitChange={handleUnitChange}
            selectedCalculationMethod={selectedCalculationMethod}
            selectedUnit={selectedUnit}
            isCustomMethod={isCustomMethod}
            previewValue={previewValue}
            setPreviewValue={setPreviewValue}
            token={token}
          />
        ) : (
          <VariableFeeOverview
            rule={rule}
            token={token}
            associatedVariables={associatedVariables}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
