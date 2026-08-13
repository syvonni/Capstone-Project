import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Grid, Space, Typography, Button, Dropdown, Badge, theme } from 'antd'
import {
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  SunOutlined,
  MoonOutlined,
  ReloadOutlined,
  MenuOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import { useAuthSession } from '@/features/authentication'
import { useConfirmLogoutModal } from '@/features/authentication/hooks/useConfirmLogoutModal'
import ConfirmLogoutModal from '@/features/authentication/components/ConfirmLogoutModal'
import { getNotifications, getUnreadCount, markAsRead, deleteNotification, deleteAllNotifications } from '@/features/user/services/notificationService'
import { useAppTheme, THEMES } from '@/shared/theme/ThemeProvider'
import { logoutApi } from '@/features/authentication/services/authService'
import { setIsLoggingOut, setLogoutNotification } from '@/features/authentication/lib/authEvents.js'
import AnimatedBrandLogo from '@/shared/components/graphics/AnimatedBrandLogo.jsx'
import DynamicInfoModal from '@/shared/components/cms/DynamicInfoModal.jsx'
import NotificationsModal from '@/shared/components/NotificationsModal.jsx'

const { useBreakpoint } = Grid
const { Text } = Typography

const NOTIFICATIONS_POLL_MS = 30000
const NOTIFICATIONS_BATCH_LIMIT = 100

export default function LayoutPageHeader({
  pageTitle,
  pageIcon,
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
  const [activeNotificationKeys, setActiveNotificationKeys] = useState([])
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
      const [firstPage, count] = await Promise.all([
        getNotifications({ page: 1, limit: NOTIFICATIONS_BATCH_LIMIT }),
        getUnreadCount(),
      ])

      const totalPages = firstPage?.pagination?.totalPages ?? 1
      const firstPageList = firstPage?.notifications ?? firstPage ?? []
      let allNotifications = Array.isArray(firstPageList) ? firstPageList : []

      if (totalPages > 1) {
        const remainingPages = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            getNotifications({ page: i + 2, limit: NOTIFICATIONS_BATCH_LIMIT })
          )
        )
        const remainingNotifications = remainingPages.flatMap(
          (page) => page?.notifications ?? page ?? []
        )
        allNotifications = [...allNotifications, ...remainingNotifications]
      }

      setNotifications(allNotifications)
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

  const handleNotificationCollapseChange = useCallback((nextKeys) => {
    const newlyExpanded = nextKeys.filter((k) => !activeNotificationKeys.includes(k))

    if (newlyExpanded.length > 0) {
      const toMark = notifications.filter((n) => newlyExpanded.includes(n._id) && !n.read)
      if (toMark.length > 0) {
        Promise.all(toMark.map((n) => markAsRead(n._id)))
          .then(() => {
            setNotifications((prev) =>
              prev.map((n) => (toMark.some((t) => t._id === n._id) ? { ...n, read: true } : n))
            )
            setUnreadCount((prev) => Math.max(0, prev - toMark.length))
          })
          .catch((err) => console.error('Failed to mark notifications as read', err))
      }
    }

    setActiveNotificationKeys(nextKeys)
  }, [activeNotificationKeys, notifications])

  const handleDeleteNotification = useCallback(
    (notificationId) => {
      const wasUnread = notifications.find((n) => n._id === notificationId)?.read === false
      return deleteNotification(notificationId)
        .then(() => {
          setNotifications((prev) => prev.filter((n) => n._id !== notificationId))
          setActiveNotificationKeys((prev) => prev.filter((k) => k !== notificationId))
          if (wasUnread) {
            setUnreadCount((prev) => Math.max(0, prev - 1))
          }
        })
        .catch((err) => {
          console.error('Failed to delete notification:', err)
          throw err
        })
    },
    [notifications]
  )

  const handleClearAllNotifications = useCallback(
    () =>
      deleteAllNotifications()
        .then(() => {
          setNotifications([])
          setUnreadCount(0)
          setActiveNotificationKeys([])
        })
        .catch((err) => {
          console.error('Failed to clear all notifications:', err)
          throw err
        }),
    []
  )

  const handleCloseNotifications = useCallback(() => {
    setNotificationsOpen(false)
    setActiveNotificationKeys([])
  }, [])

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
            {currentUser && !hideNotifications && (
              <>
                <Badge count={unreadCount} size="small" offset={[-5, 5]} style={{ zIndex: 10 }}>
                  <Button
                    icon={<BellOutlined style={{ fontSize: 18 }} />}
                    onClick={() => setNotificationsOpen(true)}
                    aria-label="Notifications"
                  />
                </Badge>
                <NotificationsModal
                  open={notificationsOpen}
                  onCancel={handleCloseNotifications}
                  notifications={notifications}
                  loading={loadingNotifications}
                  activeKeys={activeNotificationKeys}
                  onChange={handleNotificationCollapseChange}
                  onDelete={handleDeleteNotification}
                  onClearAll={handleClearAllNotifications}
                  token={token}
                />
              </>
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
