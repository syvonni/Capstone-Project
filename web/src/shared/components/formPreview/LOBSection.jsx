/**
 * LOB Section Component
 *
 * This component renders the Line of Business selection interface
 * for business permit forms. It provides a prebuilt, non-configurable
 * interface for LOB selection with category and classification options.
 */

import { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react'
import { Typography, Button, theme, Alert, Tooltip } from 'antd'
import { useLOBData } from '@/features/admin/pages/forms/components/hooks/useLOBData'
import { useIndustrySelection } from '@/features/admin/pages/forms/components/hooks/useIndustrySelection'
import { useVariableInputs } from '@/features/admin/pages/forms/components/hooks/useVariableInputs'
import IndustryCard from './IndustryCard'
import IndustrySelectionModal from './IndustrySelectionModal'
import AddLineOfBusinessModal from './AddLineOfBusinessModal'
import { getTaxBrackets } from '@/features/admin/services/feeService'
import {
  businessActivitiesToUiState,
  uiStateToBusinessActivities,
  generateTestBusinessActivity,
} from '@/features/business-owner/utils/lobTestData'

const { Text } = Typography

function LOBSection({ isEditMode = false, onCompleteChange = null, onLobChange = null, form = null, businessActivities = null, renderLineActions = null, reviewMode = false, fieldReviewDecisions = null }, ref) {
  const { token } = theme.useToken()

  // Custom hooks
  const { lobs, allVariables, lobsError } = useLOBData()
  const {
    selectedIndustryTaxCodes,
    setSelectedIndustryTaxCodes,
    industryDetailedLines,
    setIndustryDetailedLines,
    lobAllocatedCapital,
    setLobAllocatedCapital,
    handleRemoveIndustry: removeIndustryFromHook,
    handleRemoveLineOfBusiness,
  } = useIndustrySelection()

  const {
    savedVariableInputs,
    setSavedVariableInputs,
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

  // Sync a new UI state to the form so it is persisted.
  const syncToForm = useCallback((nextState) => {
    if (!form || !lobs.length) return
    const activities = uiStateToBusinessActivities(lobs, nextState)
    form.setFieldsValue({ businessActivities: activities })
    if (onLobChange) {
      onLobChange(activities)
    }
  }, [form, lobs, onLobChange])

  // Replace the entire UI state from a businessActivities array.
  const setBusinessActivities = useCallback((activities) => {
    const uiState = businessActivitiesToUiState(activities)
    setSelectedIndustryTaxCodes(uiState.selectedIndustryTaxCodes)
    setIndustryDetailedLines(uiState.industryDetailedLines)
    setLobAllocatedCapital(uiState.lobAllocatedCapital)
    setSavedVariableInputs(uiState.savedVariableInputs)
  }, [setSelectedIndustryTaxCodes, setIndustryDetailedLines, setLobAllocatedCapital, setSavedVariableInputs])

  // Initialize / restore from the form or from parent props.
  useEffect(() => {
    if (businessActivities != null) {
      setBusinessActivities(businessActivities)
    } else if (form) {
      const fromForm = form.getFieldValue('businessActivities')
      if (Array.isArray(fromForm) && fromForm.length > 0) {
        setBusinessActivities(fromForm)
      }
    }
  }, [businessActivities, form, setBusinessActivities])

  // Report completion status to parent
  useEffect(() => {
    if (onCompleteChange) {
      const isComplete = selectedIndustryTaxCodes.length > 0
      onCompleteChange(isComplete)
    }
  }, [selectedIndustryTaxCodes, industryDetailedLines, onCompleteChange])

  // Imperative API for test data and external control.
  useImperativeHandle(ref, () => ({
    fillTestData: () => {
      const activity = generateTestBusinessActivity(lobs, allVariables)
      if (!activity) return null
      setBusinessActivities([activity])
      if (form) {
        form.setFieldsValue({ businessActivities: [activity] })
      }
      return activity
    },
    getBusinessActivities: () => {
      return uiStateToBusinessActivities(lobs, {
        selectedIndustryTaxCodes,
        industryDetailedLines,
        lobAllocatedCapital,
        savedVariableInputs,
      })
    },
    setBusinessActivities,
  }), [lobs, allVariables, form, setBusinessActivities, selectedIndustryTaxCodes, industryDetailedLines, lobAllocatedCapital, savedVariableInputs])

  const handleAddFromModal = ({ industry, lob, capital, variableInputs }) => {
    // If adding to a pre-selected industry, use that instead of the modal selection
    const targetIndustry = preSelectedIndustry || industry
    const capitalKey = `${targetIndustry}-${lob}`

    // Check if LOB already exists in this industry
    if ((industryDetailedLines[targetIndustry] || []).includes(lob)) {
      return // Prevent duplicate LOB
    }

    const newSelected = selectedIndustryTaxCodes.includes(targetIndustry)
      ? selectedIndustryTaxCodes
      : [...selectedIndustryTaxCodes, targetIndustry]

    const newLines = {
      ...industryDetailedLines,
      [targetIndustry]: [...(industryDetailedLines[targetIndustry] || []), lob]
    }

    const newCapital = {
      ...lobAllocatedCapital,
      [capitalKey]: capital
    }

    const newVariables = {
      ...savedVariableInputs,
      [capitalKey]: { ...variableInputs }
    }

    setSelectedIndustryTaxCodes(newSelected)
    setIndustryDetailedLines(newLines)
    setLobAllocatedCapital(newCapital)
    setSavedVariableInputs(newVariables)

    syncToForm({
      selectedIndustryTaxCodes: newSelected,
      industryDetailedLines: newLines,
      lobAllocatedCapital: newCapital,
      savedVariableInputs: newVariables,
    })
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
      const newCapital = { ...lobAllocatedCapital, [capitalKey]: capital }
      const newVariables = { ...savedVariableInputs, [capitalKey]: { ...variableInputs } }

      setLobAllocatedCapital(newCapital)
      setSavedVariableInputs(newVariables)

      syncToForm({
        selectedIndustryTaxCodes,
        industryDetailedLines,
        lobAllocatedCapital: newCapital,
        savedVariableInputs: newVariables,
      })
      return
    }

    let workingSelected = selectedIndustryTaxCodes
    let workingLines = industryDetailedLines
    let workingCapital = lobAllocatedCapital
    let workingVariables = savedVariableInputs

    // If in edit mode and LOB changed, remove the old LOB first
    if (isEditMode && originalLob && originalLob !== lob) {
      const oldCapitalKey = `${targetIndustry}-${originalLob}`

      if (industryDetailedLines[targetIndustry]) {
        const updatedLines = {
          ...industryDetailedLines,
          [targetIndustry]: industryDetailedLines[targetIndustry].filter(name => name !== originalLob)
        }
        setIndustryDetailedLines(updatedLines)
        workingLines = updatedLines
      }

      const updatedCapital = { ...lobAllocatedCapital }
      delete updatedCapital[oldCapitalKey]
      setLobAllocatedCapital(updatedCapital)
      workingCapital = updatedCapital

      const updatedVariables = { ...savedVariableInputs }
      delete updatedVariables[oldCapitalKey]
      setSavedVariableInputs(updatedVariables)
      workingVariables = updatedVariables
    }

    // Check if LOB already exists in this industry
    if ((workingLines[targetIndustry] || []).includes(lob)) {
      return // Prevent duplicate LOB
    }

    // Add new LOB
    if (!workingSelected.includes(targetIndustry)) {
      const newSelected = [...workingSelected, targetIndustry]
      setSelectedIndustryTaxCodes(newSelected)
      workingSelected = newSelected
    }

    const newLines = {
      ...workingLines,
      [targetIndustry]: [...(workingLines[targetIndustry] || []), lob]
    }
    setIndustryDetailedLines(newLines)
    workingLines = newLines

    const newCapital = { ...workingCapital, [capitalKey]: capital }
    setLobAllocatedCapital(newCapital)
    workingCapital = newCapital

    const newVariables = { ...workingVariables, [capitalKey]: { ...variableInputs } }
    setSavedVariableInputs(newVariables)
    workingVariables = newVariables

    syncToForm({
      selectedIndustryTaxCodes: workingSelected,
      industryDetailedLines: workingLines,
      lobAllocatedCapital: workingCapital,
      savedVariableInputs: workingVariables,
    })
  }

  const handleRemoveIndustryWithSync = (taxCode) => {
    removeIndustryFromHook(taxCode)

    const newSelected = selectedIndustryTaxCodes.filter(code => code !== taxCode)
    const newLines = { ...industryDetailedLines }
    delete newLines[taxCode]

    const newCapital = { ...lobAllocatedCapital }
    Object.keys(newCapital).forEach(key => {
      if (key.startsWith(`${taxCode}-`)) {
        delete newCapital[key]
      }
    })

    const newVariables = { ...savedVariableInputs }
    Object.keys(newVariables).forEach(key => {
      if (key.startsWith(`${taxCode}-`)) {
        delete newVariables[key]
      }
    })

    setSelectedIndustryTaxCodes(newSelected)
    setIndustryDetailedLines(newLines)
    setLobAllocatedCapital(newCapital)
    setSavedVariableInputs(newVariables)

    syncToForm({
      selectedIndustryTaxCodes: newSelected,
      industryDetailedLines: newLines,
      lobAllocatedCapital: newCapital,
      savedVariableInputs: newVariables,
    })
  }

  const handleRemoveLineOfBusinessWithCleanup = (taxCode, lineName) => {
    handleRemoveLineOfBusiness(taxCode, lineName)
    const capitalKey = `${taxCode}-${lineName}`

    const newCapital = { ...lobAllocatedCapital }
    delete newCapital[capitalKey]

    const newVariables = { ...savedVariableInputs }
    delete newVariables[capitalKey]

    const newLines = {
      ...industryDetailedLines,
      [taxCode]: (industryDetailedLines[taxCode] || []).filter(name => name !== lineName)
    }

    // If the industry has no more LOBs, remove the industry as well
    const newSelected = newLines[taxCode]?.length > 0
      ? selectedIndustryTaxCodes
      : selectedIndustryTaxCodes.filter(code => code !== taxCode)
    if (!newLines[taxCode]?.length) {
      delete newLines[taxCode]
    }

    setSelectedIndustryTaxCodes(newSelected)
    setIndustryDetailedLines(newLines)
    setLobAllocatedCapital(newCapital)
    setSavedVariableInputs(newVariables)

    syncToForm({
      selectedIndustryTaxCodes: newSelected,
      industryDetailedLines: newLines,
      lobAllocatedCapital: newCapital,
      savedVariableInputs: newVariables,
    })
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

  // Determine which LOB lines/industries have a 'request_changes' field decision
  // and collect their reasons, so the LOB card can be highlighted and labelled
  // like a regular field that has requested changes.
  const industryReasons = useMemo(() => {
    const reasons = {}
    const activities = Array.isArray(businessActivities) ? businessActivities : []
    activities.forEach((activity, index) => {
      const taxCode = activity?.taxCode
      const lineName = activity?.detailedLine || activity?.detailedLineOfBusiness || activity?.lineOfBusiness
      if (!taxCode || !lineName) return
      const fieldKey = `businessActivities.${index}`
      const decision = fieldReviewDecisions?.[fieldKey]
      if (decision?.status === 'request_changes') {
        if (!reasons[taxCode]) reasons[taxCode] = []
        reasons[taxCode].push({
          lineName,
          reason: decision?.requestOther || decision?.requestCode || '',
        })
      }
    })
    return reasons
  }, [businessActivities, fieldReviewDecisions])

  // Lock lines that have been marked as accepted by the officer. Approved lines
  // should not be editable when the applicant is fixing requested changes.
  const { disabledLineKeys, lockedIndustryTaxCodes } = useMemo(() => {
    const disabledLineKeys = new Set()
    const lockedIndustryTaxCodes = new Set()
    const activities = Array.isArray(businessActivities) ? businessActivities : []

    activities.forEach((activity, index) => {
      const taxCode = activity?.taxCode
      const lineName = activity?.detailedLine || activity?.detailedLineOfBusiness || activity?.lineOfBusiness
      if (!taxCode || !lineName) return

      const fieldKey = `businessActivities.${index}`
      const decision = fieldReviewDecisions?.[fieldKey]
      if (decision?.status === 'accepted') {
        disabledLineKeys.add(`${taxCode}-${lineName}`)
        lockedIndustryTaxCodes.add(taxCode)
      }
    })

    return { disabledLineKeys, lockedIndustryTaxCodes }
  }, [businessActivities, fieldReviewDecisions])

  const requestChangeBorder = {
    border: `1px dashed ${token.colorVolcano}`,
    padding: 12,
    borderRadius: 8,
  }

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        {lobsError ? (
          <Alert
            title="Error"
            description={lobsError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : (
          <div>
            <Text style={{ display: 'block', marginBottom: 8 }}>
              {Object.values(industryDetailedLines).flat().length <= 1 ? 'What is your line of business?' : 'What are your lines of business?'} <span style={{ color: token.colorError }}>*</span>
            </Text>
            {selectedIndustryTaxCodes.map((taxCode, index) => {
              const industryReasonList = industryReasons[taxCode] || []
              const hasIndustryRequestChange = industryReasonList.length > 0
              const requestChangeLabel = industryReasonList
                .map(({ lineName, reason }) => (industryReasonList.length > 1 ? `${lineName}: ${reason}` : reason))
                .join('; ')

              return (
                <div key={taxCode} style={{ marginTop: index > 0 ? 8 : 0 }}>
                  <div style={hasIndustryRequestChange ? requestChangeBorder : {}}>
                    {hasIndustryRequestChange && (
                      <Text
                        style={{
                          fontSize: 12,
                          display: 'block',
                          marginBottom: 4,
                          color: token.colorVolcano,
                        }}
                      >
                        Requested Change: {requestChangeLabel}
                      </Text>
                    )}
                    <IndustryCard
                      taxCode={taxCode}
                      lobs={lobs}
                      industryDetailedLines={industryDetailedLines}
                      lobAllocatedCapital={lobAllocatedCapital}
                      savedVariableInputs={savedVariableInputs}
                      allVariables={allVariables}
                      taxBrackets={taxBrackets}
                      token={token}
                      onRemoveIndustry={handleRemoveIndustryWithSync}
                      onRemoveLineOfBusiness={handleRemoveLineOfBusinessWithCleanup}
                      onAddLineOfBusiness={handleAddLineOfBusiness}
                      onEditLineOfBusiness={handleEditLineOfBusiness}
                      getClassificationForCapital={getClassificationForCapital}
                      isEditMode={isEditMode}
                      reviewMode={reviewMode}
                      disabledLineKeys={disabledLineKeys}
                      lockedIndustryTaxCodes={lockedIndustryTaxCodes}
                    />
                  </div>
                  {renderLineActions && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(industryDetailedLines[taxCode] || []).map((lineName) => (
                        <div key={lineName}>
                          {renderLineActions(taxCode, lineName)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {isEditMode && !reviewMode && disabledLineKeys.size === 0 && (
        <Tooltip title="Line of Business selection is editable in edit mode">
          <Button
            type="dashed"
            onClick={() => setIndustryModalOpen(true)}
            block
          >
            {selectedIndustryTaxCodes.length === 0 ? '+ Select line of business' : '+ Add another industry'}
          </Button>
        </Tooltip>
      )}

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

export default forwardRef(LOBSection)
