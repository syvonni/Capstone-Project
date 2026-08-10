import { useMemo, useState, useEffect } from 'react'
import { Empty, Grid } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'

import FeeDetailPanel from '../components/FeeDetailPanel'
import FeeCard from '../components/FeeCard'
import TaxBracketDetailPanel from '../components/TaxBracketDetailPanel'
import TaxBracketCard from '../components/TaxBracketCard'
import VariableFeeDetailPanel from '../components/VariableFeeDetailPanel'
import VariableFeeCard from '../components/VariableFeeCard'
import AddGlobalFeeModal from '../components/modals/AddGlobalFeeModal'
import AddAppealFeeModal from '../components/modals/AddAppealFeeModal'

import { FEE_TYPES, STATUS_OPTIONS } from '../constants/fees.constants'

import ListPanel from '@/shared/components/ListPanel'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'

import { filterItemsBySearch, filterItemsByStatus } from '../utils/fees.utils'
import { useFees } from '../hooks/useFees'
import { useFeesFilters } from '../hooks/useFeesFilters'

export default function AdminFeesView() {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.lg

  const {
    selectedType,
    setSelectedType,
    selectedItemId,
    setSelectedItemId,
    items,
    selectedItem,
    addButtonLabel,
    refresh,
    loading,
  } = useFees()

  // Handle URL query param for direct item selection
  useEffect(() => {
    const itemIdFromUrl = searchParams.get('selectedId')
    const tabFromUrl = searchParams.get('tab')
    
    if (tabFromUrl) {
      setSelectedType(tabFromUrl)
    }
    
    if (itemIdFromUrl && items.some(item => item._id === itemIdFromUrl)) {
      setSelectedItemId(itemIdFromUrl)
    }
  }, [searchParams, items, setSelectedItemId, setSelectedType])

  // Update URL when selecting an item
  const handleSelectItem = (item) => {
    setSelectedItemId(item._id)
    setSearchParams({ selectedId: item._id })
  }

  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
  } = useFeesFilters()

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
    // Sort alphabetically by name
    result = [...result].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    return result
  }, [items, searchTerm, statusFilter])

  // Get unique categories from fees for filter options
  const categoryOptions = useMemo(() => {
    return []
  }, [])

  const handleDrawerClose = () => {
    setSelectedItemId(null)
    setSearchParams({})
  }

  const renderCard = (item, currentSelectedId, onSelect) => {
    // Handle variables cards
    if (selectedType === 'variables') {
      return (
        <VariableFeeCard
          item={item}
          selected={currentSelectedId === item._id}
          onClick={() => onSelect(item)}
        />
      )
    }

    // Handle tax_brackets (single item card)
    if (selectedType === 'tax_brackets') {
      return (
        <TaxBracketCard
          item={item}
          selected={currentSelectedId === item._id}
          onClick={() => onSelect(item)}
        />
      )
    }

    // Handle claimable_documents
    if (selectedType === 'claimable_documents') {
      return (
        <FeeCard
          item={item}
          selected={currentSelectedId === item._id}
          onClick={() => onSelect(item)}
        />
      )
    }

    // Handle application_fees
    if (selectedType === 'application_fees') {
      return (
        <FeeCard
          item={item}
          selected={currentSelectedId === item._id}
          onClick={() => onSelect(item)}
        />
      )
    }

    // Handle other card types (fees, appeal_fees, penalties)
    return (
      <FeeCard
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
      customFilter={true}
      search={searchTerm}
      onSearchChange={setSearchTerm}
      searchOnEnter={true}
      showStaleInfo={false}
      filterConfig={[
        ...(selectedType === 'fees' ? [
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: STATUS_OPTIONS,
            value: statusFilter,
          },
          ...(categoryOptions.length > 0 ? [{
            key: 'category',
            label: 'Category',
            type: 'select',
            options: categoryOptions,
            value: categoryFilter === '' ? null : categoryFilter,
          }] : []),
        ] : []),
        ...(selectedType === 'claimable_documents' ? [
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: STATUS_OPTIONS,
            value: statusFilter,
          },
        ] : []),
        ...(selectedType === 'variables' ? [
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: STATUS_OPTIONS,
            value: statusFilter,
          },
        ] : []),
        ...(selectedType === 'tax_brackets' ? [
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: STATUS_OPTIONS,
            value: statusFilter,
          },
        ] : []),
        ...(selectedType === 'penalties' ? [
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: STATUS_OPTIONS,
            value: statusFilter,
          },
        ] : []),
        ...(selectedType === 'application_fees' ? [
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: STATUS_OPTIONS,
            value: statusFilter,
          },
        ] : []),
      ]}
      onFilterChange={(key, value) => {
        if (key === 'status') setStatusFilter(value === null ? '' : value)
        if (key === 'category') setCategoryFilter(value === null ? '' : value)
      }}
      onClearFilters={() => {
        setStatusFilter('')
        setCategoryFilter('')
      }}
      primaryButton={selectedType !== 'tax_brackets' && selectedType !== 'claimable_documents' && selectedType !== 'variables' && selectedType !== 'penalties' && selectedType !== 'application_fees' ? {
        label: addButtonLabel,
        icon: <PlusOutlined />,
        onClick: handleAddClick,
      } : undefined}
      tabSwitcher={{
        value: selectedType,
        onChange: (value) => {
          setSelectedType(value)
          setSelectedItemId(null)
          setSearchParams({})
          setStatusFilter('active')
          setCategoryFilter('')
        },
        options: FEE_TYPES,
      }}
      showRefresh={true}
      onRefresh={refresh}
    />
  )

  const detailContent = selectedItemId ? (
    <>
      {selectedType === 'fees' && (
        <FeeDetailPanel
          key={selectedItemId}
          feeId={selectedItemId}
          fee={selectedItemId === 'new' ? null : selectedItem}
          onSave={refresh}
        />
      )}
      {selectedType === 'variables' && (
        <VariableFeeDetailPanel
          key={selectedItemId}
          ruleId={selectedItemId}
          rule={selectedItemId === 'new' ? null : selectedItem}
          onSave={refresh}
        />
      )}
      {selectedType === 'tax_brackets' && (
        <TaxBracketDetailPanel
          key={selectedItemId}
          bracketId={selectedItemId}
          lobId={selectedItemId === 'new' ? null : selectedItem?.lobId}
          onSave={refresh}
        />
      )}
      {selectedType === 'appeal_fees' && (
        <FeeDetailPanel
          key={selectedItemId}
          feeId={selectedItemId}
          fee={selectedItemId === 'new' ? null : selectedItem}
          onSave={refresh}
        />
      )}
      {selectedType === 'claimable_documents' && (
        <FeeDetailPanel
          key={selectedItemId}
          feeId={selectedItemId}
          fee={selectedItemId === 'new' ? null : selectedItem}
          onSave={refresh}
          hideStatusToggle={true}
          allowCreation={false}
        />
      )}
      {selectedType === 'penalties' && (
        <FeeDetailPanel
          key={selectedItemId}
          feeId={selectedItemId}
          fee={selectedItemId === 'new' ? null : selectedItem}
          onSave={refresh}
        />
      )}
      {selectedType === 'application_fees' && (
        <FeeDetailPanel
          key={selectedItemId}
          feeId={selectedItemId}
          fee={selectedItemId === 'new' ? null : selectedItem}
          onSave={refresh}
          hideStatusToggle={true}
          allowCreation={false}
        />
      )}
    </>
  ) : isMobile ? null : (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Empty description="Select an item to view details" />
    </div>
  )

  return (
    <>
      <ResponsiveSplitLayout
        listContent={listContent}
        detailContent={detailContent}
        drawerTitle={
          selectedItemId === 'new'
            ? 'Add New Fee'
            : selectedType === 'fees'
              ? 'Fee Detail'
              : selectedType === 'variable_fee_rules'
                ? 'Variable Fee Rule Detail'
                : 'Tax Bracket Detail'
        }
        onDrawerClose={handleDrawerClose}
        drawerOpen={!!selectedItemId}
        mobileDrawerPlacement="bottom"
      />
      {selectedType === 'fees' && (
        <AddGlobalFeeModal
          open={addModalOpen}
          onClose={handleAddModalClose}
          onSuccess={handleAddModalSuccess}
        />
      )}
      {selectedType === 'appeal_fees' && (
        <AddAppealFeeModal
          open={addModalOpen}
          onClose={handleAddModalClose}
          onSuccess={handleAddModalSuccess}
        />
      )}
    </>
  )
}
