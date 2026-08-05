import { useState } from 'react'
import { Typography, Card, Grid, Modal, Drawer, Spin, Progress } from 'antd'
import {
  BookOutlined,
  CustomerServiceOutlined
} from '@ant-design/icons'
import DynamicPageContent from '@/shared/components/DynamicPageContent'
import ApplicationInfoCard from './ApplicationInfoCard'
import ApplicationFeeBreakdownModal from './modals/ApplicationFeeBreakdownModal'
import { isReturnedStatus } from '../utils/statusUtils'

const { Title, Text } = Typography
const { useBreakpoint } = Grid

export default function ApplicationOverview({ visibleSections, sectionCompleteMap, token, formType = 'permit', category = null, business = null, onViewReceipt, onViewAppealReceipt, onViewAppealDetails, onAppealClick, loadingAppealDetails, appealDetails, onShowAppRejectionModal, onShowAppealRejectionModal, onShowApprovalCommentModal, onProgressClick }) {
  const screens = useBreakpoint()
  const [hoveredCard, setHoveredCard] = useState(null)
  const [manualVisible, setManualVisible] = useState(false)
  const [feeModalVisible, setFeeModalVisible] = useState(false)
  const [feeData, setFeeData] = useState(null)
  const [loadingFees, setLoadingFees] = useState(false)

  const appStatus = business?.applicationStatus || ''
  const isReturned = isReturnedStatus(appStatus)

  const completedCount = visibleSections.filter((_, idx) => sectionCompleteMap[idx] === true).length
  const totalCount = visibleSections.length
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Different cards for returned state vs new application
  const overviewCards = isReturned ? [
    {
      key: 'manual',
      icon: <BookOutlined />,
      title: 'BizClear Manual',
      isButton: true,
      onClick: () => setManualVisible(true)
    },
    {
      key: 'help',
      icon: <CustomerServiceOutlined />,
      title: 'Need More Help?',
      isButton: true,
      onClick: () => window.location.href = '/help'
    }
  ] : [
    {
      key: 'manual',
      icon: <BookOutlined />,
      title: 'BizClear Manual',
      isButton: true,
      onClick: () => setManualVisible(true)
    },
    {
      key: 'help',
      icon: <CustomerServiceOutlined />,
      title: 'Need More Help?',
      isButton: true,
      onClick: () => window.location.href = '/help'
    }
  ]

  return (
    <div>
      {/* ApplicationInfoCard - always shown if business exists */}
      {business && (
        <div>
          <ApplicationInfoCard
            business={business}
            onProgressClick={onProgressClick}
            onViewReceipt={onViewReceipt}
            onViewAppealReceipt={onViewAppealReceipt}
            onViewAppealDetails={onViewAppealDetails}
            onAppealClick={onAppealClick}
            loadingAppealDetails={loadingAppealDetails}
            appealDetails={appealDetails}
            onShowAppRejectionModal={onShowAppRejectionModal}
            onShowAppealRejectionModal={onShowAppealRejectionModal}
            onShowApprovalCommentModal={onShowApprovalCommentModal}
            onShowFeesModal={() => setFeeModalVisible(true)}
            feeData={feeData}
            loadingFees={loadingFees}
            sections={visibleSections || []}
          />
        </div>
      )}

      {/* Bento cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: screens.md ? 'repeat(2, 1fr)' : '1fr',
          gridTemplateRows: screens.md ? 'repeat(2, auto)' : 'auto',
          gap: 12,
        }}
      >
        {overviewCards.map((card) => (
          <Card
            key={card.key}
            size="small"
            style={{
              border: screens.md && hoveredCard === card.key && card.isButton ? `1px solid ${token.colorPrimary}` : `1px solid ${token.colorBorder}`,
              borderRadius: token.borderRadiusLG,
              background: token.colorBgContainer,
              cursor: card.isButton ? 'pointer' : 'default',
              transition: screens.md ? 'border-color 0.2s, box-shadow 0.2s, transform 0.2s' : 'none',
              boxShadow: screens.md && hoveredCard === card.key && card.isButton ? token.boxShadowCard : 'none',
              transform: screens.md && hoveredCard === card.key && card.isButton ? 'scale(1.02)' : 'scale(1)',
              gridRow: card.spanRows ? `span ${card.spanRows}` : 'auto',
            }}
            onMouseEnter={screens.md && card.isButton ? () => setHoveredCard(card.key) : undefined}
            onMouseLeave={screens.md && card.isButton ? () => setHoveredCard(null) : undefined}
            styles={{
              body: {
                padding: screens.md ? '48px 16px 16px' : '12px',
                paddingTop: screens.md ? 90 : 48,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'flex-start',
              }
            }}
            onClick={card.isButton ? card.onClick : undefined}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div
                style={{
                  color: token.colorTextSecondary,
                  fontSize: screens.md ? 24 : 20,
                  marginBottom: 8,
                }}
              >
                {card.icon}
              </div>
              <Title level={5} style={{ margin: 0 }}>
                {card.title}
              </Title>
              {card.isProgress ? (
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Progress
                    type="dashboard"
                    percent={percentage}
                    gapDegree={50}
                    gapPlacement="bottom"
                    size={140}
                    strokeColor={token.colorPrimary}
                  />
                </div>
              ) : card.isFeeCard ? (
                <>
                  {card.loadingFees ? (
                    <Spin size="small" />
                  ) : (
                    <Text type="secondary" style={{ marginTop: 4 }}>
                      {card.feeData?.success
                        ? `${card.feeData.fees?.length || 0} fee item${(card.feeData.fees?.length || 0) > 1 ? 's' : ''}`
                        : 'Fee information unavailable'
                      }
                    </Text>
                  )}
                  <div
                    style={{
                      maxHeight: screens.md && hoveredCard === card.key ? 30 : 0,
                      overflow: 'hidden',
                      transition: screens.md ? 'max-height 0.15s ease-out' : 'none',
                    }}
                  >
                    <Text
                      style={{
                        display: 'block',
                        marginTop: 8,
                        color: token.colorPrimary,
                        fontSize: 12,
                        fontWeight: 500,
                        opacity: screens.md && hoveredCard === card.key ? 1 : 0,
                        transform: screens.md && hoveredCard === card.key ? 'translateY(0)' : 'translateY(10px)',
                        transition: screens.md ? 'opacity 0.15s ease-out, transform 0.15s ease-out' : 'none',
                      }}
                    >
                      View fees →
                    </Text>
                  </div>
                </>
              ) : card.isButton ? (
                <>
                  <Text type="secondary" style={{ marginTop: 4 }}>
                    {card.key === 'help' ? 'Request help from our officers!' : 'Read policies and guidelines.'}
                  </Text>
                  <div
                    style={{
                      maxHeight: screens.md && hoveredCard === card.key ? 30 : 0,
                      overflow: 'hidden',
                      transition: screens.md ? 'max-height 0.15s ease-out' : 'none',
                    }}
                  >
                    <Text
                      style={{
                        display: 'block',
                        marginTop: 8,
                        color: token.colorPrimary,
                        fontSize: 12,
                        fontWeight: 500,
                        opacity: screens.md && hoveredCard === card.key ? 1 : 0,
                        transform: screens.md && hoveredCard === card.key ? 'translateY(0)' : 'translateY(10px)',
                        transition: screens.md ? 'opacity 0.15s ease-out, transform 0.15s ease-out' : 'none',
                      }}
                    >
                      {card.key === 'help' ? 'Get help →' : 'Open manual →'}
                    </Text>
                  </div>
                </>
              ) : (
                card.key === 'how-it-works' ? (
                  <Text style={{
                    margin: 0,
                    marginTop: 4,
                    color: token.colorTextSecondary
                  }}>
                    {card.content[0]}
                  </Text>
                ) : (
                  <ul style={{
                    paddingLeft: 20,
                    margin: 0,
                    marginTop: 4,
                    color: token.colorTextSecondary
                  }}>
                    {card.content.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: idx < card.content.length - 1 ? 4 : 0 }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          </Card>
        ))}
      </div>

      {screens.md ? (
        <Modal
          title="BizClear Manual"
          open={manualVisible}
          onCancel={() => setManualVisible(false)}
          footer={null}
          width={800}
          style={{ top: 20 }}
        >
          <DynamicPageContent slotId="bizclear-manual" embedded compact />
        </Modal>
      ) : (
        <Drawer
          title="BizClear Manual"
          open={manualVisible}
          onClose={() => setManualVisible(false)}
          placement="right"
          height="100%"
          style={{ height: '100%' }}
        >
          <DynamicPageContent slotId="bizclear-manual" embedded compact />
        </Drawer>
      )}

      <ApplicationFeeBreakdownModal
        open={feeModalVisible}
        onCancel={() => setFeeModalVisible(false)}
        feeData={feeData}
        loadingFees={loadingFees}
        token={token}
      />
    </div>
  )
}
