import { useState, useEffect } from 'react'
import { Modal, InputNumber, Button, Typography } from 'antd'
import { currencyFormatter, currencyParser } from '@/shared/utils/currency.utils'
import LOBSelector from './LOBSelector'
import VariableFeeInputs from '@/features/admin/pages/forms/components/VariableFeeInputs'

const { Text } = Typography

export default function AddLineOfBusinessModal({
  open,
  onClose,
  lobs,
  industryTaxCode,
  industryDetailedLines,
  allVariables,
  token,
  onAdd,
  initialData,
}) {
  const [selectedLOB, setSelectedLOB] = useState(null)
  const [capitalInput, setCapitalInput] = useState(0)
  const [variableInputs, setVariableInputs] = useState({})
  const isEditMode = Boolean(initialData)

  // Initialize form from initialData when in edit mode
  useEffect(() => {
    if (initialData) {
      setSelectedLOB(initialData.lob)
      setCapitalInput(initialData.capital || 0)
      setVariableInputs(initialData.variableInputs || {})
    } else {
      setSelectedLOB(null)
      setCapitalInput(0)
      setVariableInputs({})
    }
  }, [initialData])

  const handleClose = () => {
    setSelectedLOB(null)
    setCapitalInput(0)
    setVariableInputs({})
    onClose()
  }

  const handleLOBChange = (value) => {
    setSelectedLOB(value)
    setCapitalInput(0)
    setVariableInputs({})
  }

  const handleAdd = () => {
    if (selectedLOB && industryTaxCode) {
      onAdd({
        industry: industryTaxCode,
        lob: selectedLOB,
        capital: capitalInput,
        variableInputs,
        isEditMode,
        originalLob: initialData?.lob,
      })
      handleClose()
    }
  }

  const lob = lobs.find(l => l.name === selectedLOB)
  const variables = (lob?.variables || [])
    .map(v => {
      if (v && typeof v === 'object' && v.question !== undefined) return v
      const id = typeof v === 'object' ? v._id : v
      return allVariables.find(av => av._id === id)
    })
    .filter(Boolean)

  return (
    <Modal
      title={isEditMode ? 'Edit Line of Business' : 'Add Line of Business'}
      open={open}
      onCancel={handleClose}
      footer={
        <Button
          type="primary"
          onClick={handleAdd}
          disabled={!selectedLOB}
        >
          {isEditMode ? 'Update Line of Business' : 'Add Line of Business'}
        </Button>
      }
      width={600}
    >
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <Text style={{ display: 'block', marginBottom: 8 }}>
            What is your line of business? <span style={{ color: token.colorError }}>*</span>
          </Text>
          <LOBSelector
            lobs={lobs}
            modalSelectedIndustry={industryTaxCode}
            value={selectedLOB}
            onChange={handleLOBChange}
            industryDetailedLines={industryDetailedLines}
          />
        </div>

        {selectedLOB && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Text style={{ display: 'block', marginBottom: 8 }}>
                How much capital did you allocate for this line of business? Include both equity and payables. <span style={{ color: token.colorError }}>*</span>
              </Text>
              <InputNumber
                style={{ width: '100%' }}
                placeholder="₱0.00"
                value={capitalInput}
                onChange={setCapitalInput}
                formatter={currencyFormatter}
                parser={currencyParser}
                min={0}
              />
            </div>

            {variables.length > 0 && (
              <VariableFeeInputs
                lobs={lobs}
                modalSelectedLOB={selectedLOB}
                allVariables={allVariables}
                variableInputs={variableInputs}
                onVariableInputChange={(id, value) => {
                  setVariableInputs(prev => ({ ...prev, [id]: value }))
                }}
              />
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
