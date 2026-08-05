/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useMemo, useState, useEffect } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'

import LobDetailPanel from '../components/LobDetailPanel'
import LobCard from '../components/LobCard'
import AddLobModal from '../components/modals/AddLobModal'

import ListPanel from '@/shared/components/ListPanel'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'

import { getCategoryOptions } from '@/shared/utils/lobApiUtils'
import { filterItemsBySearch, filterItemsByCategory } from '../utils/lob.utils'
import { useLobs } from '../hooks/useLobs'
import { useLobFilters } from '../hooks/useLobFilters'

export default function AdminLobView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showAddModal, setShowAddModal] = useState(false)
  const {
    selectedType: _selectedType,
    setSelectedType: _setSelectedType,
    selectedItemId,
    setSelectedItemId,
    items,
    selectedItem,
    refresh,
  } = useLobs()

  const {
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
  } = useLobFilters()

  // Sync selectedItemId with URL search params
  useEffect(() => {
    const selectedIdFromUrl = searchParams.get('selectedId')
    if (selectedIdFromUrl && selectedIdFromUrl !== selectedItemId) {
      setSelectedItemId(selectedIdFromUrl)
    }
  }, [searchParams, selectedItemId, setSelectedItemId])

  const handleAddClick = () => {
    setShowAddModal(true)
  }

  // Update URL when selection changes
  const handleSelectItem = (item) => {
    setSelectedItemId(item._id)
    setSearchParams({ selectedId: item._id })
  }

  const filteredItems = useMemo(() => {
    let result = items
    result = filterItemsBySearch(result, searchTerm)
    result = filterItemsByCategory(result, categoryFilter)
    if (statusFilter) {
      result = result.filter(item => item.status === statusFilter)
    }
    // Sort alphabetically by name
    result = [...result].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    return result
  }, [items, searchTerm, categoryFilter, statusFilter])

  const handleDrawerClose = () => {
    setSelectedItemId(null)
  }

  const renderCard = (item, currentSelectedId, onSelect) => {
    return (
      <LobCard
        item={item}
        selected={currentSelectedId === item._id}
        onClick={() => onSelect(item)}
      />
    )
  }

  const categoryOptions = useMemo(() => getCategoryOptions(items), [items])

  const listContent = (
    <ListPanel
      items={filteredItems}
      isLoading={false}
      selectedId={selectedItemId}
      onSelectItem={handleSelectItem}
      renderCard={renderCard}
      filterConfig={[
        {
          key: 'category',
          label: 'Category',
          type: 'select',
          options: categoryOptions,
          value: categoryFilter === '' ? null : categoryFilter,
        },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Active', value: 'active' },
            { label: 'Disabled', value: 'disabled' },
          ],
          value: statusFilter === '' ? null : statusFilter,
        },
      ]}
      onFilterChange={(key, value) => {
        if (key === 'category') setCategoryFilter(value === null ? '' : value)
        if (key === 'status') setStatusFilter(value === null ? '' : value)
      }}
      onClearFilters={() => {
        setCategoryFilter('')
        setStatusFilter('')
      }}
      customFilter={true}
      showRefresh={true}
      onRefresh={refresh}
      search={searchTerm}
      onSearchChange={setSearchTerm}
      searchOnEnter={true}
      showStaleInfo={false}
      primaryButton={{
        icon: <PlusOutlined />,
        onClick: handleAddClick,
        label: 'Add Line of Business',
      }}
    />
  )

  const detailContent = selectedItemId ? (
    <LobDetailPanel
      lobId={selectedItemId}
      lob={selectedItemId === 'new' ? null : selectedItem}
      onSave={refresh}
    />
  ) : null

  return (
    <>
      <ResponsiveSplitLayout
        listContent={listContent}
        detailContent={detailContent}
        drawerTitle="Line of Business Detail"
        onDrawerClose={handleDrawerClose}
        drawerOpen={!!selectedItemId}
        mobileDrawerPlacement="right"
      />
      <AddLobModal
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
