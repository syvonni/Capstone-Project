import { useState, useEffect, useCallback } from 'react'
import {
  getPostRequirements,
  getPostRequirement,
  createPostRequirement,
  updatePostRequirement,
} from '@/features/admin/services/postRequirementService'

export function usePostRequirements(filters = {}) {
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [postRequirements, setPostRequirements] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchPostRequirements = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getPostRequirements(filters)
      setPostRequirements(result || [])
    } catch (err) {
      setError(err)
      console.error('Failed to fetch post-requirements:', err)
      setPostRequirements([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPostRequirements()
  }, [fetchPostRequirements])

  const items = postRequirements.sort((a, b) => a.name.localeCompare(b.name))
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
      const result = await getPostRequirements(filters)
      setPostRequirements(result || [])
    } catch (error) {
      console.error('Failed to refresh post-requirements:', error)
    } finally {
      setLoading(false)
    }
  }

  const create = useCallback(async (data) => {
    setLoading(true)
    try {
      const result = await createPostRequirement(data)
      await fetchPostRequirements()
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchPostRequirements])

  const update = useCallback(async (id, data) => {
    setLoading(true)
    try {
      const result = await updatePostRequirement(id, data)
      await fetchPostRequirements()
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchPostRequirements])

  return {
    selectedItemId,
    setSelectedItemId,
    items,
    selectedItem,
    onSelectItem: handleSelectItem,
    onAddNew: handleAddNew,
    refresh,
    data: postRequirements,
    loading,
    error,
    fetchPostRequirements,
    create,
    update,
  }
}

export function usePostRequirement(id) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchPostRequirement = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const result = await getPostRequirement(id)
      setData(result)
    } catch (err) {
      setError(err)
      console.error('Failed to fetch post-requirement:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPostRequirement()
  }, [fetchPostRequirement])

  return {
    data,
    loading,
    error,
    fetchPostRequirement,
  }
}
