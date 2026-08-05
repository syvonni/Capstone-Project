import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Grid, Space, Typography, Button, Dropdown, Badge, theme } from 'antd'
import LottieSpinner from '@/shared/components/LottieSpinner.jsx'
import {
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  SunOutlined,
  MoonOutlined,
  ReloadOutlined,
  MenuOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useAuthSession } from '@/features/authentication'
import { useConfirmLogoutModal } from '@/features/authentication/hooks/useConfirmLogoutModal'
import ConfirmLogoutModal from '@/features/authentication/components/ConfirmLogoutModal'
import { getNotifications, getUnreadCount, markAsRead } from '@/features/user/services/notificationService'
import { useAppTheme, THEMES } from '@/shared/theme/ThemeProvider'
import { logoutApi } from '@/features/authentication/services/authService'
import { setIsLoggingOut, setLogoutNotification } from '@/features/authentication/lib/authEvents.js'
import AnimatedBrandLogo from '@/shared/components/AnimatedBrandLogo.jsx'
import DynamicInfoModal from '@/shared/components/DynamicInfoModal.jsx'

dayjs.extend(relativeTime)

const { useBreakpoint } = Grid
const { Text } = Typography

const NOTIFICATIONS_POLL_MS = 30000
const NOTIFICATIONS_PAGE_SIZE = 5

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
    case 'tamper_incident':
    case 'system_alert':
      return <ExclamationCircleOutlined style={{ color: token.colorError }} />
    case 'recovery_request_pending':
    case 'deletion_request_pending':
      return <InfoCircleOutlined style={{ color: token.colorWarning }} />
    default:
      return <InfoCircleOutlined style={{ color: token.colorPrimary }} />
  }
}

