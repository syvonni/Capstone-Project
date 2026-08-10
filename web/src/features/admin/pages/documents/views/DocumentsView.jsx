/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useMemo, useEffect, useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'

import ClaimableDocumentDetailPanel from '../components/ClaimableDocumentDetailPanel'
import ClaimableDocumentCard from '../components/ClaimableDocumentCard'
import AddClaimableDocumentModal from '../components/modals/AddClaimableDocumentModal'

import ListPanel from '@/shared/components/ListPanel'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'

import { useDocuments } from '../hooks/useDocuments'
import { useDocumentsFilters } from '../hooks/useDocumentsFilters'

export default function DocumentsView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showAddModal, setShowAddModal] = useState(false)
  const {
    selectedItemId,
    setSelectedItemId,
    items,
    selectedItem,
    refresh,
    onAddNew,
    loading,
  } = useDocuments()

  const {
    searchTerm,
    setSearchTerm,
  } = useDocumentsFilters()

  // Sync selectedItemId with URL search params
  useEffect(() => {
    const selectedIdFromUrl = searchParams.get('selectedId')
    if (selectedIdFromUrl && selectedIdFromUrl !== selectedItemId) {
      setSelectedItemId(selectedIdFromUrl)
    }
  }, [searchParams, selectedItemId, setSelectedItemId])

  const handleAddClick = () => {
    onAddNew()
    setShowAddModal(true)
  }

  // Update URL when selection changes
  const handleSelectItem = (item) => {
    setSelectedItemId(item._id)
    setSearchParams({ selectedId: item._id })
  }

  const filteredItems = useMemo(() => {
    let result = items
    if (searchTerm) {
      result = result.filter(item => 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    // Sort alphabetically by name
    result = [...result].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    return result
  }, [items, searchTerm])

  const handleDrawerClose = () => {
    setSelectedItemId(null)
    setSearchParams({})
  }

  const renderCard = (item, currentSelectedId, onSelect) => {
    return (
      <ClaimableDocumentCard
        item={item}
        selected={currentSelectedId === item._id}
        onClick={() => onSelect(item)}
      />
    )
  }

  const listContent = (
    <ListPanel
      items={filteredItems}
      isLoading={loading}
      selectedId={selectedItemId}
      onSelectItem={handleSelectItem}
      renderCard={renderCard}
      showRefresh={true}
      onRefresh={refresh}
      search={searchTerm}
      onSearchChange={setSearchTerm}
      searchOnEnter={true}
      showStaleInfo={false}
      primaryButton={{
        icon: <PlusOutlined />,
        onClick: handleAddClick,
        label: 'Add Document',
      }}
    />
  )

  const detailContent = selectedItemId ? (
    <ClaimableDocumentDetailPanel
      documentId={selectedItemId}
      document={selectedItemId === 'new' ? null : selectedItem}
      onSave={refresh}
    />
  ) : null

  return (
    <>
      <ResponsiveSplitLayout
        listContent={listContent}
        detailContent={detailContent}
        drawerTitle="Claimable Document Detail"
        onDrawerClose={handleDrawerClose}
        drawerOpen={!!selectedItemId}
        mobileDrawerPlacement="bottom"
      />
      <AddClaimableDocumentModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          refresh()
          setShowAddModal(false)
        }}
      />
    </>
  )
}
