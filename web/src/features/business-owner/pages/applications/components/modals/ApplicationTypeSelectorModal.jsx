import { useState, useEffect } from 'react'
import { Typography, Divider } from 'antd'
import { ShopOutlined, LinkOutlined } from '@ant-design/icons'
import SplitCard from '@/shared/components/SplitCard'
import ResponsiveModal from '@/shared/components/ResponsiveModal'
import { getPublicPermitFormsGrouped } from '@/shared/services/permitFormService'
import { getIconForForm } from '@/shared/utils/permitIconMap'

const { Title, Text } = Typography

export default function ApplicationTypeSelectorModal({ onSelect, title = 'Choose Application Type', onLinkExisting, open, onCancel }) {
  const [formsData, setFormsData] = useState(null)
  const [loading, setLoading] = useState(true)

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

  const handleSelectApplicationType = (formId) => {
    console.log('handleSelectApplicationType called with formId:', formId)
    onSelect(formId)
    onCancel()
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
        <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
          <SplitCard
            title="Loading..."
            icon={ShopOutlined}
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
      <div style={{ padding: '24px' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {/* Regular Business Permit */}
          {formsData?.regularPermit && (
            <SplitCard
              title={formsData.regularPermit.name}
              icon={getIconForForm(formsData.regularPermit.formId)}
              description={formsData.regularPermit.description}
              clickable={formsData.regularPermit.isActive}
              onClick={() => handleSelectApplicationType(formsData.regularPermit.formId)}
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
              icon={getIconForForm(category.category)}
              description={category.description}
              clickable={category.isActive}
              onClick={() => handleSelectApplicationType(category.formId)}
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
            icon={LinkOutlined}
            description="Already have a business registered with BPLO? Link it to your account."
            clickable={true}
            onClick={() => {
              onLinkExisting()
              onCancel()
            }}
          />
        </div>
      </div>
    </ResponsiveModal>
  )
}
