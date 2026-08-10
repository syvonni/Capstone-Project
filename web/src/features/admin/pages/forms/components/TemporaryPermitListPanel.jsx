import { PlusOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import ListPanel from '@/shared/components/ListPanel'
import PanelCard from '@/shared/components/PanelCard'
import { getPermitForms } from '@/features/admin/services/permitFormService'

export function TemporaryPermitListPanel({ onSelect, selectedId, onAddTemporaryPermit, enableStats, statsActive, onStatsToggle }) {
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(true)

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const forms = await getPermitForms()
        // Backend now returns data directly (array)
        const formsArray = Array.isArray(forms) ? forms : []
        // Filter out unified-business-permit to show only temporary permits
        const temporaryPermits = formsArray.filter(form => form.formId !== 'unified-business-permit')
        // Sort alphabetically by name
        temporaryPermits.sort((a, b) => a.name.localeCompare(b.name))
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

  const filteredForms = forms.filter(form => {
    // Apply status filter
    if (statusFilter !== null && form.isActive !== statusFilter) {
      return false
    }
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.trim().toLowerCase()
      return (
        form.name?.toLowerCase().includes(searchLower) ||
        form.description?.toLowerCase().includes(searchLower) ||
        form.formId?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

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

    const handleClick = () => {
      console.log('Form clicked:', form)
      console.log('formId:', form.formId)
      console.log('_id:', form._id)
      onSelectItem(form.formId)
    }

    return (
      <PanelCard
        key={form._id}
        title={form.name}
        description={form.description}
        selected={currentSelectedId === form.formId}
        onClick={handleClick}
        metaInfo={metaInfo}
        tags={tags}
      />
    )
  }

  const statusOptions = [
    { value: true, label: 'Active' },
    { value: false, label: 'Disabled' }
  ]

  const handleResetFilters = () => {
    setSearchTerm('')
    setStatusFilter(null)
  }

  return (
    <ListPanel
      items={filteredForms}
      renderCard={renderCard}
      onSelectItem={onSelect}
      selectedId={selectedId}
      searchPlaceholder="Search temporary permits..."
      showRefresh={true}
      onRefresh={() => {
        setLoading(true)
        const fetchForms = async () => {
          try {
            const forms = await getPermitForms()
            // Backend now returns data directly (array)
            const formsArray = Array.isArray(forms) ? forms : []
            const temporaryPermits = formsArray.filter(form => form.formId !== 'unified-business-permit')
            // Sort alphabetically by name
            temporaryPermits.sort((a, b) => a.name.localeCompare(b.name))
            setForms(temporaryPermits)
          } catch (error) {
            console.error('Failed to fetch permit forms:', error)
          } finally {
            setLoading(false)
          }
        }
        fetchForms()
      }}
      search={searchTerm}
      onSearchChange={setSearchTerm}
      searchOnEnter={true}
      showStaleInfo={false}
      isLoading={loading}
      enableStats={enableStats}
      statsActive={statsActive}
      onStatsToggle={onStatsToggle}
      filterConfig={[
        {
          key: 'isActive',
          label: 'Status',
          type: 'select',
          options: statusOptions,
          value: statusFilter,
        },
      ]}
      onFilterChange={(key, value) => {
        if (key === 'isActive') setStatusFilter(value)
      }}
      onClearFilters={handleResetFilters}
      customFilter={true}
      primaryButton={{
        icon: <PlusOutlined />,
        onClick: onAddTemporaryPermit,
        label: 'Add Temporary Permit',
      }}
    />
  )
}
