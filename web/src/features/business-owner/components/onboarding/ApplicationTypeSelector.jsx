import { useState, useEffect } from 'react'
import { Typography, Divider, Modal } from 'antd'
import { ShopOutlined, CalendarOutlined, LinkOutlined } from '@ant-design/icons'
import SplitCard from '@/shared/components/SplitCard'
import { getPublicPermitFormsGrouped } from '@/shared/services/permitFormService'

const { Title, Text } = Typography

// Icon mapping for different form types
const ICON_MAP = {
  'unified-business-permit': ShopOutlined,
  'temporary-permit': CalendarOutlined,
  'cooperative': ShopOutlined,
  'association_foundation': ShopOutlined,
  'chainsaw': ShopOutlined,
  'firecrackers_stallholders': ShopOutlined,
  'bazaar_festival_vendors': ShopOutlined,
  'peddlers': ShopOutlined,
  'promotional_temporary_stalls': ShopOutlined,
  'market_stallholders': ShopOutlined,
  'fishpond': ShopOutlined,
}

export default function ApplicationTypeSelector({ onSelect, title = 'Choose Application Type', onLinkExisting }) {
  const [formsData, setFormsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showTemporaryModal, setShowTemporaryModal] = useState(false)

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

  const handleSelectBusiness = (formId) => {
    console.log('handleSelectBusiness called with formId:', formId)
    onSelect(formId)
  }

  const handleTemporaryPermitClick = () => {
    console.log('handleTemporaryPermitClick called')
    setShowTemporaryModal(true)
  }

  const handleTemporaryCategorySelect = (formId) => {
    console.log('handleTemporaryCategorySelect called with formId:', formId)
    setShowTemporaryModal(false)
    onSelect(formId)
  }

  const getIconForForm = (formId) => {
    return ICON_MAP[formId] || ShopOutlined
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', maxWidth: 600, margin: '0 auto', width: 'fit-content' }}>
        <Title level={4} style={{ marginBottom: 24, textAlign: 'center' }}>
          {title}
        </Title>
        <SplitCard
          title="Loading..."
          icon={ShopOutlined}
          description="Loading permit forms..."
          loading={true}
        />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: 600, margin: '0 auto', width: 'fit-content' }}>
      <Title level={4} style={{ marginBottom: 24, textAlign: 'center' }}>
        {title}
      </Title>

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
            onClick={() => handleSelectBusiness(formsData.regularPermit.formId)}
            style={{
              opacity: formsData.regularPermit.isActive ? 1 : 0.5,
              pointerEvents: formsData.regularPermit.isActive ? 'auto' : 'none',
            }}
            extraText={!formsData.regularPermit.isActive ? 'Currently unavailable' : null}
          />
        )}

        {/* Temporary Permit */}
        {formsData?.temporaryPermit && (
          <SplitCard
            title={formsData.temporaryPermit.parent.name}
            icon={CalendarOutlined}
            description={formsData.temporaryPermit.parent.description}
            clickable={formsData.temporaryPermit.parent.isActive}
            onClick={() => handleTemporaryPermitClick()}
            style={{
              opacity: formsData.temporaryPermit.parent.isActive ? 1 : 0.5,
              pointerEvents: formsData.temporaryPermit.parent.isActive ? 'auto' : 'none',
            }}
            extraText={!formsData.temporaryPermit.parent.isActive ? 'Currently unavailable' : null}
          />
        )}

        <Divider style={{ margin: '24px 0' }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Already have an existing business?
          </Text>
        </Divider>

        {/* Link Existing Business Option - Hardcoded as requested */}
        <SplitCard
          title="Link Existing Business"
          icon={LinkOutlined}
          description="Already have a business registered with BPLO? Link it to your account."
          clickable={true}
          onClick={onLinkExisting}
        />
      </div>

      {/* Temporary Permit Categories Modal */}
      <Modal
        title="Select Temporary Permit Type"
        open={showTemporaryModal}
        onCancel={() => setShowTemporaryModal(false)}
        footer={null}
        width={600}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {formsData?.temporaryPermit?.categories.map((category) => (
            <SplitCard
              key={category.formId}
              title={category.name}
              icon={getIconForForm(category.category)}
              description={category.description}
              clickable={category.isActive}
              onClick={() => handleTemporaryCategorySelect(category.formId)}
              style={{
                opacity: category.isActive ? 1 : 0.5,
                pointerEvents: category.isActive ? 'auto' : 'none',
              }}
              extraText={!category.isActive ? 'Currently unavailable' : null}
            />
          ))}
        </div>
      </Modal>
    </div>
  )
}
