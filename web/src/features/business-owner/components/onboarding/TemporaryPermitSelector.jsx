import { useState, useEffect } from 'react'
import { Typography, Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import SplitCard from '@/shared/components/SplitCard'
import ResponsiveModal from '@/shared/components/ResponsiveModal'
import { getPublicPermitFormsGrouped } from '@/shared/services/permitFormService'
import { getIconForForm } from '@/shared/utils/permitIconMap'

const { Title, Text } = Typography

export default function TemporaryPermitSelector({ onSelect, onBack, title = 'Select Temporary Permit Type' }) {
  const [formsData, setFormsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedForm, setSelectedForm] = useState(null)

  useEffect(() => {
    const fetchForms = async () => {
      try {
        setLoading(true)
        const data = await getPublicPermitFormsGrouped()
        // Backend returns grouped structure: {regularPermit, temporaryPermit: {categories}}
        const temporaryForms = data?.temporaryPermit?.categories || []
        setFormsData(temporaryForms)
      } catch (error) {
        console.error('Failed to fetch permit forms:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchForms()
  }, [])

  const handleSelectCategory = (formId) => {
    console.log('handleSelectCategory called with formId:', formId)
    setModalOpen(false)
    onSelect(formId)
  }

  const handleCardClick = (form) => {
    setSelectedForm(form)
    setModalOpen(true)
  }

  const handleConfirmSelection = () => {
    if (selectedForm) {
      handleSelectCategory(selectedForm.formId)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', maxWidth: 600, margin: '0 auto', width: 'fit-content' }}>
        <Title level={4} style={{ marginBottom: 24, textAlign: 'center' }}>
          {title}
        </Title>
        <SplitCard
          title="Loading..."
          icon={getIconForForm('loading')}
          description="Loading permit types..."
          loading={true}
        />
      </div>
    )
  }

  return (
    <>
      <div style={{ padding: '24px', maxWidth: 600, margin: '0 auto', width: 'fit-content' }}>
        {onBack && (
          <Button
            onClick={() => {
              onBack()
            }}
            icon={<ArrowLeftOutlined />}
            style={{
              marginBottom: 16
            }}
          >
            Back
          </Button>
        )}
        <Title level={4} style={{ marginBottom: 24, textAlign: 'center' }}>
          {title}
        </Title>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {formsData?.map((form) => (
            <SplitCard
              key={form.formId}
              title={form.name}
              icon={getIconForForm(form.formId)}
              description={form.description}
              clickable={form.isActive}
              onClick={() => handleCardClick(form)}
              style={{
                opacity: form.isActive ? 1 : 0.5,
                pointerEvents: form.isActive ? 'auto' : 'none',
              }}
              extraText={!form.isActive ? 'Currently unavailable' : null}
            />
          ))}
        </div>
      </div>

      {/* Selection confirmation modal */}
      <ResponsiveModal
        title="Confirm Selection"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="primary" onClick={handleConfirmSelection}>Confirm</Button>
          </div>
        }
        width={400}
      >
        {selectedForm && (
          <div style={{ padding: 16 }}>
            <Text>You have selected:</Text>
            <div style={{ marginTop: 16 }}>
              <Text strong style={{ fontSize: 16 }}>{selectedForm.name}</Text>
            </div>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">{selectedForm.description}</Text>
            </div>
          </div>
        )}
      </ResponsiveModal>
    </>
  )
}
