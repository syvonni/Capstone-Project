import { useState, useEffect } from 'react'
import ListPanel from '@/shared/components/ListPanel'
import PanelCard from '@/shared/components/PanelCard'
import { getPublicPermitForms } from '@/shared/services/permitFormService'

const TAB_OPTIONS = [
  { value: 'business_permits', label: 'Business Permits' },
  { value: 'temporary_permits', label: 'Temporary Permits' },
]

export function FormListPanel({ onSelect, selectedId }) {
  const [selectedTab, setSelectedTab] = useState('business_permits')
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const forms = await getPublicPermitForms()
        setForms(forms)
      } catch (error) {
        console.error('Failed to fetch permit forms:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchForms()
  }, [])

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const items = selectedTab === 'business_permits' 
    ? forms.filter(form => form.formId === 'unified-business-permit')
    : forms.filter(form => form.formId !== 'unified-business-permit')

  const renderCard = (form, currentSelectedId, onSelectItem) => {
    const tags = []
    if (form.isActive !== undefined) {
      tags.push({ label: form.isActive ? 'Active' : 'Disabled', color: form.isActive ? 'green' : 'red' })
    }

    return (
      <PanelCard
        key={form._id}
        title={form.name}
        description={form.description}
        selected={currentSelectedId === form.formId}
        onClick={() => onSelectItem(form.formId)}
        metaInfo={[
          { label: 'Created on', value: formatRelativeTime(form.createdAt) },
          { label: 'Last updated on', value: formatRelativeTime(form.updatedAt) },
        ]}
        tags={tags}
      />
    )
  }

  return (
    <ListPanel
      items={items}
      renderCard={renderCard}
      onSelectItem={onSelect}
      selectedId={selectedId}
      searchPlaceholder="Search forms..."
      showRefresh={true}
      onRefresh={() => {
        setLoading(true)
        const fetchForms = async () => {
          try {
            const forms = await getPublicPermitForms()
            setForms(forms)
          } catch (error) {
            console.error('Failed to fetch permit forms:', error)
          } finally {
            setLoading(false)
          }
        }
        fetchForms()
      }}
      searchOnEnter={true}
      showStaleInfo={false}
      isLoading={loading}
      tabSwitcher={{
        value: selectedTab,
        onChange: setSelectedTab,
        options: TAB_OPTIONS,
      }}
    />
  )
}
