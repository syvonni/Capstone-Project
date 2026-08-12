/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Form,
  InputNumber,
  Typography,
  theme,
  message,
  Empty,
  Button,
  Input,
  Select,
  Divider,
} from 'antd';
import {
  HistoryOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import DetailHeader from '@/shared/components/DetailHeader';
import AuditHistoryModal from '@/shared/audit/components/AuditHistoryModal';
import AuditEventDetails from '@/shared/audit/components/AuditEventDetails';
import InfoGrid from '@/shared/components/InfoGrid';
import {
  getTaxBrackets,
  createTaxBracket,
  updateTaxBracket,
  deleteTaxBracket,
} from '@/features/admin/services/feeService';
import { getLobs } from '@/shared/services/lobService';
import { useStepUpSummary } from '@/shared/hooks/useStepUpSummary';
import { useAudit } from '@/shared/audit/hooks/useAudit';
import { currencyFormatter, currencyParser } from '@/shared/utils/currency.utils';
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes';

const { Text, Title } = Typography;
const { TextArea } = Input;

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
];

const TAX_BASIS_OPTIONS = [
  { value: 'capitalization', label: 'Capitalization (For New Businesses)' },
  { value: 'gross_sales', label: 'Gross Sales (For Renewals)' },
];

const EXCESS_RATE_TYPE_OPTIONS = [
  { value: 'direct', label: 'Direct Percentage' },
  { value: 'percentage_of_percentage', label: 'Percentage of Percentage' },
];

const PAYMENT_FREQUENCY_OPTIONS = [
  { value: 'annual', label: 'Annual (Full Year)' },
  { value: 'monthly', label: 'Monthly (Pro-rated)' },
];

