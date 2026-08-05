/**
 * LOB Section Component
 * 
 * This component renders the Line of Business selection interface
 * for business permit forms. It provides a prebuilt, non-configurable
 * interface for LOB selection with category and classification options.
 */

import { useState, useEffect } from 'react'
import { Typography, Button, theme, Grid, Alert, Tooltip } from 'antd'
import { useLOBData } from '@/features/admin/pages/forms/components/hooks/useLOBData'
import { useIndustrySelection } from '@/features/admin/pages/forms/components/hooks/useIndustrySelection'
import { useVariableInputs } from '@/features/admin/pages/forms/components/hooks/useVariableInputs'
import IndustryCard from './IndustryCard'
import IndustrySelectionModal from './IndustrySelectionModal'
import AddLineOfBusinessModal from './AddLineOfBusinessModal'
import { getTaxBrackets } from '@/features/admin/services/feeService'

const { Text } = Typography

export default function LobSection({ isEditMode = false }) {
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  
  // Custom hooks
  const { lobs, allVariables, lobsError } = useLOBData()
  const { 
    selectedIndustryTaxCodes, 
    setSelectedIndustryTaxCodes,
    industryDetailedLines, 
    lobAllocatedCapital,
    setLobAllocatedCapital,
    handleRemoveIndustry,
    handleDetailedLinesChange,
    handleRemoveLineOfBusiness,
  } = useIndustrySelection()
  
  const { 
    savedVariableInputs,
    saveVariableInputs,
    removeVariableInputs,
  } = useVariableInputs()
  
  const [industryModalOpen, setIndustryModalOpen] = useState(false)
  const [preSelectedIndustry, setPreSelectedIndustry] = useState(null)
  const [taxBrackets, setTaxBrackets] = useState([])
  const [addLobModalOpen, setAddLobModalOpen] = useState(false)
  const [addLobIndustryTaxCode, setAddLobIndustryTaxCode] = useState(null)
  const [addLobInitialData, setAddLobInitialData] = useState(null)

  // Fetch tax brackets for determining monthly rates
  useEffect(() => {
    const fetchTaxBrackets = async () => {
      try {
        const brackets = await getTaxBrackets({ isActive: true })
        setTaxBrackets(brackets || [])
      } catch (error) {
        console.error('Failed to fetch tax brackets:', error)
        setTaxBrackets([])
      }
    }
    fetchTaxBrackets()
  }, [])

  const getClassificationForCapital = (_taxCode, _capital) => {
    return null
  }

  const handleAddFromModal = ({ industry, lob, capital, variableInputs }) => {
    // If adding to a pre-selected industry, use that instead of the modal selection
    const targetIndustry = preSelectedIndustry || industry
    const capitalKey = `${targetIndustry}-${lob}`

    // Check if LOB already exists in this industry
    if ((industryDetailedLines[targetIndustry] || []).includes(lob)) {
      return // Prevent duplicate LOB
    }
    
    if (!selectedIndustryTaxCodes.includes(targetIndustry)) {
      setSelectedIndustryTaxCodes(prev => [...prev, targetIndustry])
      handleDetailedLinesChange(targetIndustry, lob)
      setLobAllocatedCapital(prev => ({
        ...prev,
        [capitalKey]: capital
      }))
      saveVariableInputs(capitalKey, variableInputs)
    } else {
      // Industry already exists, just add the LOB
      handleDetailedLinesChange(targetIndustry, lob)
      setLobAllocatedCapital(prev => ({
        ...prev,
        [capitalKey]: capital
      }))
      saveVariableInputs(capitalKey, variableInputs)
    }
  }

  const handleAddLineOfBusiness = (taxCode) => {
    setAddLobIndustryTaxCode(taxCode)
    setAddLobModalOpen(true)
  }

  const handleAddFromLobModal = ({ industry, lob, capital, variableInputs, isEditMode, originalLob }) => {
    const targetIndustry = industry
    const capitalKey = `${targetIndustry}-${lob}`

    // If in edit mode and LOB name hasn't changed, just update capital and variable inputs
    if (isEditMode && originalLob && originalLob === lob) {
      setLobAllocatedCapital(prev => ({
        ...prev,
        [capitalKey]: capital
      }))
      saveVariableInputs(capitalKey, variableInputs)
      return
    }

    // If in edit mode and LOB changed, remove the old LOB first
    if (isEditMode && originalLob && originalLob !== lob) {
      const oldCapitalKey = `${targetIndustry}-${originalLob}`
      handleRemoveLineOfBusiness(targetIndustry, originalLob)
      setLobAllocatedCapital(prev => {
        const updated = { ...prev }
        delete updated[oldCapitalKey]
        return updated
      })
      removeVariableInputs(oldCapitalKey)
    }

    // Check if LOB already exists in this industry
    if ((industryDetailedLines[targetIndustry] || []).includes(lob)) {
      return // Prevent duplicate LOB
    }

    // Add new LOB
    if (!selectedIndustryTaxCodes.includes(targetIndustry)) {
      setSelectedIndustryTaxCodes(prev => [...prev, targetIndustry])
      handleDetailedLinesChange(targetIndustry, lob)
      setLobAllocatedCapital(prev => ({
        ...prev,
        [capitalKey]: capital
      }))
      saveVariableInputs(capitalKey, variableInputs)
    } else {
      handleDetailedLinesChange(targetIndustry, lob)
      setLobAllocatedCapital(prev => ({
        ...prev,
        [capitalKey]: capital
      }))
      saveVariableInputs(capitalKey, variableInputs)
    }
  }

  const handleRemoveLineOfBusinessWithCleanup = (taxCode, lineName) => {
    handleRemoveLineOfBusiness(taxCode, lineName)
    const capitalKey = `${taxCode}-${lineName}`
    setLobAllocatedCapital(prev => {
      const updated = { ...prev }
      delete updated[capitalKey]
      return updated
    })
    removeVariableInputs(capitalKey)
  }

  const handleEditLineOfBusiness = (taxCode, lineName) => {
    const capitalKey = `${taxCode}-${lineName}`
    setAddLobIndustryTaxCode(taxCode)
    setAddLobModalOpen(true)
    // Pass initial data to modal for edit mode
    setAddLobInitialData({
      lob: lineName,
      capital: lobAllocatedCapital[capitalKey] || 0,
      variableInputs: savedVariableInputs[capitalKey] || {}
    })
  }

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        {lobsError ? (
          <Alert
            message="Error"
            description={lobsError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : (
          <>
            <Text style={{ display: 'block', marginBottom: 8 }}>
              {Object.values(industryDetailedLines).flat().length <= 1 ? 'What is your line of business?' : 'What are your lines of business?'} <span style={{ color: token.colorError }}>*</span>
            </Text>
            {selectedIndustryTaxCodes.map((taxCode) => (
              <IndustryCard
                key={taxCode}
                taxCode={taxCode}
                lobs={lobs}
                industryDetailedLines={industryDetailedLines}
                lobAllocatedCapital={lobAllocatedCapital}
                savedVariableInputs={savedVariableInputs}
                allVariables={allVariables}
                taxBrackets={taxBrackets}
                token={token}
                onRemoveIndustry={handleRemoveIndustry}
                onRemoveLineOfBusiness={handleRemoveLineOfBusinessWithCleanup}
                onAddLineOfBusiness={handleAddLineOfBusiness}
                onEditLineOfBusiness={handleEditLineOfBusiness}
                getClassificationForCapital={getClassificationForCapital}
                isEditMode={isEditMode}
              />
            ))}
          </>
        )}
      </div>

      <Tooltip title="Line of Business selection is not editable in edit mode">
        <Button
          type="dashed"
          onClick={() => setIndustryModalOpen(true)}
          block
          disabled={isEditMode}
        >
          {selectedIndustryTaxCodes.length === 0 ? '+ Select line of business' : '+ Add another industry'}
        </Button>
      </Tooltip>

      <IndustrySelectionModal
        open={industryModalOpen}
        onClose={() => {
          setIndustryModalOpen(false)
          setPreSelectedIndustry(null)
        }}
        lobs={lobs}
        selectedIndustryTaxCodes={selectedIndustryTaxCodes}
        allVariables={allVariables}
        token={token}
        screens={screens}
        onAddIndustry={handleAddFromModal}
        preSelectedIndustry={preSelectedIndustry}
      />

      <AddLineOfBusinessModal
        open={addLobModalOpen}
        onClose={() => {
          setAddLobModalOpen(false)
          setAddLobIndustryTaxCode(null)
          setAddLobInitialData(null)
        }}
        lobs={lobs}
        industryTaxCode={addLobIndustryTaxCode}
        industryDetailedLines={industryDetailedLines}
        allVariables={allVariables}
        token={token}
        onAdd={handleAddFromLobModal}
        initialData={addLobInitialData}
      />
    </div>
  )
}
