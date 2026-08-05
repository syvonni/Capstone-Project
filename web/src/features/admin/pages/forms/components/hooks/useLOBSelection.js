import { useState } from 'react'

export function useLOBSelection() {
  const [lobAllocatedCapital, setLobAllocatedCapital] = useState({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerIndustryTaxCode, setDrawerIndustryTaxCode] = useState(null)
  const [selectedLineOfBusiness, setSelectedLineOfBusiness] = useState(null)
  const [capitalInput, setCapitalInput] = useState(0)

  const handleAllocatedCapitalChange = (taxCode, lineName, capital) => {
    const capitalKey = `${taxCode}-${lineName}`
    setLobAllocatedCapital(prev => ({
      ...prev,
      [capitalKey]: capital
    }))
  }

  const handleOpenDrawer = (taxCode) => {
    setDrawerIndustryTaxCode(taxCode)
    setSelectedLineOfBusiness(null)
    setCapitalInput(0)
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setSelectedLineOfBusiness(null)
    setCapitalInput(0)
  }

  const handleAddLineOfBusiness = (onDetailedLinesChange, onCapitalChange, onSaveVariables, variableInputs) => {
    if (selectedLineOfBusiness && drawerIndustryTaxCode) {
      onDetailedLinesChange(drawerIndustryTaxCode, selectedLineOfBusiness)
      onCapitalChange(drawerIndustryTaxCode, selectedLineOfBusiness, capitalInput)
      
      const lobKey = `${drawerIndustryTaxCode}-${selectedLineOfBusiness}`
      onSaveVariables(lobKey, variableInputs)
      
      handleCloseDrawer()
    }
  }

  const handleRemoveLineOfBusiness = (taxCode, lineName, onDetailedLinesChange, onSaveVariables) => {
    onDetailedLinesChange(taxCode, lineName)
    const capitalKey = `${taxCode}-${lineName}`
    setLobAllocatedCapital(prev => {
      const updated = { ...prev }
      delete updated[capitalKey]
      return updated
    })
    onSaveVariables(capitalKey, null)
  }

  return {
    lobAllocatedCapital,
    setLobAllocatedCapital,
    drawerOpen,
    setDrawerOpen,
    drawerIndustryTaxCode,
    setDrawerIndustryTaxCode,
    selectedLineOfBusiness,
    setSelectedLineOfBusiness,
    capitalInput,
    setCapitalInput,
    handleAllocatedCapitalChange,
    handleOpenDrawer,
    handleCloseDrawer,
    handleAddLineOfBusiness,
    handleRemoveLineOfBusiness,
  }
}
