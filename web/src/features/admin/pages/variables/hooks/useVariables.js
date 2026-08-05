import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getVariables,
  getVariable,
  createVariable,
  updateVariable,
  deleteVariable,
} from '@/features/admin/services/variableService'

export function useVariables(filters = {}) {
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [variables, setVariables] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const hasLoaded = useRef(false)

  const fetchVariables = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getVariables(filters)
      setVariables(result || [])
    } catch (err) {
      setError(err)
      console.error('Failed to fetch variables:', err)
      setVariables([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    if (!hasLoaded.current) {
      fetchVariables()
      hasLoaded.current = true
    }
  }, [fetchVariables])

  const items = variables.sort((a, b) => a.name.localeCompare(b.name))
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
      const result = await getVariables(filters)
      setVariables(result || [])
      hasLoaded.current = true
    } catch (error) {
      console.error('Failed to refresh variables:', error)
    } finally {
      setLoading(false)
    }
  }

  const create = useCallback(async (data) => {
    setLoading(true)
    try {
      const result = await createVariable(data)
      await fetchVariables()
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchVariables])

  const update = useCallback(async (id, data) => {
    setLoading(true)
    try {
      const result = await updateVariable(id, data)
      await fetchVariables()
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchVariables])

  const remove = useCallback(async (id) => {
    setLoading(true)
    try {
      const result = await deleteVariable(id)
      await fetchVariables()
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchVariables])

  return {
    selectedItemId,
    setSelectedItemId,
    items,
    selectedItem,
    onSelectItem: handleSelectItem,
    onAddNew: handleAddNew,
    refresh,
    data: variables,
    loading,
    error,
    fetchVariables,
    create,
    update,
    remove,
  }
}

export function useVariable(id) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchVariable = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const result = await getVariable(id)
      setData(result)
    } catch (err) {
      setError(err)
      console.error('Failed to fetch variable:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchVariable()
  }, [fetchVariable])

  return {
    data,
    loading,
    error,
    fetchVariable,
  }
}