export default function TaxBracketDetailPanel({ bracketId, lobId, onSave }) {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [localBrackets, setLocalBrackets] = useState([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [canUndo] = useState(false);
  const [canRedo] = useState(false);
  const [initialValues, setInitialValues] = useState({});
  const [sampleValue, setSampleValue] = useState(500000);
  const [taxBasis, setTaxBasis] = useState('capitalization');
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overviewData, setOverviewData] = useState(null);
  const [lob, setLob] = useState(null);
  const [essentialCommodity, setEssentialCommodity] = useState(false);
  const { auditLogs, auditLoading, refresh } = useAudit('tax-bracket', bracketId);

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

  // Fetch LOB details when lobId changes
  useEffect(() => {
    const fetchLob = async () => {
      if (!lobId) {
        setLob(null);
        setEssentialCommodity(false);
        return;
      }
      try {
        const lobData = await getLobs({ _id: lobId, isActive: true });
        const lob = lobData[0] || null;
        setLob(lob);
        setEssentialCommodity(lob?.essentialCommodity || false);
      } catch (error) {
        console.error('Failed to fetch LOB:', error);
      }
    };
    fetchLob();
  }, [lobId]);

  useEffect(() => {
    // Load brackets from API based on LOB and edit mode
    const loadBrackets = async () => {
      setLoadingOverview(true);
      try {
        // In view mode, load overview data only
        if (!isEditMode) {
          setLocalBrackets([]);
          setTaxBasis('capitalization');
          // Load overview data for the overview tab
          if (lobId) {
            const allBrackets = await getTaxBrackets({ lobId });
            const activeBrackets = allBrackets.filter((b) => b.isActive !== false);
            setOverviewData({
              lobId,
              lobName: lob?.name || 'Unknown LOB',
              byBasis: activeBrackets.reduce((acc, bracket) => {
                if (!acc[bracket.taxBasis]) acc[bracket.taxBasis] = [];
                acc[bracket.taxBasis].push(bracket);
                return acc;
              }, {}),
            });
          }
          return;
        }

        // In edit mode, load both capitalization and gross_sales brackets
        const capitalizationBrackets = await getTaxBrackets({ lobId, taxBasis: 'capitalization' });
        const grossSalesBrackets = await getTaxBrackets({ lobId, taxBasis: 'gross_sales' });

        const activeCapitalization = capitalizationBrackets.filter((b) => b.isActive !== false);
        const activeGrossSales = grossSalesBrackets.filter((b) => b.isActive !== false);

        // Combine both tax basis brackets with a marker
        const combinedBrackets = [
          ...activeCapitalization.map((b) => ({ ...b, _taxBasis: 'capitalization' })),
          ...activeGrossSales.map((b) => ({ ...b, _taxBasis: 'gross_sales' })),
        ];

        setLocalBrackets(combinedBrackets);
        setTaxBasis('capitalization');

        const initialValues = {
          lobId,
        };
        combinedBrackets.forEach((bracket) => {
          initialValues[`name-${bracket._id}`] = bracket.name;
          initialValues[`minValue-${bracket._id}`] = bracket.minValue;
          initialValues[`maxValue-${bracket._id}`] = bracket.maxValue;
          initialValues[`fixedAmount-${bracket._id}`] = bracket.fixedAmount;
          initialValues[`excessRate-${bracket._id}`] = bracket.excessRate;
          initialValues[`excessRateType-${bracket._id}`] = bracket.excessRateType;
          initialValues[`paymentFrequency-${bracket._id}`] = bracket.paymentFrequency || 'annual';
          initialValues[`notes-${bracket._id}`] = bracket.notes;
          initialValues[`taxBasis-${bracket._id}`] = bracket._taxBasis;
        });
        setInitialValues(initialValues);
        form.setFieldsValue(initialValues);
        resetChangeTracking(initialValues);
      } catch (error) {
        console.error('Failed to load tax brackets:', error);
        message.error('Failed to load tax brackets');
      } finally {
        setLoadingOverview(false);
      }
    };

    loadBrackets();
  }, [form, lobId, isEditMode, lob, resetChangeTracking]);

  // Calculate tax based on sample value using fixed + excess formula
  const taxCalculation = useMemo(() => {
    if (!sampleValue || localBrackets.length === 0) {
      return { totalTax: 0, breakdown: [] };
    }

    // Find the applicable bracket
    const applicableBracket = localBrackets.find(
      (bracket) =>
        sampleValue >= bracket.minValue &&
        (bracket.maxValue === null || sampleValue <= bracket.maxValue)
    );

    if (!applicableBracket) {
      return { totalTax: 0, breakdown: [] };
    }

    let totalTax = 0;
    const breakdown = [];

    // Fixed amount
    if (applicableBracket.fixedAmount) {
      totalTax += applicableBracket.fixedAmount;
      breakdown.push({
        range: `Fixed cost for ${applicableBracket.name} ${taxBasis === 'capitalization' ? 'Capitalization' : taxBasis === 'gross_sales' ? 'Gross Sales' : 'Value'}`,
        tax: applicableBracket.fixedAmount,
      });
    }

    // Excess calculation
    if (applicableBracket.excessRate && applicableBracket.excessRateType) {
      const excess = sampleValue - applicableBracket.minValue;
      let excessTax = 0;

      if (applicableBracket.excessRateType === 'direct') {
        excessTax = excess * applicableBracket.excessRate;
        breakdown.push({
          range: `Excess cost over ₱${applicableBracket.minValue.toLocaleString()} at ${(applicableBracket.excessRate * 100).toFixed(2)}%`,
          tax: excessTax,
        });
      } else if (applicableBracket.excessRateType === 'percentage_of_percentage') {
        // Percentage of percentage (e.g., 49.5% of 1% = 0.495 * 0.01 = 0.00495)
        excessTax = excess * applicableBracket.excessRate * 0.01;
        breakdown.push({
          range: `Excess cost over ₱${applicableBracket.minValue.toLocaleString()} at ${(applicableBracket.excessRate * 100).toFixed(2)}% of 1%`,
          tax: excessTax,
        });
      }

      totalTax += excessTax;
    }

    // Apply 50% rate if essential commodity
    if (essentialCommodity) {
      totalTax = totalTax * 0.5;
      breakdown.push({
        range: 'Essential Commodity Discount (50%)',
        tax: -totalTax, // Show as discount
      });
    }

    return { totalTax, breakdown };
  }, [sampleValue, localBrackets, essentialCommodity, taxBasis]);

  const handleEnterEditMode = () => {
    setIsEditMode(true);
  };

  const handleExitEditMode = () => {
    setIsEditMode(false);
    form.setFieldsValue(initialValues);
    resetChangeTracking(initialValues);
  };

  // Reset form when brackets data changes (in addition to the existing useEffect)
  useEffect(() => {
    if (localBrackets.length > 0 && !isEditMode) {
      form.setFieldsValue(initialValues);
      resetChangeTracking(initialValues);
    }
  }, [localBrackets, initialValues, form, resetChangeTracking, isEditMode]);

  const saveOperation = useCallback(
    async (stepUpToken) => {
      setSaving(true);
      try {
        const values = form.getFieldsValue();

        console.log('Saving tax brackets with step-up token');

        // Update each bracket
        for (const bracket of localBrackets) {
          const bracketTaxBasis =
            values[`taxBasis-${bracket._id}`] || bracket._taxBasis || taxBasis;
          const payload = {
            taxBasis: bracketTaxBasis,
            name: values[`name-${bracket._id}`] || bracket.name,
            minValue: values[`minValue-${bracket._id}`] || bracket.minValue,
            maxValue: values[`maxValue-${bracket._id}`] || bracket.maxValue,
            fixedAmount: values[`fixedAmount-${bracket._id}`] || bracket.fixedAmount,
            excessRate: values[`excessRate-${bracket._id}`] || bracket.excessRate,
            excessRateType: values[`excessRateType-${bracket._id}`] || bracket.excessRateType,
            paymentFrequency:
              values[`paymentFrequency-${bracket._id}`] || bracket.paymentFrequency || 'annual',
            notes: values[`notes-${bracket._id}`] || bracket.notes,
          };

          if (bracket._id.startsWith('tb-')) {
            // New bracket (client-generated ID)
            await createTaxBracket(payload, { stepUpToken });
          } else {
            // Existing bracket
            await updateTaxBracket(bracket._id, payload, { stepUpToken });
          }
        }

        message.success('Tax brackets saved successfully');
        resetChangeTracking(initialValues);
        refresh();
        onSave?.();
      } catch (error) {
        console.error('Save failed:', error);
        message.error('Failed to save tax brackets');
      } finally {
        setSaving(false);
      }
    },
    [form, localBrackets, taxBasis, initialValues, resetChangeTracking, refresh, onSave, setSaving]
  );

  const handleSave = () => {
    openSummary();
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
      console.error('Failed to confirm tax bracket changes:', error);
      message.error(error.message || 'Failed to confirm tax bracket changes');
    }
  }, [confirmWithStepUp, saveOperation]);

  const handleRemoveBracket = async (bracketId) => {
    try {
      await runWithStepUp(async (stepUpToken) => {
        if (bracketId.startsWith('tb-')) {
          // New bracket (client-generated ID) - just remove from local state
          const updatedBrackets = localBrackets.filter((bracket) => bracket._id !== bracketId);
          setLocalBrackets(updatedBrackets);
          const newInitialValues = { ...initialValues };
          delete newInitialValues[`name-${bracketId}`];
          delete newInitialValues[`minValue-${bracketId}`];
          delete newInitialValues[`maxValue-${bracketId}`];
          delete newInitialValues[`fixedAmount-${bracketId}`];
          delete newInitialValues[`excessRate-${bracketId}`];
          delete newInitialValues[`excessRateType-${bracketId}`];
          delete newInitialValues[`paymentFrequency-${bracketId}`];
          delete newInitialValues[`notes-${bracketId}`];
          delete newInitialValues[`taxBasis-${bracketId}`];
          setInitialValues(newInitialValues);
          form.setFieldsValue(newInitialValues);
          resetChangeTracking(newInitialValues);
        } else {
          // Existing bracket - soft delete via API
          await deleteTaxBracket(bracketId, { stepUpToken });
          const updatedBrackets = localBrackets.filter((bracket) => bracket._id !== bracketId);
          setLocalBrackets(updatedBrackets);
          const newInitialValues = { ...initialValues };
          delete newInitialValues[`name-${bracketId}`];
          delete newInitialValues[`minValue-${bracketId}`];
          delete newInitialValues[`maxValue-${bracketId}`];
          delete newInitialValues[`fixedAmount-${bracketId}`];
          delete newInitialValues[`excessRate-${bracketId}`];
          delete newInitialValues[`excessRateType-${bracketId}`];
          delete newInitialValues[`paymentFrequency-${bracketId}`];
          delete newInitialValues[`notes-${bracketId}`];
          delete newInitialValues[`taxBasis-${bracketId}`];
          setInitialValues(newInitialValues);
          form.setFieldsValue(newInitialValues);
          resetChangeTracking(newInitialValues);
          refresh();
        }
      });
    } catch (error) {
      console.error('Remove failed:', error);
      message.error('Failed to remove tax bracket');
    }
  };

  const handleAddBracket = (taxBasisToAdd) => {
    const newBracket = {
      _id: `tb-${Date.now()}`,
      name: '',
      minValue: 0,
      maxValue: null,
      fixedAmount: null,
      excessRate: null,
      excessRateType: null,
      paymentFrequency: 'annual',
      notes: '',
      isActive: true,
      _taxBasis: taxBasisToAdd,
    };
    setLocalBrackets([...localBrackets, newBracket]);
    const newInitialValues = { ...initialValues };
    newInitialValues[`name-${newBracket._id}`] = '';
    newInitialValues[`minValue-${newBracket._id}`] = 0;
    newInitialValues[`maxValue-${newBracket._id}`] = null;
    newInitialValues[`fixedAmount-${newBracket._id}`] = null;
    newInitialValues[`excessRate-${newBracket._id}`] = null;
    newInitialValues[`excessRateType-${newBracket._id}`] = null;
    newInitialValues[`paymentFrequency-${newBracket._id}`] = 'annual';
    newInitialValues[`notes-${newBracket._id}`] = '';
    newInitialValues[`taxBasis-${newBracket._id}`] = taxBasisToAdd;
    setInitialValues(newInitialValues);
    form.setFieldsValue(newInitialValues);
    resetChangeTracking(newInitialValues);
  };

  const renderTaxDetailsContent = () => {
    if (!overviewData || !lobId) {
      return <Empty description="No Line of Business selected" />;
    }

    const { lobName, byBasis } = overviewData;

    const formatRelativeTime = (dateStr) => {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    // Find the selected bracket for metaInfo from byBasis data
    const allBrackets = [...(byBasis.capitalization || []), ...(byBasis.gross_sales || [])];
    const selectedBracket = allBrackets.find((b) => b._id === bracketId);

    const renderBracketsList = (brackets, basisName) => {
      if (!brackets || brackets.length === 0) return null;

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Text strong style={{ fontSize: 14 }}>
            {basisName}
          </Text>
          {brackets.map((bracket) => (
            <div
              key={bracket._id}
              style={{
                padding: 12,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 8,
                background: token.colorBgContainer,
              }}
            >
              <div style={{ marginBottom: 4 }}>
                <Text strong style={{ fontSize: 14 }}>
                  {bracket.fixedAmount !== null && bracket.fixedAmount !== undefined
                    ? `₱${bracket.fixedAmount.toLocaleString()}`
                    : '₱0'}
                  {bracket.excessRate !== null && bracket.excessRate !== undefined
                    ? ` + ${bracket.excessRateType === 'percentage_of_percentage' ? (bracket.excessRate * 100).toFixed(2) + '% of 1%' : (bracket.excessRate * 100).toFixed(2) + '%'} for ${bracket.name}`
                    : ` for ${bracket.name}`}
                  {essentialCommodity && ' (50% Rate Applied)'}
                </Text>
              </div>
              <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
                ₱{bracket.minValue?.toLocaleString() || '0'} to ₱
                {bracket.maxValue?.toLocaleString() || 'Unlimited'}
              </div>
            </div>
          ))}
        </div>
      );
    };

    const items = [{ label: 'Line of Business', value: lobName }];

    // Add metaInfo if selected bracket is available
    if (selectedBracket) {
      if (selectedBracket.version !== undefined) {
        items.push({ label: 'Version', value: selectedBracket.version });
      }
      if (selectedBracket.createdAt) {
        items.push({ label: 'Created on', value: formatRelativeTime(selectedBracket.createdAt) });
      }
      if (selectedBracket.updatedAt) {
        items.push({
          label: 'Last updated on',
          value: formatRelativeTime(selectedBracket.updatedAt),
        });
      }
    }

    items.push({ type: 'divider' });
    items.push({
      value: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {renderBracketsList(byBasis.capitalization, 'Capitalization (For New Businesses)')}
          {renderBracketsList(byBasis.gross_sales, 'Gross Sales (For Renewals)')}
          {!byBasis.capitalization?.length && !byBasis.gross_sales?.length && (
            <Text type="secondary">No tax brackets configured for this LOB</Text>
          )}
        </div>
      ),
    });

    return (
      <div style={{ padding: '24px 24px 16px 24px' }}>
        <InfoGrid noPadding loading={loadingOverview || saving} items={items} />
      </div>
    );
  };

  const renderFormContent = () => {
    // Show tax details summary in view mode
    if (!isEditMode) {
      return renderTaxDetailsContent();
    }

    // In edit mode, show both capitalization and gross_sales forms stacked
    const capitalizationBrackets = localBrackets.filter((b) => b._taxBasis === 'capitalization');
    const grossSalesBrackets = localBrackets.filter((b) => b._taxBasis === 'gross_sales');

    const renderBracketForm = (brackets, basisLabel, basisValue) => {
      if (brackets.length === 0) {
        return (
          <div style={{ marginBottom: 32 }}>
            <Typography.Title level={5} style={{ marginBottom: 16 }}>
              {basisLabel}
            </Typography.Title>
            <Empty description={`No ${basisLabel.toLowerCase()} configured`} />
            <Button
              type="dashed"
              onClick={() => handleAddBracket(basisValue)}
              icon={<PlusOutlined />}
              block
              style={{ marginTop: 16 }}
            >
              Add {basisLabel} Bracket
            </Button>
          </div>
        );
      }

      return (
        <div style={{ marginBottom: 32 }}>
          <Typography.Title level={5} style={{ marginBottom: 16 }}>
            {basisLabel}
          </Typography.Title>
          {brackets.map((bracket) => (
            <div
              key={bracket._id}
              style={{
                marginBottom: 16,
                padding: 16,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 8,
                background: token.colorBgContainer,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Form.Item
                  name={`name-${bracket._id}`}
                  label={
                    <span>
                      Bracket Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
                    </span>
                  }
                  initialValue={bracket.name}
                  style={{ marginBottom: 0 }}
                  rules={[{ required: true, message: 'Bracket name is required' }]}
                >
                  <Input placeholder="e.g., Industry Scale - Micro" />
                </Form.Item>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Form.Item
                    name={`minValue-${bracket._id}`}
                    label={
                      <span>
                        Min Value (₱)
                        <span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
                      </span>
                    }
                    initialValue={bracket.minValue}
                    style={{ marginBottom: 0, flex: 1 }}
                    rules={[{ required: true, message: 'Min value is required' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="Min value"
                      min={0}
                      precision={2}
                      formatter={currencyFormatter}
                      parser={currencyParser}
                    />
                  </Form.Item>
                  <Form.Item
                    name={`maxValue-${bracket._id}`}
                    label="Max Value (₱)"
                    initialValue={bracket.maxValue}
                    style={{ marginBottom: 0, flex: 1 }}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="Max value (leave empty for unlimited)"
                      min={0}
                      precision={2}
                      formatter={currencyFormatter}
                      parser={currencyParser}
                    />
                  </Form.Item>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Form.Item
                    name={`fixedAmount-${bracket._id}`}
                    label={
                      <span>
                        Fixed Amount (₱)
                        <span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
                      </span>
                    }
                    initialValue={bracket.fixedAmount}
                    style={{ marginBottom: 0, flex: 1 }}
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          const excessRate = getFieldValue(`excessRate-${bracket._id}`);
                          if (!value && !excessRate) {
                            return Promise.reject(
                              new Error('Either fixed amount or excess rate is required')
                            );
                          }
                          return Promise.resolve();
                        },
                      }),
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="Fixed amount (leave empty if none)"
                      min={0}
                      precision={2}
                      formatter={currencyFormatter}
                      parser={currencyParser}
                    />
                  </Form.Item>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Form.Item
                    name={`excessRate-${bracket._id}`}
                    label="Excess Rate (%)"
                    initialValue={bracket.excessRate}
                    style={{ marginBottom: 0, flex: 1 }}
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          const fixedAmount = getFieldValue(`fixedAmount-${bracket._id}`);
                          if (!value && !fixedAmount) {
                            return Promise.reject(
                              new Error('Either fixed amount or excess rate is required')
                            );
                          }
                          return Promise.resolve();
                        },
                      }),
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="Excess rate (leave empty if none)"
                      min={0}
                      max={1}
                      step={0.0001}
                      precision={5}
                      suffix="%"
                    />
                  </Form.Item>
                  <Form.Item
                    name={`excessRateType-${bracket._id}`}
                    label="Excess Rate Type"
                    initialValue={bracket.excessRateType}
                    style={{ marginBottom: 0, flex: 1 }}
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          const excessRate = getFieldValue(`excessRate-${bracket._id}`);
                          if (excessRate && !value) {
                            return Promise.reject(
                              new Error('Excess rate type is required when excess rate is provided')
                            );
                          }
                          return Promise.resolve();
                        },
                      }),
                    ]}
                  >
                    <Select
                      style={{ width: '100%' }}
                      placeholder="Select type"
                      allowClear
                      options={EXCESS_RATE_TYPE_OPTIONS}
                    />
                  </Form.Item>
                </div>
                <Form.Item
                  name={`paymentFrequency-${bracket._id}`}
                  label="Payment Frequency"
                  initialValue={bracket.paymentFrequency || 'annual'}
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Select payment frequency"
                    options={PAYMENT_FREQUENCY_OPTIONS}
                  />
                </Form.Item>
                <Form.Item
                  name={`notes-${bracket._id}`}
                  label="Notes"
                  initialValue={bracket.notes}
                  style={{ marginBottom: 0 }}
                >
                  <Input.TextArea placeholder="Enter notes (optional)" rows={2} />
                </Form.Item>
                <Button
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveBracket(bracket._id)}
                  block
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
          {!brackets.some((b) => b.paymentFrequency === 'monthly') && (
            <Button
              type="dashed"
              onClick={() => handleAddBracket(basisValue)}
              icon={<PlusOutlined />}
              block
            >
              Add {basisLabel} Bracket
            </Button>
          )}
        </div>
      );
    };

    return (
      <div style={{ padding: '24px' }}>
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onValuesChange={handleValuesChange}
        >
          {renderBracketForm(
            capitalizationBrackets,
            'Capitalization (For New Businesses)',
            'capitalization'
          )}
          <Divider />
          {renderBracketForm(grossSalesBrackets, 'Gross Sales (For Renewals)', 'gross_sales')}
          <div style={{ marginTop: 16 }}>
            <Form.Item label="Essential Commodity" style={{ marginBottom: 16 }}>
              <Select
                style={{ width: '100%' }}
                value={essentialCommodity ? 'yes' : 'no'}
                onChange={(value) => setEssentialCommodity(value === 'yes')}
                options={[
                  { label: 'Yes', value: 'yes' },
                  { label: 'No', value: 'no' },
                ]}
              />
            </Form.Item>

            {(capitalizationBrackets.length > 0 || grossSalesBrackets.length > 0) && (
              <>
                <Divider />

                <div>
                  <Form.Item label={`Sample Capitalization (₱)`}>
                    <InputNumber
                      value={sampleValue}
                      onChange={setSampleValue}
                      style={{ width: '100%' }}
                      min={0}
                      precision={2}
                      placeholder="Enter sample value"
                      formatter={currencyFormatter}
                      parser={currencyParser}
                    />
                  </Form.Item>

                  {taxCalculation.breakdown.length > 0 ? (
                    <div style={{ marginTop: 16 }}>
                      <Typography.Text>Capitalization Tax Breakdown:</Typography.Text>
                      <div
                        style={{
                          marginTop: 8,
                          padding: 12,
                          border: `1px solid ${token.colorBorder}`,
                          borderRadius: 8,
                        }}
                      >
                        {taxCalculation.breakdown.map((item, index) => (
                          <div key={index} style={{ marginBottom: 16 }}>
                            <Typography.Text>
                              ₱
                              {item.tax.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </Typography.Text>
                            <div style={{ fontSize: 13, color: token.colorTextSecondary }}>
                              {item.range}
                            </div>
                          </div>
                        ))}
                        <Divider style={{ margin: '16px 0' }} />
                        <div>
                          <Typography.Text>
                            ₱
                            {taxCalculation.totalTax.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Typography.Text>
                          <div style={{ fontSize: 13, color: token.colorTextSecondary }}>
                            Total Taxes
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Typography.Text type="secondary">
                      Add tax brackets to see calculation preview
                    </Typography.Text>
                  )}
                </div>
              </>
            )}
          </div>
        </Form>
      </div>
    );
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
        canUndo={canUndo}
        canRedo={canRedo}
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
        instructionSlotId="admin-tax-brackets"
      />
      <AuditHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        auditLogs={auditLogs}
        loading={auditLoading}
        onRefresh={refresh}
        eventDescriptions={AUDIT_EVENT_INFO.filter((e) => e.event.startsWith('tax_bracket_'))}
        DetailPanelComponent={AuditEventDetails}
      />
      {stepUpModal}
      <ChangesSummary onConfirm={handleConfirm} />
      <div style={{ flex: 1, overflow: 'auto' }}>{renderFormContent()}</div>
    </div>
  );
}
