/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { getAddButtonLabel } from '../utils/lob.utils'
import { getLobs } from '@/shared/services/lobService'

export function useLobs() {
  const [selectedType, setSelectedType] = useState('lobs')
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [lobs, setLobs] = useState([])
  const [loading, setLoading] = useState(false)
  const hasLoaded = useRef(false)

  useEffect(() => {
    const loadLobs = async () => {
      setLoading(true)
      try {
        const response = await getLobs()
        setLobs(response || [])
      } catch (error) {
        console.error('Failed to load LOBs:', error)
        setLobs([])
      } finally {
        setLoading(false)
      }
    }

    if (!hasLoaded.current) {
      loadLobs()
      hasLoaded.current = true
    }
  }, [])

  const items = useMemo(() => {
    switch (selectedType) {
      case 'lobs':
        return lobs
      default:
        return []
    }
  }, [selectedType, lobs])

  const selectedItem = items.find((i) => i._id === selectedItemId)

  const addButtonLabel = useMemo(() => {
    return getAddButtonLabel()
  }, [])

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

  const refresh = async () => {
    setLoading(true)
    try {
      const response = await getLobs()
      setLobs(response || [])
      hasLoaded.current = true
    } catch (error) {
      console.error('Failed to refresh LOBs:', error)
    } finally {
      setLoading(false)
    }
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
    refresh,
    lobs,
    loading,
  }
}
