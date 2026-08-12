import React, { useState, useEffect } from 'react'
import { Typography, Divider } from 'antd'
import SplitCard from '@/shared/components/SplitCard'
import ResponsiveModal from '@/shared/components/ResponsiveModal'
import { getPublicPermitFormsGrouped } from '@/shared/services/permitFormService'
import { getIconForForm } from '@/shared/utils/permitIconMap'

const { Text } = Typography

function ApplicationPermitTypesModal({ open, onCancel, selectedPermitType = 'regular' }) {
  const [formsData, setFormsData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchForms = async () => {
      try {
        setLoading(true)
        const data = await getPublicPermitFormsGrouped()
        setFormsData(data)
      } catch (error) {
        console.error('[ApplicationPermitTypesModal] Failed to fetch permit forms:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchForms()
  }, [])

  // Backend returns grouped structure: {regularPermit, temporaryPermit: {categories, parent}}
  const allForms = React.useMemo(() => {
    if (!formsData) return []
    const forms = []

    if (formsData.regularPermit) {
      forms.push({
        ...formsData.regularPermit,
        type: 'regular'
      })
    }

    if (formsData.temporaryPermit?.categories) {
      formsData.temporaryPermit.categories.forEach(category => {
        forms.push({
          ...category,
          type: 'temporary'
        })
      })
    }

    return forms
  }, [formsData])

  // Find the selected form
  const selectedForm = React.useMemo(() => {
    if (!allForms.length) return null
    // Try to match by formId first
    let found = allForms.find(form => form.formId === selectedPermitType)
    // If not found, try matching by category (category might be 'cooperative' while formId is 'cooperative-permit')
    if (!found && selectedPermitType) {
      found = allForms.find(form => form.category === selectedPermitType)
    }
    return found
  }, [allForms, selectedPermitType])

  // Get all other forms (not selected)
  const otherForms = React.useMemo(() => {
    if (!selectedForm || !allForms.length) return []
    return allForms.filter(form => form.formId !== selectedForm.formId && form.category !== selectedForm.category)
  }, [allForms, selectedForm])

  if (loading) {
    return (
      <ResponsiveModal
        title="Business Permit Types"
        open={open}
        onCancel={onCancel}
        width={800}
      >
        <div style={{ padding: 24 }}>
          <Text type="secondary">Loading permit types...</Text>
        </div>
      </ResponsiveModal>
    )
  }

  if (!formsData || allForms.length === 0) {
    return (
      <ResponsiveModal
        title="Business Permit Types"
        open={open}
        onCancel={onCancel}
        width={800}
      >
        <div style={{ padding: 24 }}>
          <Text type="secondary">No permit types available</Text>
        </div>
      </ResponsiveModal>
    )
  }

  return (
    <ResponsiveModal
      title="Business Permit Types"
      open={open}
      onCancel={onCancel}
      width={800}
      footer={null}
    >
      <div style={{ display: 'flex', flexDirection: 'column'}}>
        {/* Selected permit type */}
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
            Selected permit type:
          </Text>
          {selectedForm && (
            <SplitCard
              title={selectedForm.name}
              icon={getIconForForm(selectedForm.formId)}
              description={selectedForm.description}
              disableBorderBehavior={true}
            />
          )}
        </div>

        <Divider />

        {/* Other permit types */}
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
            Other permit types:
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {otherForms.map((form) => (
              <SplitCard
                key={form.formId}
                title={form.name}
                icon={getIconForForm(form.formId)}
                description={form.description}
                disableBorderBehavior={true}
              />
            ))}
          </div>
        </div>
      </div>
    </ResponsiveModal>
  )
}

export default ApplicationPermitTypesModal
