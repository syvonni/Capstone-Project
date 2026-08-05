import { useState } from 'react'

export function useIndustrySelection() {
  const [selectedIndustryTaxCodes, setSelectedIndustryTaxCodes] = useState([])
  const [industryDetailedLines, setIndustryDetailedLines] = useState({})
  const [lobAllocatedCapital, setLobAllocatedCapital] = useState({})

  const handleRemoveIndustry = (taxCode) => {
    setSelectedIndustryTaxCodes(prev => prev.filter(code => code !== taxCode))
    setIndustryDetailedLines(prev => {
      const updated = { ...prev }
      delete updated[taxCode]
      return updated
    })
    // Remove all capital allocations for this industry
    setLobAllocatedCapital(prev => {
      const updated = { ...prev }
      Object.keys(prev).forEach(key => {
        if (key.startsWith(`${taxCode}-`)) {
          delete updated[key]
        }
      })
      return updated
    })
  }

  const handleDetailedLinesChange = (taxCode, lineName) => {
    setIndustryDetailedLines(prev => ({
      ...prev,
      [taxCode]: [...(prev[taxCode] || []), lineName]
    }))
  }

  const handleRemoveLineOfBusiness = (taxCode, lineName) => {
    setIndustryDetailedLines(prev => ({
      ...prev,
      [taxCode]: prev[taxCode].filter(name => name !== lineName)
    }))
    const capitalKey = `${taxCode}-${lineName}`
    setLobAllocatedCapital(prev => {
      const updated = { ...prev }
      delete updated[capitalKey]
      return updated
    })
  }

  return {
    selectedIndustryTaxCodes,
    setSelectedIndustryTaxCodes,
    industryDetailedLines,
    setIndustryDetailedLines,
    lobAllocatedCapital,
    setLobAllocatedCapital,
    handleRemoveIndustry,
    handleDetailedLinesChange,
    handleRemoveLineOfBusiness,
  }
}
