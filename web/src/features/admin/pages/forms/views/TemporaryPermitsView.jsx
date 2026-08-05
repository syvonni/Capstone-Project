import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'
import { TemporaryPermitListPanel, FormDetailPanel } from '../components'
import AddTemporaryPermitModal from '../components/modals/AddTemporaryPermitModal'

export default function TemporaryPermitsView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedFormId, setSelectedFormId] = useState(null)
  const [showAddTemporaryPermitModal, setShowAddTemporaryPermitModal] = useState(false)

  // Handle URL query param for direct form selection
  useEffect(() => {
    const formIdFromUrl = searchParams.get('selectedId')
    if (formIdFromUrl) {
      setSelectedFormId(formIdFromUrl)
    }
  }, [searchParams])

  const handleFormSelect = (formId) => {
    setSelectedFormId(formId)
    setSearchParams({ selectedId: formId })
  }

  const handleBackToMenu = () => {
    setSelectedFormId(null)
    setSearchParams({})
  }

  const handleAddTemporaryPermit = () => {
    setShowAddTemporaryPermitModal(true)
  }

  const handleCloseAddModal = () => {
    setShowAddTemporaryPermitModal(false)
  }

  const handleAddModalSuccess = () => {
    setShowAddTemporaryPermitModal(false)
    // TODO: Refresh form list when backend integration is added
  }

  return (
    <>
      <ResponsiveSplitLayout
        listContent={<TemporaryPermitListPanel onSelect={handleFormSelect} selectedId={selectedFormId} onAddTemporaryPermit={handleAddTemporaryPermit} />}
        detailContent={
          selectedFormId ? (
            <FormDetailPanel formId={selectedFormId} onBackToMenu={handleBackToMenu} />
          ) : null
        }
        drawerOpen={!!selectedFormId}
        mobileDrawerPlacement="bottom"
      />
      <AddTemporaryPermitModal
        open={showAddTemporaryPermitModal}
        onClose={handleCloseAddModal}
        onSuccess={handleAddModalSuccess}
      />
    </>
  )
}
