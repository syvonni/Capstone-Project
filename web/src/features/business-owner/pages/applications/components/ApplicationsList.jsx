import { Typography, Button, Tooltip, Collapse, theme, Skeleton, Tag, App } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import ApplicationPanelCard from './ApplicationPanelCard'
import BlurFade from '@/shared/components/animations/BlurFade.jsx'
import { getStatusLabel, getApplicationDisplayName, getApplicationReferenceNumber, getApplicationId } from '../utils/statusUtils'
import { useApplicationListActions } from '../hooks/useApplicationListActions'

const { Title } = Typography
const { Panel } = Collapse

function ApplicationsList({
  applications,
  loading,
  selectedApplicationId,
  onApplicationSelect,
  onAddApplication,
  isSelectingType,
  draftLimitReached = false
}) {
  const { token } = theme.useToken()
  const { message, modal } = App.useApp()
  const { handleClearApplications } = useApplicationListActions({ message, modal })

  const collapseItems = [
    {
      key: 'applications',
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span>My Applications</span>
          <Tag>{applications.length}</Tag>
        </div>
      ),
      children: (
        <>
          <Tooltip title={draftLimitReached ? 'You can only have up to 2 draft, pending, or submitted applications at a time. Please complete or delete existing applications before creating a new one.' : ''}>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              style={{ width: '100%', marginBottom: 8 }}
              onClick={onAddApplication}
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
            {applications.map((application, index) => {
              const applicationId = getApplicationId(application)
              const isSelected = applicationId === selectedApplicationId
              const isLast = index === applications.length - 1

              // Warn if both status fields exist with different values
              if (application.applicationStatus && application.permitStatus &&
                  application.applicationStatus !== application.permitStatus) {
                console.warn(`[ApplicationsList] Status mismatch for ${applicationId}: applicationStatus="${application.applicationStatus}" vs permitStatus="${application.permitStatus}"`)
              }

              return (
                <div key={applicationId} style={{ marginBottom: isLast ? 0 : 8 }}>
                  <ApplicationPanelCard
                    application={{
                      id: applicationId,
                      name: getApplicationDisplayName(application),
                      referenceNumber: getApplicationReferenceNumber(application),
                      updatedAt: application.updatedAt,
                      createdAt: application.createdAt,
                      permitStatus: getStatusLabel(application.applicationStatus || application.permitStatus),
                      rawStatus: application.applicationStatus || application.permitStatus,
                      permitType: application.formType || 'N/A',
                    }}
                    isSelected={isSelected}
                    onClick={() => {
                      onApplicationSelect(applicationId)
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
        ) : applications.length === 0 ? (
          // No applications - show standalone Apply button
          <Tooltip title={draftLimitReached ? 'You can only have up to 2 draft, pending, or submitted applications at a time. Please complete or delete existing applications before creating a new one.' : ''}>
            <Button
              icon={<PlusOutlined />}
              style={{ width: '100%' }}
              onClick={onAddApplication}
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
