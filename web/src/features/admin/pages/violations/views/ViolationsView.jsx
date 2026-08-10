/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useMemo, useState, useEffect } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import { Grid } from 'antd'

import ViolationDetailPanel from '../components/ViolationDetailPanel'
import ViolationCard from '../components/ViolationCard'
import AddViolationModal from '../components/modals/AddViolationModal'
import ViolationsStatsPanel from '../components/ViolationsStatsPanel'

import ListPanel from '@/shared/components/ListPanel'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'

import { SEVERITY_LEVELS } from '../constants/violations.constants'
import { filterItemsBySearch, filterItemsBySeverity, filterItemsByStatus } from '../utils/violations.utils'
import { useViolations } from '../hooks/useViolations'
import { useViolationsFilters } from '../hooks/useViolationsFilters'

const { useBreakpoint } = Grid

export default function ViolationsView() {
  const screens = useBreakpoint()
  const isMobile = !screens.lg
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [showStats, setShowStats] = useState(!isMobile)
  const [searchParams, setSearchParams] = useSearchParams()

  // Sync showStats with breakpoint and selectedId state
  // Stats should be enabled on desktop only when no violation is selected
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
    loading,
  } = useViolations()

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
    severityFilter,
    setSeverityFilter,
    statusFilter,
    setStatusFilter,
    resetFilters,
  } = useViolationsFilters()

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
    result = filterItemsBySeverity(result, severityFilter)
    result = filterItemsByStatus(result, statusFilter)
    return result
  }, [items, searchTerm, severityFilter, statusFilter])

  const handleDrawerClose = () => {
    // If closing drawer and no item was selected (viewing stats), disable stats
    if (!selectedItemId) {
      setShowStats(false)
    }
    setSelectedItemId(null)
    setSearchParams({})
  }

  const renderCard = (item, currentSelectedId, onSelect) => {
    return (
      <ViolationCard
        item={item}
        selected={currentSelectedId === item._id}
        onClick={() => onSelect(item)}
      />
    )
  }

  const severityOptions = useMemo(() =>
    SEVERITY_LEVELS.map(level => ({ value: level.value, label: level.label })), []
  )

  const statusOptions = useMemo(() => [
    { value: true, label: 'Active' },
    { value: false, label: 'Inactive' }
  ], [])

  const listContent = (
    <ListPanel
      items={filteredItems}
      isLoading={loading}
      selectedId={selectedItemId}
      onSelectItem={handleSelectItem}
      renderCard={renderCard}
      filterConfig={[
        {
          key: 'severity',
          label: 'Severity',
          type: 'select',
          options: severityOptions,
          value: severityFilter,
        },
        {
          key: 'isActive',
          label: 'Status',
          type: 'select',
          options: statusOptions,
          value: statusFilter,
        },
      ]}
      onFilterChange={(key, value) => {
        if (key === 'severity') setSeverityFilter(value)
        if (key === 'isActive') setStatusFilter(value)
      }}
      onClearFilters={resetFilters}
      customFilter={true}
      showRefresh={true}
      onRefresh={refresh}
      search={searchTerm}
      onSearchChange={setSearchTerm}
      showStaleInfo={false}
      searchOnEnter={true}
      enableStats={true}
      statsActive={showStats}
      onStatsToggle={handleStatsToggle}
      primaryButton={{
        icon: <PlusOutlined />,
        onClick: handleAddClick,
        label: 'Add Violation',
      }}
    />
  )

  const detailContent = selectedItemId ? (
    <ViolationDetailPanel
      violationId={selectedItemId}
      violation={selectedItemId === 'new' ? null : selectedItem}
      onSave={refresh}
    />
  ) : showStats ? (
    <ViolationsStatsPanel />
  ) : null

  return (
    <>
      <ResponsiveSplitLayout
        drawerTitle={showStats ? 'Violation Overview' : 'Violation Detail'}
        listContent={listContent}
        detailContent={detailContent}
        onDrawerClose={handleDrawerClose}
        drawerOpen={!!selectedItemId || showStats}
        mobileDrawerPlacement="bottom"
      />
      <AddViolationModal
        open={addModalOpen}
        onClose={handleAddModalClose}
        onSuccess={handleAddModalSuccess}
      />
    </>
  )
}
