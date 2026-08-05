import { useState } from 'react'
import { Typography, Button, InputNumber, Modal, Drawer } from 'antd'
import { currencyFormatter, currencyParser } from '@/shared/utils/currency.utils'
import { LINE_OF_BUSINESS_BY_TAX_CODE } from '@/shared/constants/lineOfBusiness'
import IndustrySelector from './IndustrySelector'
import LOBSelector from './LOBSelector'
import VariableFeeInputs from '@/features/admin/pages/forms/components/VariableFeeInputs'

const { Text } = Typography

export default function IndustrySelectionModal({
  open,
  onClose,
  lobs,
  selectedIndustryTaxCodes,
  allVariables,
  token,
  screens,
  onAddIndustry,
  preSelectedIndustry,
}) {
  const [modalSelectedIndustry, setModalSelectedIndustry] = useState(preSelectedIndustry || null)
  const [modalSelectedLOB, setModalSelectedLOB] = useState(null)
  const [modalCapitalInput, setModalCapitalInput] = useState(0)
  const [variableInputs, setVariableInputs] = useState({})

  const handleClose = () => {
    setModalSelectedIndustry(preSelectedIndustry || null)
    setModalSelectedLOB(null)
    setModalCapitalInput(0)
    setVariableInputs({})
    onClose()
  }

  const handleIndustryChange = (value) => {
    setModalSelectedIndustry(value)
    setModalSelectedLOB(null)
    setModalCapitalInput(0)
    setVariableInputs({})
  }

  const handleLOBChange = (value) => {
    setModalSelectedLOB(value)
    setModalCapitalInput(0)
    setVariableInputs({})
  }

  const handleVariableInputChange = (ruleId, value) => {
    setVariableInputs(prev => ({
      ...prev,
      [ruleId]: value
    }))
  }

  const handleAdd = () => {
    if (modalSelectedIndustry && modalSelectedLOB) {
      // Check if industry already exists
      if (selectedIndustryTaxCodes.includes(modalSelectedIndustry)) {
        return // Prevent duplicate industry
      }
      onAddIndustry({
        industry: modalSelectedIndustry,
        lob: modalSelectedLOB,
        capital: modalCapitalInput,
        variableInputs: { ...variableInputs },
      })
      handleClose()
    }
  }

  const content = (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <Text style={{ display: 'block', marginBottom: 8 }}>
          What is your business industry?{selectedIndustryTaxCodes.length === 0 ? ' You can add more later if you have multiple.' : ''}  <span style={{ color: token.colorError }}>*</span>
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
            {LINE_OF_BUSINESS_BY_TAX_CODE[preSelectedIndustry]?.name || preSelectedIndustry}
          </Text>
        )}
      </div>

      {(modalSelectedIndustry || preSelectedIndustry) && (
        <>
          <div style={{ marginBottom: 16 }}>
            <Text style={{ display: 'block', marginBottom: 8 }}>
              What is your line of business? You can add more later if you have multiple. <span style={{ color: token.colorError }}>*</span>
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
              How much capital did you allocate for this line of business? Include both equity and payables. <span style={{ color: token.colorError }}>*</span>
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
      <Button
        type="primary"
        onClick={handleAdd}
        disabled={!modalSelectedIndustry || !modalSelectedLOB}
        block
        style={{ marginTop: 16 }}
      >
        Add Industry
      </Button>
    </div>
  )

  if (screens.xs) {
    return (
      <Drawer
        title={selectedIndustryTaxCodes.length === 0 ? "Select Business Industry" : "Add Business Industry"}
        placement="bottom"
        onClose={handleClose}
        open={open}
        height="100%"
      >
        {content}
      </Drawer>
    )
  }

  return (
    <Modal
      title={selectedIndustryTaxCodes.length === 0 ? "Select Business Industry" : "Add Business Industry"}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={600}
    >
      {content}
    </Modal>
  )
}
