/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useMemo, useState, useEffect } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'

import PostRequirementDetailPanel from '../components/PostRequirementDetailPanel'
import PostRequirementCard from '../components/PostRequirementCard'
import AddPostRequirementModal from '../components/modals/AddPostRequirementModal'

import ListPanel from '@/shared/components/ListPanel'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'

import { filterItemsBySearch, filterItemsByStatus } from '../utils/postRequirements.utils'
import { usePostRequirements } from '../hooks/usePostRequirements'
import { usePostRequirementsFilters } from '../hooks/usePostRequirementsFilters'
import { STATUS_OPTIONS } from '../constants/postRequirements.constants'

export default function PostRequirementsView() {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    selectedItemId,
    setSelectedItemId,
    items,
    selectedItem,
    refresh,
  } = usePostRequirements()

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
    clearFilters,
  } = usePostRequirementsFilters()

  const handleAddClick = () => {
    setAddModalOpen(true)
  }

  const handleAddModalClose = () => {
    setAddModalOpen(false)
  }

  const handleAddModalSuccess = () => {
    refresh()
  }

  const filteredItems = useMemo(() => {
    let result = items
    result = filterItemsBySearch(result, searchTerm)
    result = filterItemsByStatus(result, statusFilter)
    return result
  }, [items, searchTerm, statusFilter])

  const handleDrawerClose = () => {
    setSelectedItemId(null)
    setSearchParams({})
  }

  const handleSelectItem = (item) => {
    setSelectedItemId(item._id)
    setSearchParams({ selectedId: item._id })
  }

  const renderCard = (item, currentSelectedId, onSelect) => {
    return (
      <PostRequirementCard
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
      onClearFilters={clearFilters}
      customFilter={true}
      showRefresh={true}
      onRefresh={refresh}
      search={searchTerm}
      onSearchChange={setSearchTerm}
      showStaleInfo={false}
      searchOnEnter={true}
      primaryButton={{
        label: 'Add Post Requirement',
        icon: <PlusOutlined />,
        onClick: handleAddClick,
      }}
    />
  )

  const detailContent = selectedItemId ? (
    <PostRequirementDetailPanel
      postRequirementId={selectedItemId}
      postRequirement={selectedItemId === 'new' ? null : selectedItem}
      onSave={refresh}
    />
  ) : null

  return (
    <>
      <ResponsiveSplitLayout
        listContent={listContent}
        detailContent={detailContent}
        drawerTitle="Post-Requirement Detail"
        onDrawerClose={handleDrawerClose}
        drawerOpen={!!selectedItemId}
        mobileDrawerPlacement="right"
      />
      <AddPostRequirementModal
        open={addModalOpen}
        onClose={handleAddModalClose}
        onSuccess={handleAddModalSuccess}
      />
    </>
  )
}
