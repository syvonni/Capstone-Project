import { Typography, Button, Tooltip, Collapse, theme, Skeleton, Tag, App } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import ApplicationPanelCard from './ApplicationPanelCard'
import BlurFade from '@/shared/components/BlurFade.jsx'
import { getStatusLabel, getBusinessDisplayName, getBusinessReferenceNumber, getBusinessId } from '../utils/statusUtils'

const { Title } = Typography
const { Panel } = Collapse

function ApplicationsList({
  businesses,
  loading,
  selectedBusinessId,
  onBusinessSelect,
  onAddBusiness,
  isSelectingType,
  draftLimitReached = false
}) {
  const { token } = theme.useToken()
  const { message, modal } = App.useApp()

  const handleClearApplications = async () => {
    modal.confirm({
      title: 'Clear All Applications?',
      content: 'This will delete all your applications and reset the welcome state. This action cannot be undone.',
      okText: 'Clear',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const { fetchJsonWithFallback } = await import('@/lib/http')
          const { getCurrentUser } = await import('@/features/authentication/lib/authEvents')
          const { authHeaders } = await import('@/lib/authHeaders')
          
          const current = getCurrentUser()
          const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
          
          await fetchJsonWithFallback('/api/business/debug/clear-applications', {
            method: 'POST',
            headers,
          })
          
          message.success('Applications cleared successfully')
          window.location.reload()
        } catch (err) {
          console.error('Failed to clear applications:', err)
          message.error('Failed to clear applications')
        }
      },
    })
  }

  const collapseItems = [
    {
      key: 'applications',
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span>My Applications</span>
          <Tag>{businesses.length}</Tag>
        </div>
      ),
      children: (
        <>
          <Tooltip title={draftLimitReached ? 'You can only have up to 2 draft, pending, or submitted applications at a time. Please complete or delete existing applications before creating a new one.' : ''}>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              style={{ width: '100%', marginBottom: 8 }}
              onClick={onAddBusiness}
              disabled={isSelectingType || draftLimitReached}
            >
              Apply
            </Button>
          </Tooltip>
          <Button
            icon={<DeleteOutlined />}
            style={{ width: '100%', marginBottom: 8, border: `1px dashed ${token.colorBorder}` }}
            onClick={handleClearApplications}
          >
            Clear ALL applications (DEBUG)
          </Button>
          <div style={{ width: '100%' }}>
            {businesses.map((business, index) => {
              const businessId = getBusinessId(business)
              const isSelected = businessId === selectedBusinessId
              const isLast = index === businesses.length - 1

              // Warn if both status fields exist with different values
              if (business.applicationStatus && business.permitStatus &&
                  business.applicationStatus !== business.permitStatus) {
                console.warn(`[ApplicationsList] Status mismatch for ${businessId}: applicationStatus="${business.applicationStatus}" vs permitStatus="${business.permitStatus}"`)
              }

              return (
                <div key={businessId} style={{ marginBottom: isLast ? 0 : 8 }}>
                  <ApplicationPanelCard
                    business={{
                      id: businessId,
                      name: getBusinessDisplayName(business),
                      referenceNumber: getBusinessReferenceNumber(business),
                      updatedAt: business.updatedAt,
                      createdAt: business.createdAt,
                      permitStatus: getStatusLabel(business.applicationStatus || business.permitStatus),
                      rawStatus: business.applicationStatus || business.permitStatus,
                      permitType: business.formType || 'N/A',
                    }}
                    isSelected={isSelected}
                    onClick={() => {
                      onBusinessSelect(businessId)
                    }}
                  />
                </div>
              )
            })}
          </div>
        </>
      ),
    }
  ]

  return (
    <BlurFade onViewport={true} delay={0.1} duration={0.5} direction="down" fullHeight={false}>
      <div>
        {loading ? (
          <div style={{ width: '100%' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ 
                  padding: '16px', 
                  border: `1px solid ${token.colorBorderSecondary}`, 
                  borderRadius: '8px',
                  backgroundColor: token.colorBgContainer
                }}>
                  {/* Title */}
                  <Skeleton.Input active style={{ width: '60%', marginBottom: 12 }} />
                  {/* Meta info */}
                  <Skeleton.Input active size="small" style={{ width: '40%', marginBottom: 8 }} />
                  <Skeleton.Input active size="small" style={{ width: '50%', marginBottom: 12 }} />
                  {/* Tags */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Skeleton.Button active size="small" style={{ width: 60 }} />
                    <Skeleton.Button active size="small" style={{ width: 70 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : businesses.length === 0 ? (
          // No applications - show standalone Apply button
          <Tooltip title={draftLimitReached ? 'You can only have up to 2 draft, pending, or submitted applications at a time. Please complete or delete existing applications before creating a new one.' : ''}>
            <Button
              icon={<PlusOutlined />}
              style={{ width: '100%' }}
              onClick={onAddBusiness}
              disabled={isSelectingType || draftLimitReached}
            >
              Apply
            </Button>
          </Tooltip>

        ) : (
          // Has applications - show collapse with list and Apply button inside
          <Collapse
            items={collapseItems}
            defaultActiveKey={['applications']}
            style={{
              background: token.colorBgContainer,
            }}
            
          />
        )}
      </div>
    </BlurFade>
  )
}

export default ApplicationsList