export default function LayoutPageHeader({
  pageTitle,
  pageIcon,
  viewNotificationsPath,
  hideNotifications = false,
  hideProfileSettings = false,
  showPageHeader = true,
  onSettingsClick,
  leftContent,
  showBrandLogo = false,
  brandLogoClickable = true,
  onRefresh,
  infoSlotId,
  infoModalTitle,
  _mobileOpen,
  setMobileOpen,
}) {
  const { currentUser, logout } = useAuthSession()
  const { currentTheme, setTheme } = useAppTheme()
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const { token } = theme.useToken()
  const isMobile = !screens.md
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const initialFetchDone = useRef(false)
  const lastUserId = useRef(null)
  const isFetchingRef = useRef(false)
  const lastFetchTime = useRef(0)
  const FETCH_DEBOUNCE_MS = 2000

  const { open, show, hide, confirming, handleConfirm } = useConfirmLogoutModal({
    onConfirm: async () => {
      try {
        const logoutNotification = {
          type: 'success',
          message: 'Logged out',
          description: 'You have been signed out successfully.'
        }
        setLogoutNotification(logoutNotification)
        setIsLoggingOut(true)
        await logoutApi().catch(() => {})
        if (logout) await logout()
        navigate('/login', { replace: true })
      } catch (err) {
        console.error('Logout error:', err)
      }
    },
  })

  const isDarkMode = currentTheme === THEMES.DARK

  const handleThemeToggle = () => {
    const newTheme = isDarkMode ? THEMES.DEFAULT : THEMES.DARK
    setTheme(newTheme)
  }

  const profileMenuItems = [
    ...(hideProfileSettings
      ? []
      : [
          {
            key: 'settings',
            icon: <SettingOutlined />,
            label: 'View settings',
            onClick: () => {
              if (onSettingsClick) {
                onSettingsClick()
              } else {
                navigate('/settings-profile')
              }
            },
            style: { fontSize: 16, padding: '10px 16px' },
          },
        ]),
    {
      key: 'theme',
      icon: isDarkMode ? <SunOutlined /> : <MoonOutlined />,
      label: isDarkMode ? 'Light mode' : 'Dark mode',
      onClick: handleThemeToggle,
      style: { fontSize: 16, padding: '10px 16px' },
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: show,
      style: { fontSize: 16, padding: '10px 16px' },
    },
  ].filter(Boolean)

  const fetchNotifications = useCallback(async () => {
    if (!currentUser || hideNotifications || isFetchingRef.current) return
    
    // Debounce: don't fetch if we fetched recently
    const now = Date.now()
    if (now - lastFetchTime.current < FETCH_DEBOUNCE_MS) {
      return
    }
    
    isFetchingRef.current = true
    lastFetchTime.current = now
    setLoadingNotifications(true)
    try {
      const [notificationsResponse, count] = await Promise.all([
        getNotifications({ page: 1, limit: NOTIFICATIONS_PAGE_SIZE }),
        getUnreadCount(),
      ])
      const list = notificationsResponse?.notifications ?? notificationsResponse ?? []
      setNotifications(Array.isArray(list) ? list : [])
      setUnreadCount(typeof count === 'number' ? count : count?.count ?? 0)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoadingNotifications(false)
      isFetchingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Temporarily disable SSE stream to prevent excessive API calls
  // useNotificationStream({
  //   enabled: !!currentUser && !hideNotifications,
  //   onNewNotification: fetchNotifications,
  // })

  useEffect(() => {
    if (!currentUser || hideNotifications) return
    const currentUserId = currentUser?._id || currentUser?.id
    // Only fetch if user changed or first time
    if (!initialFetchDone.current || lastUserId.current !== currentUserId) {
      initialFetchDone.current = true
      lastUserId.current = currentUserId
      fetchNotifications()
    }
    // No polling interval - rely on SSE stream for real-time updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.read) {
        await markAsRead(notification._id)
        setUnreadCount((prev) => Math.max(0, prev - 1))
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
        )
      }
      setNotificationsOpen(false)
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const handleNotificationsOpenChange = useCallback((open) => {
    if (open && notifications.length > 0) {
      const unread = notifications.filter((n) => !n.read)
      if (unread.length > 0) {
        Promise.all(unread.map((n) => markAsRead(n._id)))
          .then(() => {
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
            setUnreadCount((prev) => Math.max(0, prev - unread.length))
          })
          .catch((err) => console.error('Failed to mark notifications as read', err))
      }
    }
    setNotificationsOpen(open)
  }, [notifications])

  const notificationPanelContent = (
    <div
      style={{
        background: token.colorBgContainer,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowSecondary,
        minWidth: 320,
        maxWidth: 400,
        maxHeight: 400,
        overflow: 'auto',
      }}
    >
      <div style={{ padding: 12, borderBottom: `1px solid ${token.colorBorder}` }}>
        <Text strong>Notifications</Text>
      </div>
      <div style={{ padding: 8 }}>
        {loadingNotifications ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <LottieSpinner size="small" />
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Text type="secondary">No new notifications</Text>
          </div>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size={0}>
            {notifications.map((n, i) => (
              <div
                key={n._id || i}
                role="button"
                tabIndex={0}
                onClick={() => handleNotificationClick(n)}
                onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(n)}
                style={{
                  padding: 10,
                  cursor: 'pointer',
                  borderRadius: token.borderRadius,
                  backgroundColor: !n.read ? token.colorInfoBg : 'transparent',
                }}
              >
                <Space size="small" align="start" style={{ width: '100%' }}>
                  {getNotificationIcon(n.type, token)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong={!n.read} style={{ display: 'block', fontSize: 13 }}>
                      {n.title}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                      {(n.message || '').length > 60
                        ? `${(n.message || '').slice(0, 60)}...`
                        : n.message || ''}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                      {n.createdAt ? dayjs(n.createdAt).fromNow() : ''}
                    </Text>
                  </div>
                </Space>
              </div>
            ))}
          </Space>
        )}
      </div>
      {viewNotificationsPath && (
        <div
          style={{
            padding: 8,
            borderTop: `1px solid ${token.colorBorder}`,
            textAlign: 'center',
          }}
        >
          <Link
            to={viewNotificationsPath}
            onClick={() => setNotificationsOpen(false)}
            style={{ fontSize: 13 }}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )

  if (!showPageHeader || (!pageTitle && !leftContent && !currentUser && !showBrandLogo)) {
    return null
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 16,
          flexWrap: 'wrap',
          gap: 12,
          borderBottom: `1px solid ${token.colorBorder}`,
          background: token.colorBgContainer, // Match sidebar background
          ...(isMobile ? {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            touchAction: 'none',
          } : {}),
        }}
      >
        {leftContent || showBrandLogo ? (
          <Space size={10} align="center">
            {showBrandLogo && <AnimatedBrandLogo onClick={brandLogoClickable ? () => navigate('/') : undefined} />}
            {!showBrandLogo && isMobile && setMobileOpen && (
              <Button
                icon={<AppstoreOutlined />}
                onClick={() => setMobileOpen(true)}
                style={{
                  padding: 6,
                  height: 32,
                  width: 32,
                  borderRadius: 8,
                }}
              />
            )}
            {!showBrandLogo && pageIcon && (
              <span
                style={{
                  fontSize: 16,
                  color: token.colorText,
                  border: '1px solid',
                  borderColor: token.colorText,
                  padding: 6,
                  height: 32,
                  width: 32,
                  borderRadius: 8,
                  display: isMobile ? 'none' : 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {pageIcon}
              </span>
            )}
            {!showBrandLogo && pageTitle && (
              <Text strong style={{ fontSize: isMobile ? 16 : 18 }}>
                {pageTitle}
              </Text>
            )}
          </Space>
        ) : (
          <Space size={10} align="center">
            {isMobile && setMobileOpen && (
              <Button
                icon={<AppstoreOutlined />}
                onClick={() => setMobileOpen(true)}
                style={{
                  padding: 6,
                  height: 32,
                  width: 32,
                  borderRadius: 8,
                }}
              />
            )}
            {pageIcon && (
              <span
                style={{
                  fontSize: 16,
                  color: token.colorText,
                  border: '1px solid',
                  borderColor: token.colorBorder,
                  padding: 6,
                  height: 32,
                  width: 32,
                  borderRadius: 8,
                  display: isMobile ? 'none' : 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {pageIcon}
              </span>
            )}
            {pageTitle && (
              <Text strong style={{ fontSize: isMobile ? 16 : 18 }}>
                {pageTitle}
              </Text>
            )}
          </Space>
        )}

        <Space size="middle" wrap>
          <Space.Compact>
            {!isMobile && onRefresh && (
              <Button
                icon={<ReloadOutlined />}
                onClick={async () => {
                  setRefreshing(true)
                  try {
                    await onRefresh()
                  } finally {
                    setRefreshing(false)
                  }
                }}
                loading={refreshing}
                aria-label="Refresh"
              />
            )}
            {infoSlotId && (
              <Button
                icon={<InfoCircleOutlined />}
                onClick={() => setInfoOpen(true)}
                aria-label="Info"
              />
            )}
            {currentUser && !hideNotifications && (
              <Dropdown
                open={notificationsOpen}
                onOpenChange={handleNotificationsOpenChange}
                trigger={['click']}
                placement="bottomRight"
                popupRender={() => notificationPanelContent}
              >
                <Badge count={unreadCount} size="small" offset={[-5, 5]} style={{ zIndex: 10 }}>
                  <Button icon={<BellOutlined style={{ fontSize: 18 }} />} aria-label="Notifications" />
                </Badge>
              </Dropdown>
            )}
            {currentUser && (
              <Dropdown
                menu={{ items: profileMenuItems, style: { minWidth: 100 } }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button
                  icon={<MenuOutlined />}
                  aria-label="Profile menu"
                  
                />
              </Dropdown>
            )}
          </Space.Compact>
        </Space>
      </div>
      <ConfirmLogoutModal
        open={open}
        onConfirm={handleConfirm}
        onCancel={hide}
        confirmLoading={confirming}
      />
      {infoSlotId && (
        <DynamicInfoModal
          slotId={infoSlotId}
          open={infoOpen}
          onClose={() => setInfoOpen(false)}
          title={infoModalTitle}
        />
      )}
    </>
  )}
