/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useState, useEffect, useCallback } from 'react'
import { getInspectionItems, getInspectionItem } from '@/features/admin/services/inspectionItemService'
import { getChecklists, getChecklist } from '@/features/admin/services/checklistService'

export function useInspections(selectedType = 'inspection_items') {
  const [items, setItems] = useState([])
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [loading, setLoading] = useState(false)

  const selectedItem = items.find(item => item._id === selectedItemId)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      let data
      if (selectedType === 'inspection_items') {
        data = await getInspectionItems()
      } else if (selectedType === 'checklists') {
        data = await getChecklists()
      }
      setItems((data || []).sort((a, b) => a.name.localeCompare(b.name)))
    } catch (error) {
      console.error(`Failed to fetch ${selectedType}:`, error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [selectedType])

  // Fetch single item when selected via URL but not in items array
  const fetchSelectedItem = useCallback(async (itemId) => {
    if (!itemId) return
    setLoading(true)
    try {
      let item
      if (selectedType === 'inspection_items') {
        item = await getInspectionItem(itemId)
      } else if (selectedType === 'checklists') {
        item = await getChecklist(itemId)
      }
      if (item) {
        setItems(prev => {
          // Only add if not already in the array
          if (prev.some(i => i._id === itemId)) {
            return prev
          }
          return [...prev, item].sort((a, b) => a.name.localeCompare(b.name))
        })
      }
    } catch (error) {
      console.error(`Failed to fetch selected item:`, error)
    } finally {
      setLoading(false)
    }
  }, [selectedType])

  const refresh = () => {
    fetchItems()
  }

  const onSelectItem = (item) => {
    setSelectedItemId(item._id)
  }

  const addButtonLabel = selectedType === 'inspection_items' ? 'Add Inspection Item' : 'Add Checklist'

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Fetch selected item if it's not in the items array
  useEffect(() => {
    if (selectedItemId && !items.some(item => item._id === selectedItemId)) {
      fetchSelectedItem(selectedItemId)
    }
  }, [selectedItemId, items, fetchSelectedItem])

  return {
    items,
    selectedItemId,
    setSelectedItemId,
    selectedItem,
    onSelectItem,
    refresh,
    loading,
    addButtonLabel,
  }
}
