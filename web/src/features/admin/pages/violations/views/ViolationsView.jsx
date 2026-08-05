/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useMemo, useState, useEffect } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'

import ViolationDetailPanel from '../components/ViolationDetailPanel'
import ViolationCard from '../components/ViolationCard'
import AddViolationModal from '../components/modals/AddViolationModal'

import ListPanel from '@/shared/components/ListPanel'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'

import { SEVERITY_LEVELS } from '../constants/violations.constants'
import { filterItemsBySearch, filterItemsBySeverity, filterItemsByStatus } from '../utils/violations.utils'
import { useViolations } from '../hooks/useViolations'
import { useViolationsFilters } from '../hooks/useViolationsFilters'

export default function ViolationsView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    selectedItemId,
    setSelectedItemId,
    items,
    selectedItem,
    refresh,
  } = useViolations()

  // Handle URL query param for direct item selection
  useEffect(() => {
    const itemIdFromUrl = searchParams.get('selectedId')
    if (itemIdFromUrl && items.some(item => item._id === itemIdFromUrl)) {
      setSelectedItemId(itemIdFromUrl)
    }
  }, [searchParams, items, setSelectedItemId])

  // Update URL when selecting an item
  const handleSelectItem = (item) => {
    setSelectedItemId(item._id)
    setSearchParams({ selectedId: item._id })
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

  const [showAddModal, setShowAddModal] = useState(false)

  const filteredItems = useMemo(() => {
    let result = items
    result = filterItemsBySearch(result, searchTerm)
    result = filterItemsBySeverity(result, severityFilter)
    result = filterItemsByStatus(result, statusFilter)
    return result
  }, [items, searchTerm, severityFilter, statusFilter])

  const handleDrawerClose = () => {
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
      isLoading={false}
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
      primaryButton={{
        icon: <PlusOutlined />,
        onClick: () => setShowAddModal(true),
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
  ) : null

  return (
    <>
      <ResponsiveSplitLayout
        listContent={listContent}
        detailContent={detailContent}
        drawerTitle="Violation Detail"
        onDrawerClose={handleDrawerClose}
        drawerOpen={!!selectedItemId}
        mobileDrawerPlacement="right"
      />
      <AddViolationModal
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
