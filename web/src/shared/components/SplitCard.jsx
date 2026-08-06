import React, { useState } from 'react'
import { Typography, theme, Grid, Modal, Drawer, Badge } from 'antd'
import { Link } from 'react-router-dom'

const { Text, Title } = Typography
const { useBreakpoint } = Grid

export default function SplitCard({
  title,
  icon: Icon,
  children,
  leftPanelWidth = '30%',
  rightPanelWidth = '60%',
  style = {},
  showDivider = true,
  // Link list functionality
  links = null,
  linkColor = null,
  // Remove right panel padding
  noRightPanelPadding = false,
  // Extra text to display below links
  extraText = null,
  // Status badge
  statusBadge = null,
  // Loading state
  loading = false,
  // Refresh callback
  onRefresh = null,
}) {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const isMobileLayout = !screens.xs
  const isMobileModal = !screens.lg
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState(null)
  const [modalLinkColor, setModalLinkColor] = useState(null)

  const linkColorValue = linkColor === 'error' ? token.colorError :
                         linkColor === 'warning' ? token.colorWarning :
                         linkColor === 'success' ? token.colorSuccess :
                         (linkColor || token.colorLink)

  const renderLinks = () => {
    if (!links || links.length === 0) {
      return children
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {links.map((link, index) => {
          const getLinkColor = () => {
            if (link.linkColor) {
              return link.linkColor === 'error' ? token.colorError :
                     link.linkColor === 'warning' ? token.colorWarning :
                     link.linkColor === 'success' ? token.colorSuccess :
                     token.colorLink
            }
            return linkColorValue
          }

          return (
            <div
              key={index}
              role={link.modalContent ? 'button' : undefined}
              tabIndex={link.modalContent ? 0 : undefined}
              style={{ 
                cursor: link.modalContent ? 'pointer' : 'default',
              }}
              onClick={() => {
                if (link.modalContent) {
                  setModalContent(link.modalContent)
                  setModalLinkColor(link.useErrorColor === false ? null : getLinkColor())
                  setModalOpen(true)
                }
              }}
              onKeyDown={(e) => {
                if (link.modalContent && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  setModalContent(link.modalContent)
                  setModalLinkColor(link.useErrorColor === false ? null : getLinkColor())
                  setModalOpen(true)
                }
              }}
            >
              <Text style={{ 
                textDecoration: link.modalContent ? 'underline' : 'none',
                color: link.modalContent ? (link.useErrorColor === false ? token.colorLink : getLinkColor()) : token.colorText
              }}>
                {link.count} {link.text}
              </Text>
            </div>
          )
        })}
      </div>
    )
  }

  const renderModalContent = () => {
    if (!modalContent) return null

    const WrapperComponent = isMobileModal ? Drawer : Modal
    const wrapperProps = isMobileModal
      ? {
          title: modalContent.title,
          open: modalOpen,
          onClose: () => setModalOpen(false),
          placement: 'bottom',
          width: '100%',
          height: '100%',
          styles: { body: { padding: 0 } },
        }
      : {
          title: modalContent.title,
          open: modalOpen,
          onCancel: () => setModalOpen(false),
          footer: null,
          width: 600,
          style: { top: 20 },
        }

    return (
      <WrapperComponent {...wrapperProps}>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[...modalContent.items].sort((a, b) => a.text.localeCompare(b.text)).map((listItem, index) => {
            const content = listItem.to ? (
              <Link to={listItem.to} style={{ textDecoration: 'underline', color: modalLinkColor || token.colorLink }}>
                {listItem.text}
              </Link>
            ) : (
              <Text>{listItem.text}</Text>
            )
            return <div key={index}>{content}</div>
          })}
        </div>
      </WrapperComponent>
    )
  }

  return (
    <>
      <div
        style={{
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          overflow: 'hidden',
          backgroundColor: token.colorBgContainer,
          ...style,
        }}
      >
        <div style={{ display: 'flex', flexDirection: isMobileLayout ? 'row' : 'column', height: '100%' }}>
          <div
            style={{
              flex: isMobileLayout ? `0 0 ${leftPanelWidth}` : 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: isMobileLayout ? 'flex-end' : 'flex-start',
              padding: '16px',
              paddingTop: '36px',
              borderBottom: !isMobileLayout && showDivider ? `1px solid ${token.colorBorderSecondary}` : 'none',
            }}
          >
            {Icon && (
              <Icon
                style={{
                  fontSize: 20,
                  color: token.colorTextSecondary,
                  marginBottom: 8,
                }}
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text style={{ marginBottom: 0}}>{title}</Text>
              {statusBadge && (
                <Badge
                  count={statusBadge.text}
                  style={{
                    backgroundColor: statusBadge.color,
                    fontSize: 11,
                    padding: '0 6px',
                    height: 20,
                    lineHeight: '20px',
                  }}
                  icon={statusBadge.icon && <statusBadge.icon style={{ fontSize: 10 }} />}
                />
              )}
            </div>
            {onRefresh && (
              <div style={{ marginTop: 8 }}>
                <Text
                  style={{ 
                    fontSize: 12, 
                    color: token.colorLink, 
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                  onClick={onRefresh}
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </Text>
              </div>
            )}
          </div>
          <div
            style={{
              flex: isMobileLayout ? rightPanelWidth : 1,
              display: 'flex',
              flexDirection: 'column',
              padding: noRightPanelPadding ? 0 : '16px',
              borderLeft: isMobileLayout && showDivider ? `1px solid ${token.colorBorderSecondary}` : 'none',
            }}
          >
            {renderLinks()}
            {extraText && (
              <Text style={{ paddingTop: '8px' }}>
                {extraText}
              </Text>
            )}
          </div>
        </div>
      </div>
      {renderModalContent()}
    </>
  )
}
