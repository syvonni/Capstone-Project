import { useState, useCallback, useMemo, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import BusinessDetailPanel from './components/BusinessDetailPanel'
import ListPanel from '@/shared/components/ListPanel'
import PanelCard from '@/shared/components/PanelCard'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'
import useOfficerData from '../../hooks/useOfficerData'
import { useOfficerDataContext } from '../../contexts/OfficerDataContext'

export default function OfficerBusinesses() {
  const { businessId: urlBusinessId } = useParams()
  const [selectedItem, setSelectedItem] = useState(null)
  const { refreshTrigger } = useOfficerDataContext()
  const officerData = useOfficerData('businesses', refreshTrigger)

  const getItemId = useCallback((item) => {
    return item.businessId || item._id
  }, [])

  const handleSelectBusiness = useCallback((business) => {
    setSelectedItem({ ...business, _itemType: 'businesses', _itemId: getItemId(business) })
  }, [getItemId])

  const handleDrawerClose = useCallback(() => {
    setSelectedItem(null)
  }, [])

  // Auto-select business from URL param
  useEffect(() => {
    if (urlBusinessId && officerData?.businesses) {
      const business = officerData.businesses.find(b => getItemId(b) === urlBusinessId)
      if (business) {
        handleSelectBusiness(business)
      }
    }
  }, [urlBusinessId, officerData?.businesses, getItemId, handleSelectBusiness])

  // Sync selectedItem with refreshed data
  useMemo(() => {
    if (selectedItem && officerData?.businesses) {
      const updatedItem = officerData.businesses.find(b => getItemId(b) === selectedItem._itemId)
      if (updatedItem) {
        const currentData = { ...selectedItem }
        delete currentData._itemType
        delete currentData._itemId
        const newData = { ...updatedItem }
        if (JSON.stringify(currentData) !== JSON.stringify(newData)) {
          setSelectedItem({ ...updatedItem, _itemType: 'businesses', _itemId: getItemId(updatedItem) })
        }
      }
    }
  }, [officerData?.businesses, selectedItem, getItemId])

  const filteredList = useMemo(() => {
    const list = officerData?.businesses || []
    return [...list].sort((a, b) => {
      const da = new Date(a.createdAt || a.updatedAt || 0).getTime()
      const db = new Date(b.createdAt || b.updatedAt || 0).getTime()
      return db - da
    })
  }, [officerData?.businesses])

  const renderCard = (business, currentSelectedId, onSelect) => {
    return (
      <PanelCard
        key={getItemId(business)}
        item={business}
        selected={currentSelectedId === getItemId(business)}
        onClick={() => onSelect(business)}
        title={business.businessName || 'Unnamed Business'}
        description=''
        metaInfo={[]}
        tags={[]}
      />
    )
  }

  const listContent = (
    <ListPanel
      items={filteredList}
      isLoading={officerData?.loadingMap?.businesses}
      selectedId={selectedItem?._itemId}
      onSelectItem={handleSelectBusiness}
      renderCard={renderCard}
      filterConfig={[]}
    />
  )

  const detailContent = selectedItem ? (
    <BusinessDetailPanel business={selectedItem} />
  ) : null

  return (
    <ResponsiveSplitLayout
      listContent={listContent}
      detailContent={detailContent}
      drawerTitle="Business details"
      onDrawerClose={handleDrawerClose}
      drawerOpen={!!selectedItem}
      mobileDrawerPlacement="bottom"
    />
  )
}
