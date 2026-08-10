/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useMemo, useState, useEffect } from 'react'
import { Empty, Grid } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'

import InspectionItemDetailPanel from '../components/InspectionItemDetailPanel'
import ChecklistDetailPanel from '../components/ChecklistDetailPanel'
import InspectionItemCard from '../components/InspectionItemCard'
import ChecklistCard from '../components/ChecklistCard'
import AddInspectionItemModal from '../components/modals/AddInspectionItemModal'
import AddChecklistModal from '../components/modals/AddChecklistModal'
import InspectionItemsStatsPanel from '../components/InspectionItemsStatsPanel'
import ChecklistsStatsPanel from '../components/ChecklistsStatsPanel'

import ListPanel from '@/shared/components/ListPanel'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'

import { INSPECTION_TYPES, STATUS_OPTIONS } from '../constants/inspections.constants'
import { filterItemsBySearch, filterItemsByStatus } from '../utils/inspections.utils'
import { useInspections } from '../hooks/useInspections'
import { useInspectionsFilters } from '../hooks/useInspectionsFilters'

export default function InspectionsView() {
  const [selectedType, setSelectedType] = useState('inspection_items')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.lg

  // Sync showStats with breakpoint and selectedId state
  // Stats should be enabled on desktop only when no item is selected
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
  } = useInspections(selectedType)

  // Handle URL query param for direct item selection
  useEffect(() => {
    const itemIdFromUrl = searchParams.get('selectedId')
    const tabFromUrl = searchParams.get('tab')
    
    if (tabFromUrl && (tabFromUrl === 'inspection_items' || tabFromUrl === 'checklists')) {
      setSelectedType(tabFromUrl)
    }
    
    if (itemIdFromUrl) {
      setSelectedItemId(itemIdFromUrl)
    }
  }, [searchParams, setSelectedItemId, setSelectedType])

  // Update URL when selecting an item
  const handleSelectItem = (item) => {
    setSelectedItemId(item._id)
    setSearchParams({ selectedId: item._id })
    setShowStats(false)
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

  const addButtonLabel = selectedType === 'inspection_items' ? 'Add Inspection Item' : 'Add Checklist'

  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
  } = useInspectionsFilters()

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

  const renderCard = (item, currentSelectedId, onSelect) => {
    if (selectedType === 'inspection_items') {
      return (
        <InspectionItemCard
          item={item}
          selected={currentSelectedId === item._id}
          onClick={() => onSelect(item)}
        />
      )
    } else {
      return (
        <ChecklistCard
          item={item}
          selected={currentSelectedId === item._id}
          onClick={() => onSelect(item)}
        />
      )
    }
  }

  const listContent = (
    <ListPanel
      items={filteredItems}
      isLoading={loading}
      selectedId={selectedItemId}
      onSelectItem={handleSelectItem}
      renderCard={renderCard}
      filterConfig={[
        {
          key: 'isActive',
          label: 'Status',
          type: 'select',
          options: STATUS_OPTIONS,
          value: statusFilter,
        },
      ]}
      onFilterChange={(key, value) => {
        if (key === 'isActive') setStatusFilter(value)
      }}
      onClearFilters={() => {
        setStatusFilter(null)
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
        onClick: () => setShowAddModal(true),
        label: addButtonLabel,
      }}
      tabSwitcher={{
        value: selectedType,
        onChange: (value) => {
          setSelectedType(value)
          setSelectedItemId(null)
          setSearchParams({})
          setStatusFilter(null)
        },
        options: INSPECTION_TYPES,
      }}
    />
  )

  const detailContent = selectedItemId ? (
    <>
      {selectedType === 'inspection_items' && (
        <InspectionItemDetailPanel
          key={selectedItemId}
          inspectionItemId={selectedItemId}
          inspectionItem={selectedItemId === 'new' ? null : selectedItem}
          onSave={refresh}
        />
      )}
      {selectedType === 'checklists' && (
        <ChecklistDetailPanel
          key={selectedItemId}
          checklistId={selectedItemId}
          checklist={selectedItemId === 'new' ? null : selectedItem}
          onSave={refresh}
        />
      )}
    </>
  ) : showStats ? (
    <>
      {selectedType === 'inspection_items' && <InspectionItemsStatsPanel />}
      {selectedType === 'checklists' && <ChecklistsStatsPanel />}
    </>
  ) : isMobile ? null : (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Empty description={`Select a ${selectedType === 'inspection_items' ? 'inspection item' : 'checklist'} to view details`} />
    </div>
  )

  return (
    <>
      <ResponsiveSplitLayout
        listContent={listContent}
        detailContent={detailContent}
        drawerTitle={
          showStats
            ? selectedType === 'inspection_items'
              ? 'Inspection Items Overview'
              : 'Checklists Overview'
            : selectedType === 'inspection_items'
              ? 'Inspection Item Detail'
              : 'Checklist Detail'
        }
        onDrawerClose={handleDrawerClose}
        drawerOpen={!!selectedItemId || showStats}
        mobileDrawerPlacement="bottom"
      />
      {selectedType === 'inspection_items' && (
        <AddInspectionItemModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            refresh()
            setShowAddModal(false)
          }}
        />
      )}
      {selectedType === 'checklists' && (
        <AddChecklistModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            refresh()
            setShowAddModal(false)
          }}
        />
      )}
    </>
  )
}
