import { useState, useEffect, useRef } from 'react'
import { Typography, Divider } from 'antd'
import SplitCard from '@/shared/components/SplitCard'
import ResponsiveModal from '@/shared/components/ResponsiveModal'
import { getPublicPermitFormsGrouped } from '@/shared/services/permitFormService'

const { Title, Text } = Typography

export default function ApplicationTypeSelectorModal({ onSelect, title = 'Choose Application Type', onLinkExisting, open, onCancel }) {
  const [formsData, setFormsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [creatingFormId, setCreatingFormId] = useState(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const fetchForms = async () => {
      try {
        setLoading(true)
        const data = await getPublicPermitFormsGrouped()
        console.log('Fetched permit forms data:', data)
        setFormsData(data)
      } catch (error) {
        console.error('Failed to fetch permit forms:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchForms()
  }, [])

  const handleSelectApplicationType = async (formId) => {
    console.log('handleSelectApplicationType called with formId:', formId)
    setCreatingFormId(formId)
    setCreating(true)
    try {
      await onSelect(formId)
    } catch (error) {
      console.error('Failed to create application draft:', error)
    } finally {
      if (isMountedRef.current) {
        setCreating(false)
        setCreatingFormId(null)
      }
    }
  }

  const handleLinkExisting = async () => {
    setCreatingFormId('link-existing')
    setCreating(true)
    try {
      await onLinkExisting?.()
    } catch (error) {
      console.error('Failed to link existing business:', error)
    } finally {
      if (isMountedRef.current) {
        setCreating(false)
        setCreatingFormId(null)
      }
      onCancel()
    }
  }

  if (loading) {
    return (
      <ResponsiveModal
        title={title}
        open={open}
        onCancel={onCancel}
        footer={null}
        width={700}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SplitCard
            title="Loading..."
            description="Loading permit forms..."
            loading={true}
          />
        </div>
      </ResponsiveModal>
    )
  }

  return (
    <ResponsiveModal
      title={title}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={700}
    >
      <div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {/* Regular Business Permit */}
          {formsData?.regularPermit && (
            <SplitCard
              title={formsData.regularPermit.name}
              description={formsData.regularPermit.description}
              clickable={formsData.regularPermit.isActive && !creating}
              onClick={!creating ? () => handleSelectApplicationType(formsData.regularPermit.formId) : undefined}
              loading={creating && creatingFormId === formsData.regularPermit.formId}
              style={{
                opacity: formsData.regularPermit.isActive ? 1 : 0.5,
                pointerEvents: formsData.regularPermit.isActive ? 'auto' : 'none',
              }}
              extraText={!formsData.regularPermit.isActive ? 'Currently unavailable' : null}
            />
          )}

          <Divider>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Temporary Permits
            </Text>
          </Divider>

          {/* Temporary Permit Categories */}
          {formsData?.temporaryPermit?.categories.map((category) => (
            <SplitCard
              key={category.formId}
              title={category.name}
              description={category.description}
              clickable={category.isActive && !creating}
              onClick={!creating ? () => handleSelectApplicationType(category.formId) : undefined}
              loading={creating && creatingFormId === category.formId}
              style={{
                opacity: category.isActive ? 1 : 0.5,
                pointerEvents: category.isActive ? 'auto' : 'none',
              }}
              extraText={!category.isActive ? 'Currently unavailable' : null}
            />
          ))}

          <Divider style={{ margin: '24px 0' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Already have an existing business?
            </Text>
          </Divider>

          {/* Link Existing Business Option */}
          <SplitCard
            title="Link Existing Business"
            description="Already have a business registered with BPLO? Link it to your account."
            clickable={!creating}
            onClick={!creating ? () => handleLinkExisting() : undefined}
            loading={creating && creatingFormId === 'link-existing'}
          />
        </div>
      </div>
    </ResponsiveModal>
  )
}
