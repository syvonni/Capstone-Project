import { PlusOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import ListPanel from '@/shared/components/ListPanel'
import PanelCard from '@/shared/components/PanelCard'
import { getPublicPermitForms } from '@/shared/services/permitFormService'

export function TemporaryPermitListPanel({ onSelect, selectedId, onAddTemporaryPermit }) {
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const forms = await getPublicPermitForms()
        // Filter out unified-business-permit to show only temporary permits
        const temporaryPermits = forms.filter(form => form.formId !== 'unified-business-permit')
        setForms(temporaryPermits)
      } catch (error) {
        console.error('Failed to fetch permit forms:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchForms()
  }, [])
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const renderCard = (form, currentSelectedId, onSelectItem) => {
    const metaInfo = []
    if (form.version !== undefined) {
      metaInfo.push({ label: 'Version', value: form.version })
    }
    if (form.createdAt) {
      metaInfo.push({ label: 'Created on', value: formatRelativeTime(form.createdAt) })
    }
    if (form.updatedAt) {
      metaInfo.push({ label: 'Last updated on', value: formatRelativeTime(form.updatedAt) })
    }

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
        metaInfo={metaInfo}
        tags={tags}
      />
    )
  }

  return (
    <ListPanel
      items={forms}
      renderCard={renderCard}
      onSelectItem={onSelect}
      selectedId={selectedId}
      searchPlaceholder="Search temporary permits..."
      showRefresh={true}
      onRefresh={() => {
        setLoading(true)
        const fetchForms = async () => {
          try {
            const forms = await getPublicPermitForms()
            const temporaryPermits = forms.filter(form => form.formId !== 'unified-business-permit')
            setForms(temporaryPermits)
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
      loading={loading}
      primaryButton={{
        icon: <PlusOutlined />,
        onClick: onAddTemporaryPermit,
        label: 'Add Temporary Permit',
      }}
    />
  )
}
