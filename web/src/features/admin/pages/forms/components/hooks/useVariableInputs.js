import { useState } from 'react'

export function useVariableInputs() {
  const [variableInputs, setVariableInputs] = useState({})
  const [savedVariableInputs, setSavedVariableInputs] = useState({})

  const handleVariableInputChange = (ruleId, value) => {
    setVariableInputs(prev => ({
      ...prev,
      [ruleId]: value
    }))
  }

  const resetVariableInputs = () => {
    setVariableInputs({})
  }

  const saveVariableInputs = (lobKey, inputs) => {
    setSavedVariableInputs(prev => ({
      ...prev,
      [lobKey]: { ...inputs }
    }))
  }

  const loadVariableInputs = (lobKey) => {
    const saved = savedVariableInputs[lobKey]
    if (saved) {
      setVariableInputs(saved)
    } else {
      setVariableInputs({})
    }
  }

  const removeVariableInputs = (lobKey) => {
    setSavedVariableInputs(prev => {
      const updated = { ...prev }
      delete updated[lobKey]
      return updated
    })
  }

  return {
    variableInputs,
    setVariableInputs,
    savedVariableInputs,
    setSavedVariableInputs,
    handleVariableInputChange,
    resetVariableInputs,
    saveVariableInputs,
    loadVariableInputs,
    removeVariableInputs,
  }
}
