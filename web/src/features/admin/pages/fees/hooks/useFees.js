import { useState, useMemo, useEffect } from 'react'
import { getFees, getPenaltyRules, getTaxBrackets, getVariableFeeRules, getFeesByCategory } from '@/features/admin/services/feeService'
import { getLobs } from '@/shared/services/lobService'
import { getAddButtonLabel } from '../utils/fees.utils'

export function useFees() {
  const [selectedType, setSelectedType] = useState('fees')
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [fees, setFees] = useState([])
  const [documentFees, setDocumentFees] = useState([])
  const [appealFees, setAppealFees] = useState([])
  const [penaltyFees, setPenaltyFees] = useState([])
  const [applicationFees, setApplicationFees] = useState([])
  const [penaltyRules, setPenaltyRules] = useState([])
  const [variableFeeRules, setVariableFeeRules] = useState([])
  const [taxBrackets, setTaxBrackets] = useState([])
  const [lobs, setLobs] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [feeList, docFees, appFees, penaltyFeesData, applicationFeesData, penalties, varFeeRules, taxBracketsData, lobsData] = await Promise.all([
        getFees({ category: 'global' }),
        getFees({ category: 'claimable_document' }),
        getFees({ category: 'appeal' }),
        getFees({ category: 'penalty' }),
        getFeesByCategory('application_fee'),
        getPenaltyRules(),
        getVariableFeeRules(),
        getTaxBrackets(),
        getLobs({ isActive: true }),
      ])
      setFees(feeList)
      setDocumentFees(docFees)
      setAppealFees(appFees)
      setPenaltyFees(penaltyFeesData)
      setApplicationFees(applicationFeesData || [])
      setPenaltyRules(penalties)
      setVariableFeeRules(varFeeRules)
      setTaxBrackets(taxBracketsData)
      setLobs(lobsData || [])
    } catch (error) {
      console.error('Failed to load fees data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const items = useMemo(() => {
    switch (selectedType) {
      case 'fees':
        return fees
      case 'variables':
        return variableFeeRules
      case 'tax_brackets': {
        // Return individual tax bracket items
        return taxBrackets.map(tb => {
          const lob = lobs.find(l => String(l._id) === String(tb.lobId))
          const lobName = lob?.name || 'Unknown LOB'

          return {
            ...tb,
            name: `${tb.name} - ${lobName}`,
            lobName: lobName,
          }
        })
      }
      case 'appeal_fees':
        return appealFees
      case 'claimable_documents':
        return documentFees
      case 'penalties':
        return penaltyFees
      case 'application_fees':
        return applicationFees
      default:
        return []
    }
  }, [selectedType, fees, documentFees, appealFees, penaltyFees, applicationFees, variableFeeRules, taxBrackets, lobs])

  const selectedItem = items.find((i) => i._id === selectedItemId)

  const addButtonLabel = useMemo(() => {
    return getAddButtonLabel(selectedType)
  }, [selectedType])

  const handleTypeChange = (value) => {
    setSelectedType(value)
    setSelectedItemId(null)
  }

  const handleSelectItem = (item) => {
    setSelectedItemId(item._id)
  }

  const handleAddNew = () => {
    setSelectedItemId('new')
  }

  return {
    selectedType,
    setSelectedType: handleTypeChange,
    selectedItemId,
    setSelectedItemId,
    items,
    selectedItem,
    addButtonLabel,
    onSelectItem: handleSelectItem,
    onAddNew: handleAddNew,
    loading,
    refresh: loadData,
    fees,
    penaltyRules,
  }
}
