import { useState } from 'react'
import { Grid } from 'antd'
import FormNavigation from '@/shared/components/FormNavigation'
import FormPreviewContent from './FormPreviewContent'

export default function FormPreviewRenderer({ sections, title, description, lastUpdated, fees = [], globalFees = [], notes = '' }) {
  const screens = Grid.useBreakpoint()
  const [activeTab, setActiveTab] = useState('overview')

  if (!sections || sections.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        No form sections available.
      </div>
    )
  }

  // Separate special sections from regular sections
  const requiredDocumentsSection = sections.find(section => section.type === 'required_documents')
  const regularSections = sections.filter(section => section.type !== 'required_documents')

  // Build navigation items (include required_documents at top of form nav)
  const mainNavItems = [
    { key: 'overview', label: 'Overview' },
    { key: 'form-details', label: 'Configuration' },
  ]

  const formNavItems = []
  
  // Add required documents to navigation if it exists
  if (requiredDocumentsSection) {
    formNavItems.push({
      key: 'required-documents',
      label: 'Required Documents',
    })
  }

  // Add regular sections (including LOB section)
  regularSections.forEach((section, index) => {
    if (section.type === 'lob_section') {
      formNavItems.push({
        key: 'lob-section',
        label: section.sectionName || 'Line of Business',
      })
    } else {
      formNavItems.push({
        key: `section-${index}`,
        label: section.sectionName || `Section ${index + 1}`,
      })
    }
  })

  const isMobile = !screens.lg

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%' }}>
      <FormNavigation
        mainNavItems={mainNavItems}
        formNavItems={formNavItems}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isMobile={isMobile}
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <FormPreviewContent
          sections={sections}
          title={title}
          description={description}
          lastUpdated={lastUpdated}
          fees={fees}
          globalFees={globalFees}
          notes={notes}
          activeTab={activeTab}
        />
      </div>
    </div>
  )
}
