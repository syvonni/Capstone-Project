import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getViolations,
  getViolation,
  createViolation,
  updateViolation,
  disableViolation,
} from '@/features/admin/services/violationService'

export function useViolations(filters = {}) {
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [violations, setViolations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Memoize filters to prevent unnecessary re-renders
  const stableFilters = useMemo(() => filters, [filters.category, filters.severity, filters.isActive])

  const fetchViolations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getViolations(stableFilters)
      setViolations(result || [])
    } catch (err) {
      setError(err)
      console.error('Failed to fetch violations:', err)
      setViolations([])
    } finally {
      setLoading(false)
    }
  }, [stableFilters])

  useEffect(() => {
    fetchViolations()
  }, [fetchViolations])

  const items = violations.sort((a, b) => a.name.localeCompare(b.name))
  const selectedItem = items.find((i) => i._id === selectedItemId)

  const handleSelectItem = (item) => {
    setSelectedItemId(item._id)
  }

  const handleAddNew = () => {
    setSelectedItemId('new')
  }

  const refresh = async () => {
    setLoading(true)
    try {
      const result = await getViolations(stableFilters)
      setViolations(result || [])
    } catch (error) {
      console.error('Failed to refresh violations:', error)
    } finally {
      setLoading(false)
    }
  }

  const create = useCallback(async (data) => {
    setLoading(true)
    try {
      const result = await createViolation(data)
      await fetchViolations()
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchViolations])

  const update = useCallback(async (id, data) => {
    setLoading(true)
    try {
      const result = await updateViolation(id, data)
      await fetchViolations()
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchViolations])

  const disable = useCallback(async (id) => {
    setLoading(true)
    try {
      const result = await disableViolation(id)
      await fetchViolations()
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchViolations])

  return {
    selectedItemId,
    setSelectedItemId,
    items,
    selectedItem,
    onSelectItem: handleSelectItem,
    onAddNew: handleAddNew,
    refresh,
    data: violations,
    loading,
    error,
    fetchViolations,
    create,
    update,
    disable,
  }
}

export function useViolation(id) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchViolation = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const result = await getViolation(id)
      setData(result)
    } catch (err) {
      setError(err)
      console.error('Failed to fetch violation:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchViolation()
  }, [fetchViolation])

  return {
    data,
    loading,
    error,
    fetchViolation,
  }
}
