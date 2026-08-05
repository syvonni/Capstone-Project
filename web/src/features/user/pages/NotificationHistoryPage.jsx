import { useState, useEffect, useCallback } from 'react'
import { List, Typography, Card, Tag, Space, Button, theme, Empty, Divider, message, Select, Grid } from 'antd'
import { ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined, DeleteOutlined, DollarOutlined, CalendarOutlined, WarningOutlined, FileTextOutlined, SolutionOutlined, EditOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getNotifications, markAsRead, deleteNotification } from '../services/notificationService'
import dayjs from 'dayjs'
import { useAuthSession } from '@/features/authentication'
import StaffLayout from '@/shared/components/StaffLayout'
import BusinessOwnerLayout from '@/features/business-owner/components/shared/BusinessOwnerLayout'

const { Text } = Typography
const { Option } = Select
const { useBreakpoint } = Grid

export default function NotificationHistoryPage() {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const navigate = useNavigate()
  const { role } = useAuthSession()

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)
  const [selectedId, setSelectedId] = useState(null)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getNotifications({
        page,
        limit,
      })
      const list = result.notifications || []
      setNotifications(Array.isArray(list) ? list : [])
      setTotal(result.pagination?.total || 0)
      setSelectedId((prev) => (list.some((n) => n._id === prev) ? prev : null))
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      message.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId)
      setNotifications(prev =>
        prev.map(n => (n._id === notificationId ? { ...n, read: true, readAt: new Date() } : n))
      )
      message.success('Notification marked as read')
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      message.error('Failed to mark notification as read')
    }
  }

  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification(notificationId)
      setNotifications(prev => prev.filter(n => n._id !== notificationId))
      setTotal(prev => prev - 1)
      if (selectedId === notificationId) setSelectedId(null)
      message.success('Notification deleted')
    } catch (error) {
      console.error('Failed to delete notification:', error)
      message.error('Failed to delete notification')
    }
  }

  const getNotificationIcon = (type, size = 20) => {
    const style = { fontSize: size }
    switch (type) {
      case 'application_approved':
      case 'renewal_approved':
      case 'retirement_accepted':
      case 'edit_request_approved':
      case 'post_requirement_verified':
      case 'violation_resolved':
        return <CheckCircleOutlined style={{ color: token.colorSuccess, ...style }} />
      case 'application_rejected':
      case 'application_needs_revision':
      case 'renewal_rejected':
      case 'retirement_rejected':
      case 'edit_request_rejected':
        return <CloseCircleOutlined style={{ color: token.colorError, ...style }} />
      case 'violation_issued':
      case 'violation_escalated':
      case 'abandoned_business_detected':
        return <WarningOutlined style={{ color: token.colorError, ...style }} />
      case 'payment_received':
        return <DollarOutlined style={{ color: token.colorSuccess, ...style }} />
      case 'payment_due_reminder':
        return <DollarOutlined style={{ color: token.colorWarning, ...style }} />
      case 'renewal_period_started':
      case 'post_requirement_due':
        return <CalendarOutlined style={{ color: token.colorWarning, ...style }} />
      case 'post_requirement_overdue':
        return <ExclamationCircleOutlined style={{ color: token.colorError, ...style }} />
      case 'new_application_submitted':
      case 'walkin_application_created':
      case 'appeal_submitted':
        return <FileTextOutlined style={{ color: token.colorInfo, ...style }} />
      case 'inspection_assigned':
      case 'inspection_scheduled':
        return <CalendarOutlined style={{ color: token.colorPrimary, ...style }} />
      case 'inspection_completed':
      case 'reinspection_required':
        return <SolutionOutlined style={{ color: token.colorInfo, ...style }} />
      case 'edit_request_received':
      case 'retirement_request_received':
        return <EditOutlined style={{ color: token.colorInfo, ...style }} />
      case 'application_review_started':
      case 'application_needs_approval':
        return <InfoCircleOutlined style={{ color: token.colorInfo, ...style }} />
      case 'penalty_config_changed':
      case 'fee_config_changed':
        return <SafetyCertificateOutlined style={{ color: token.colorInfo, ...style }} />
      case 'maintenance_mode':
      case 'maintenance_scheduled':
        return <ExclamationCircleOutlined style={{ color: token.colorWarning, ...style }} />
      default:
        return <InfoCircleOutlined style={{ color: token.colorPrimary, ...style }} />
    }
  }

  const handleSelectNotification = async (notification) => {
    setSelectedId(notification._id)
    if (!notification.read) await handleMarkAsRead(notification._id)
  }

  const selectedNotification = notifications.find(n => n._id === selectedId)

  const dashboardPath = (() => {
    const slug = (role?.slug ?? role ?? '').toLowerCase()
    if (slug === 'business_owner') return '/owner'
    if (slug === 'admin') return '/admin/dashboard'
    if (['staff', 'lgu_officer', 'inspector'].includes(slug)) return '/staff'
    return '/dashboard'
  })()
  const showBackToDashboard = (() => {
    const s = (role?.slug ?? role ?? '').toLowerCase()
    return s === 'business_owner'
  })()

  const leftPanelStyle = {
    width: isMobile ? '100%' : 360,
    minWidth: isMobile ? undefined : 280,
    borderRight: isMobile ? 'none' : `1px solid ${token.colorBorder}`,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    background: token.colorBgContainer,
  }

  const rightPanelStyle = {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    background: token.colorBgLayout,
  }

  const content = (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        height: '100%',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        overflow: 'hidden',
      }}
    >
      {/* Left: notifications list */}
      <div style={leftPanelStyle}>
        {showBackToDashboard && (
          <div style={{ flexShrink: 0, padding: '12px 16px', borderBottom: `1px solid ${token.colorBorder}` }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(dashboardPath)}>
              Back to dashboard
            </Button>
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Empty description="Loading…" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          ) : notifications.length === 0 ? (
            <Empty description="No notifications" style={{ padding: 48 }} />
          ) : (
            <>
              <List
                dataSource={notifications}
                style={{ flex: 1, overflow: 'auto' }}
                renderItem={(item) => {
                  const isSelected = item._id === selectedId
                  return (
                    <List.Item
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? token.colorPrimaryBg : !item.read ? token.colorInfoBg : 'transparent',
                        borderLeft: isSelected ? `3px solid ${token.colorPrimary}` : !item.read ? `3px solid ${token.colorPrimary}` : '3px solid transparent',
                      }}
                      onClick={() => handleSelectNotification(item)}
                    >
                      <List.Item.Meta
                        avatar={getNotificationIcon(item.type, 18)}
                        title={
                          <Space size="small">
                            <Text strong={!item.read} ellipsis style={{ maxWidth: 200 }}>
                              {item.title}
                            </Text>
                            {!item.read && <Tag color="blue" size="small">New</Tag>}
                          </Space>
                        }
                        description={
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(item.createdAt).format('MMM D, h:mm A')}
                          </Text>
                        }
                      />
                    </List.Item>
                  )
                }}
              />
              <div style={{ padding: '8px 16px', borderTop: `1px solid ${token.colorBorder}` }}>
                <Space size="small" style={{ fontSize: 12, color: token.colorTextSecondary }}>
                  <span>Total {total} notification{total !== 1 ? 's' : ''}</span>
                  {total > limit && (
                    <Space split={<Divider type="vertical" />}>
                      <Button
                        type="link"
                        size="small"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        disabled={page * limit >= total}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </Space>
                  )}
                </Space>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: selected notification detail */}
      <div style={rightPanelStyle}>
        {selectedNotification ? (
          <Card
            style={{
              margin: isMobile ? 16 : 24,
              borderRadius: token.borderRadiusLG,
              boxShadow: token.boxShadowSecondary,
            }}
            styles={{ body: { padding: 24 } }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <Space align="start" size="middle">
                  {getNotificationIcon(selectedNotification.type, 24)}
                  <div>
                    <Space size="small">
                      <Text strong style={{ fontSize: 18 }}>{selectedNotification.title}</Text>
                      {!selectedNotification.read && <Tag color="blue">New</Tag>}
                    </Space>
                    <div>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {dayjs(selectedNotification.createdAt).format('MMMM D, YYYY [at] h:mm A')}
                      </Text>
                    </div>
                  </div>
                </Space>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(selectedNotification._id)}
                  aria-label="Delete notification"
                />
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <Text style={{ whiteSpace: 'pre-wrap' }}>{selectedNotification.message}</Text>
              {selectedNotification.relatedEntityType && (
                <>
                  <Divider style={{ margin: '8px 0' }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Type: {String(selectedNotification.relatedEntityType).replace(/_/g, ' ')}
                    {selectedNotification.relatedEntityId && ` • ID: ${selectedNotification.relatedEntityId}`}
                  </Text>
                  {(() => {
                    const entityType = selectedNotification.relatedEntityType
                    const roleSlug = (role?.slug ?? role ?? '').toLowerCase()
                    const isStaff = ['staff', 'lgu_officer', 'inspector'].includes(roleSlug)
                    const linkMap = {
                      business_application: { label: 'View Permits', path: isStaff ? '/staff/applications' : '/owner' },
                      inspection: { label: 'View Inspections', path: isStaff ? '/staff/inspections' : '/owner' },
                      violation: { label: 'View Violations', path: isStaff ? '/staff/violations' : '/owner' },
                      payment: { label: 'View Payments', path: '/owner' },
                      appeal: { label: 'View Appeals', path: isStaff ? '/staff/appeals' : '/owner' },
                      registration_fee: { label: 'View Fees', path: '/owner' },
                    }
                    const link = linkMap[entityType]
                    if (!link) return null
                    return (
                      <Button type="primary" size="small" onClick={() => navigate(link.path)}>
                        {link.label}
                      </Button>
                    )
                  })()}
                </>
              )}
            </Space>
          </Card>
        ) : (
          <Empty
            description="Select a notification to view its details"
            style={{ margin: 'auto', padding: 48 }}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </div>
    </div>
  )

  if (role === 'admin') {
    return (
      <StaffLayout>
        {content}
      </StaffLayout>
    )
  }

  if (role === 'business_owner') {
    return (
      <BusinessOwnerLayout>
        {content}
      </BusinessOwnerLayout>
    )
  }

  return (
    <StaffLayout>
      {content}
    </StaffLayout>
  )
}
