/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useMemo, useState, useEffect } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import { Grid } from 'antd'

import VariableDetailPanel from '../components/VariableDetailPanel'
import VariableCard from '../components/VariableCard'
import AddVariableModal from '../components/modals/AddVariableModal'
import VariablesStatsPanel from '../components/VariablesStatsPanel'

import ListPanel from '@/shared/components/ListPanel'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'

import { filterItemsBySearch, filterItemsByStatus } from '../utils/variables.utils'
import { useVariables } from '../hooks/useVariables'
import { useVariablesFilters } from '../hooks/useVariablesFilters'
import { STATUS_OPTIONS } from '../constants/variables.constants'

const { useBreakpoint } = Grid

export default function VariablesView() {
  const screens = useBreakpoint()
  const isMobile = !screens.lg
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [showStats, setShowStats] = useState(!isMobile)
  const [searchParams, setSearchParams] = useSearchParams()

  // Sync showStats with breakpoint and selectedId state
  // Stats should be enabled on desktop only when no variable is selected
  useEffect(() => {
    const itemIdFromUrl = searchParams.get('selectedId')
    setShowStats(!isMobile && !itemIdFromUrl)
  }, [isMobile, searchParams])

  const {
    selectedItemId,
    setSelectedItemId,
    items,
    selectedItem,
    refresh,
  } = useVariables()

  // Handle URL query param for direct item selection
  useEffect(() => {
    const itemIdFromUrl = searchParams.get('selectedId')
    if (itemIdFromUrl) {
      setSelectedItemId(itemIdFromUrl)
    }
  }, [searchParams, setSelectedItemId])

  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
  } = useVariablesFilters()

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

  const filteredItems = useMemo(() => {
    let result = items
    result = filterItemsBySearch(result, searchTerm)
    result = filterItemsByStatus(result, statusFilter)
    return result
  }, [items, searchTerm, statusFilter])

  const handleDrawerClose = () => {
    // If closing drawer and no item was selected (viewing stats), disable stats
    if (!selectedItemId) {
      setShowStats(false)
    }
    setSelectedItemId(null)
    setSearchParams({})
  }

  const handleSelectItem = (item) => {
    setSelectedItemId(item._id)
    setSearchParams({ selectedId: item._id })
    setShowStats(false)
  }

  const renderCard = (item, currentSelectedId, onSelect) => {
    return (
      <VariableCard
        item={item}
        selected={currentSelectedId === item._id}
        onClick={() => onSelect(item)}
      />
    )
  }

  const listContent = (
    <ListPanel
      items={filteredItems}
      isLoading={false}
      selectedId={selectedItemId}
      onSelectItem={handleSelectItem}
      renderCard={renderCard}
      filterConfig={[
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: STATUS_OPTIONS,
          value: statusFilter === '' ? null : statusFilter,
        },
      ]}
      onFilterChange={(key, value) => {
        if (key === 'status') setStatusFilter(value === null ? '' : value)
      }}
      onClearFilters={() => setStatusFilter('')}
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
        label: 'Add Variable',
        icon: <PlusOutlined />,
        onClick: handleAddClick,
      }}
    />
  )

  const detailContent = selectedItemId ? (
    <VariableDetailPanel
      variableId={selectedItemId}
      variable={selectedItemId === 'new' ? null : selectedItem}
      onSave={refresh}
    />
  ) : showStats ? (
    <VariablesStatsPanel />
  ) : null

  return (
    <>
      <ResponsiveSplitLayout
        listContent={listContent}
        detailContent={detailContent}
        onDrawerClose={handleDrawerClose}
        drawerOpen={!!selectedItemId || showStats}
        mobileDrawerPlacement="bottom"
      />
      <AddVariableModal
        open={addModalOpen}
        onClose={handleAddModalClose}
        onSuccess={handleAddModalSuccess}
      />
    </>
  )
}
