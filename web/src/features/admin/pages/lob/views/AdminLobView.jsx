/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useMemo, useState, useEffect } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import { Grid } from 'antd'

const { useBreakpoint } = Grid

import LobDetailPanel from '../components/LobDetailPanel'
import LobCard from '../components/LobCard'
import AddLobModal from '../components/modals/AddLobModal'
import LobsStatsPanel from '../components/LobsStatsPanel'

import ListPanel from '@/shared/components/ListPanel'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'

import { getCategoryOptions } from '@/shared/utils/lobApiUtils'
import { filterItemsBySearch, filterItemsByCategory } from '../utils/lob.utils'
import { useLobs } from '../hooks/useLobs'
import { useLobFilters } from '../hooks/useLobFilters'

export default function AdminLobView() {
  const screens = useBreakpoint()
  const isMobile = !screens.lg
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [showStats, setShowStats] = useState(!isMobile)
  const [searchParams, setSearchParams] = useSearchParams()

  // Sync showStats with breakpoint and selectedId state
  // Stats should be enabled on desktop only when no LOB is selected
  useEffect(() => {
    const itemIdFromUrl = searchParams.get('selectedId')
    setShowStats(!isMobile && !itemIdFromUrl)
  }, [isMobile, searchParams])

  const {
    selectedType: _selectedType,
    setSelectedType: _setSelectedType,
    selectedItemId,
    setSelectedItemId,
    items,
    selectedItem,
    refresh,
    loading,
  } = useLobs()

  // Handle URL query param for direct item selection
  useEffect(() => {
    const itemIdFromUrl = searchParams.get('selectedId')
    if (itemIdFromUrl) {
      setSelectedItemId(itemIdFromUrl)
    }
  }, [searchParams, setSelectedItemId])

  // Update URL when selecting an item
  const handleSelectItem = (item) => {
    setSelectedItemId(item._id)
    setSearchParams({ selectedId: item._id })
    setShowStats(false)
  }

  const {
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
  } = useLobFilters()

  const handleAddClick = () => {
    setAddModalOpen(true)
  }

  const handleAddModalClose = () => {
    setAddModalOpen(false)
  }

  const handleAddModalSuccess = () => {
    refresh()
  }

  const handleStatsToggle = () => {
    setShowStats(prev => {
      const newValue = !prev
      if (newValue && selectedItemId) {
        setSelectedItemId(null)
        setSearchParams({})
      }
      return newValue
    })
  }

  const handleDrawerClose = () => {
    // If closing drawer and no item was selected (viewing stats), disable stats
    if (!selectedItemId) {
      setShowStats(false)
    }
    setSelectedItemId(null)
    setSearchParams({})
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
      isLoading={loading}
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
      enableStats={true}
      statsActive={showStats}
      onStatsToggle={handleStatsToggle}
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
  ) : showStats ? (
    <LobsStatsPanel />
  ) : null

  return (
    <>
      <ResponsiveSplitLayout
        drawerTitle={showStats ? 'Line of Business Overview' : 'Line of Business Detail'}
        listContent={listContent}
        detailContent={detailContent}
        onDrawerClose={handleDrawerClose}
        drawerOpen={!!selectedItemId || showStats}
        mobileDrawerPlacement="bottom"
      />
      <AddLobModal
        open={addModalOpen}
        onClose={handleAddModalClose}
        onSuccess={handleAddModalSuccess}
      />
    </>
  )
}
