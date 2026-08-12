import { useState } from 'react';
import { Typography, Button, InputNumber } from 'antd';
import ResponsiveModal from '@/shared/components/ResponsiveModal';
import { currencyFormatter, currencyParser } from '@/shared/utils/currency.utils';
import { INDUSTRY_CATEGORIES_BY_TAX_CODE } from '@/shared/constants/industryCategories';
import IndustrySelector from './IndustrySelector';
import LOBSelector from './LOBSelector';
import VariableFeeInputs from '@/features/admin/pages/forms/components/VariableFeeInputs';

const { Text } = Typography;

export default function IndustrySelectionModal({
  open,
  onClose,
  lobs,
  selectedIndustryTaxCodes,
  allVariables,
  token,
  onAddIndustry,
  preSelectedIndustry,
}) {
  const title =
    selectedIndustryTaxCodes.length === 0 ? 'Select Business Industry' : 'Add Business Industry';
  const [modalSelectedIndustry, setModalSelectedIndustry] = useState(preSelectedIndustry || null);
  const [modalSelectedLOB, setModalSelectedLOB] = useState(null);
  const [modalCapitalInput, setModalCapitalInput] = useState(0);
  const [variableInputs, setVariableInputs] = useState({});

  const handleClose = () => {
    setModalSelectedIndustry(preSelectedIndustry || null);
    setModalSelectedLOB(null);
    setModalCapitalInput(0);
    setVariableInputs({});
    onClose();
  };

  const handleIndustryChange = (value) => {
    setModalSelectedIndustry(value);
    setModalSelectedLOB(null);
    setModalCapitalInput(0);
    setVariableInputs({});
  };

  const handleLOBChange = (value) => {
    setModalSelectedLOB(value);
    setModalCapitalInput(0);
    setVariableInputs({});
  };

  const handleVariableInputChange = (ruleId, value) => {
    setVariableInputs((prev) => ({
      ...prev,
      [ruleId]: value,
    }));
  };

  const handleAdd = () => {
    if (modalSelectedIndustry && modalSelectedLOB) {
      // Check if industry already exists
      if (selectedIndustryTaxCodes.includes(modalSelectedIndustry)) {
        return; // Prevent duplicate industry
      }
      onAddIndustry({
        industry: modalSelectedIndustry,
        lob: modalSelectedLOB,
        capital: modalCapitalInput,
        variableInputs: { ...variableInputs },
      });
      handleClose();
    }
  };

  const footer = (
    <Button
      type="primary"
      onClick={handleAdd}
      disabled={!modalSelectedIndustry || !modalSelectedLOB}
    >
      Add Industry
    </Button>
  );

  return (
    <ResponsiveModal open={open} onCancel={handleClose} title={title} footer={footer} width={600}>
      <div style={{ marginBottom: 16 }}>
        <Text style={{ display: 'block', marginBottom: 8 }}>
          What is your business industry?
          {selectedIndustryTaxCodes.length === 0
            ? ' You can add more later if you have multiple.'
            : ''}{' '}
          <span style={{ color: token.colorError }}>*</span>
        </Text>
        {!preSelectedIndustry && (
          <IndustrySelector
            lobs={lobs}
            selectedIndustryTaxCodes={selectedIndustryTaxCodes}
            value={modalSelectedIndustry}
            onChange={handleIndustryChange}
            token={token}
          />
        )}
        {preSelectedIndustry && (
          <Text strong>
            {INDUSTRY_CATEGORIES_BY_TAX_CODE[preSelectedIndustry]?.name || preSelectedIndustry}
          </Text>
        )}
      </div>

      {(modalSelectedIndustry || preSelectedIndustry) && (
        <>
          <div style={{ marginBottom: 16 }}>
            <Text style={{ display: 'block', marginBottom: 8 }}>
              What is your line of business? You can add more later if you have multiple.{' '}
              <span style={{ color: token.colorError }}>*</span>
            </Text>
            <LOBSelector
              lobs={lobs}
              modalSelectedIndustry={modalSelectedIndustry || preSelectedIndustry}
              value={modalSelectedLOB}
              onChange={handleLOBChange}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text style={{ display: 'block', marginBottom: 8 }}>
              How much capital did you allocate for this line of business? Include both equity and
              payables. <span style={{ color: token.colorError }}>*</span>
            </Text>
            <InputNumber
              placeholder="₱0.00"
              style={{ width: '100%' }}
              value={modalCapitalInput}
              onChange={setModalCapitalInput}
              formatter={currencyFormatter}
              parser={currencyParser}
              min={1}
            />
          </div>

          {modalSelectedLOB && (
            <VariableFeeInputs
              lobs={lobs}
              modalSelectedLOB={modalSelectedLOB}
              allVariables={allVariables}
              variableInputs={variableInputs}
              onVariableInputChange={handleVariableInputChange}
            />
          )}
        </>
      )}
    </ResponsiveModal>
  );
}
