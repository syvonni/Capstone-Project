import { useState } from 'react'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'
import { FormListPanel } from '../components'
import { FormDetailPanel } from '../components'

export default function AdminFormsView() {
  const [selectedFormId, setSelectedFormId] = useState(null)

  const handleFormSelect = (formId) => {
    setSelectedFormId(formId)
  }

  const handleBackToMenu = () => {
    setSelectedFormId(null)
  }

  return (
    <ResponsiveSplitLayout
      drawerTitle="Form Details"
      listContent={<FormListPanel onSelect={handleFormSelect} selectedId={selectedFormId} />}
      detailContent={
        selectedFormId ? (
          <FormDetailPanel formId={selectedFormId} onBackToMenu={handleBackToMenu} />
        ) : null
      }
      drawerOpen={!!selectedFormId}
      mobileDrawerPlacement="bottom"
    />
  )
}
