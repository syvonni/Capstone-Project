import { useState, useEffect } from 'react'
import { getDocuments, disableDocument } from '@/features/admin/services/documentService'

export function useDocuments() {
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const data = await getDocuments()
      setDocuments(data)
    } catch (error) {
      console.error('Failed to fetch documents:', error)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => {
    fetchDocuments()
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const items = documents.sort((a, b) => a.name.localeCompare(b.name))
  const selectedItem = items.find((i) => i._id === selectedItemId)

  const handleSelectItem = (item) => {
    setSelectedItemId(item._id)
  }

  const handleAddNew = () => {
    setSelectedItemId('new')
  }

  const handleDelete = async (id) => {
    try {
      await disableDocument(id)
      refresh()
      if (selectedItemId === id) {
        setSelectedItemId(null)
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  return {
    selectedItemId,
    setSelectedItemId,
    items,
    selectedItem,
    onSelectItem: handleSelectItem,
    onAddNew: handleAddNew,
    onDelete: handleDelete,
    refresh,
    documents,
    loading,
  }
}
