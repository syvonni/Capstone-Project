import { useState, useCallback, useEffect } from 'react'
import { App, Button, Collapse, Tag, theme, Typography } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import ResponsiveModal from './ResponsiveModal'
import LottieSpinner from '@/shared/components/graphics/LottieSpinner.jsx'
import {
  CloseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'

dayjs.extend(relativeTime)

const { Text } = Typography

function getNotificationIcon(type, token) {
  switch (type) {
    case 'application_approved':
      return <CheckCircleOutlined style={{ color: token.colorSuccess }} />
    case 'application_rejected':
      return <CloseCircleOutlined style={{ color: token.colorError }} />
    case 'application_needs_revision':
      return <ExclamationCircleOutlined style={{ color: token.colorWarning }} />
    case 'application_review_started':
      return <InfoCircleOutlined style={{ color: token.colorInfo }} />
    case 'approval_request_pending':
      return <ExclamationCircleOutlined style={{ color: token.colorWarning }} />
    case 'approval_resolved':
      return <CheckCircleOutlined style={{ color: token.colorSuccess }} />
    case 'restricted_field_attempt':
    case 'security_alert':
      return <ExclamationCircleOutlined style={{ color: token.colorError }} />
    case 'system_alert':
      return <ExclamationCircleOutlined style={{ color: token.colorError }} />
    case 'recovery_request_pending':
    case 'deletion_request_pending':
      return <InfoCircleOutlined style={{ color: token.colorWarning }} />
    default:
      return <InfoCircleOutlined style={{ color: token.colorPrimary }} />
  }
}

/**
 * NotificationsModal - A responsive modal that renders a list of notifications
 * using an antd Collapse. Supports read tracking through the notification's
 * own `read` flag and a "New" tag.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is open
 * @param {Function} props.onCancel - Called when the modal is closed
 * @param {Array} props.notifications - List of notification objects
 * @param {boolean} props.loading - Whether notifications are loading
 * @param {Array<string>} [props.activeKeys] - Controlled active collapse keys
 * @param {Function} [props.onChange] - Called when a panel is expanded/collapsed
 * @param {Function} [props.onDelete] - Called with the notification id to delete
 * @param {Function} [props.onClearAll] - Called to delete all notifications
 * @param {Object} [props.token] - Optional antd theme token
 */
export default function NotificationsModal({
  open,
  onCancel,
  notifications = [],
  loading = false,
  activeKeys,
  onChange,
  onDelete,
  onClearAll,
  token: tokenProp,
}) {
  const { token: themeToken } = theme.useToken()
  const token = tokenProp ?? themeToken
  const { modal, message } = App.useApp()

  const [internalActiveKeys, setInternalActiveKeys] = useState([])
  const isControlled = activeKeys !== undefined
  const currentActiveKeys = isControlled ? activeKeys : internalActiveKeys
  const activeKey = currentActiveKeys[0]

  const handleChange = useCallback(
    (keys) => {
      const nextKeys = Array.isArray(keys) ? keys : keys ? [keys] : []
      if (!isControlled) {
        setInternalActiveKeys(nextKeys)
      }
      if (onChange) {
        onChange(nextKeys)
      }
    },
    [isControlled, onChange]
  )

  useEffect(() => {
    if (!open) {
      setInternalActiveKeys([])
    }
  }, [open])

  const handleDeleteClick = useCallback(
    (notification) => {
      if (!onDelete) return

      modal.confirm({
        title: 'Delete notification',
        content: 'Are you sure you want to delete this notification? This action cannot be undone.',
        okText: 'Delete',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            await onDelete(notification._id)
            message.success('Notification deleted')
          } catch (err) {
            console.error('Failed to delete notification:', err)
            message.error('Failed to delete notification')
            throw err
          }
        },
      })
    },
    [onDelete, modal, message]
  )

  const handleClearAllClick = useCallback(() => {
    if (!onClearAll) return

    modal.confirm({
      title: 'Clear all notifications',
      content: 'Are you sure you want to delete all notifications? This action cannot be undone.',
      okText: 'Clear all',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await onClearAll()
          message.success('All notifications cleared')
        } catch (err) {
          console.error('Failed to clear all notifications:', err)
          message.error('Failed to clear all notifications')
          throw err
        }
      },
    })
  }, [onClearAll, modal, message])

  const footer = onClearAll && notifications.length > 0 ? (
    <Button block onClick={handleClearAllClick} icon={<DeleteOutlined />}>
      Clear all
    </Button>
  ) : null

  const collapseItems = notifications.map((n, i) => ({
    key: String(n._id || i),
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {getNotificationIcon(n.type, token)}
        <Text strong={!n.read}>
          {n.title}
        </Text>
        {!n.read && <Tag color="blue" style={{ fontSize: 12 }}>New</Tag>}
      </div>
    ),
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Text style={{ fontSize: 13 }}>{n.message}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {n.createdAt ? dayjs(n.createdAt).fromNow() : ''}
        </Text>
        {onDelete && (
          <Button
            block
            icon={<CloseOutlined />}
            onClick={() => handleDeleteClick(n)}
          >
            Delete
          </Button>
        )}
      </div>
    ),
  }))

  const content = (
    <div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <LottieSpinner size="small" />
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Text type="secondary">No new notifications</Text>
        </div>
      ) : (
        <Collapse
          style={{ background: token.colorBgContainer }}
          items={collapseItems}
          activeKey={activeKey}
          onChange={handleChange}
          expandIconPlacement="end"
          accordion
        />
      )}
    </div>
  )

  return (
    <ResponsiveModal
      title={`All Notifications (${notifications.length})`}
      open={open}
      onCancel={onCancel}
      footer={footer}
      width={600}
      styles={{
        body: { maxHeight: '70vh', overflowY: 'auto' }
      }}
    >
      {content}
    </ResponsiveModal>
  )
}
