import { useState } from 'react'
import { Typography, theme, Grid, Modal, Drawer, Skeleton } from 'antd'
import { Link } from 'react-router-dom'
const { Text } = Typography
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
  // Loading state
  loading = false,
  // Make whole card clickable
  to = null,
  // onClick handler for custom click behavior
  onClick = null,
  // Description text for the right panel
  description = null,
  // Make entire card clickable (both panels)
  clickable = false,
  // Text to show on hover
  hoverText = null,
  // Custom render function for right panel
  renderRightPanel = null,
  // Disable border hover behavior
  disableBorderBehavior = false,
}) {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const isMobileLayout = !screens.xs
  const isMobileModal = !screens.lg
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState(null)
  const [modalLinkColor, setModalLinkColor] = useState(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isLeftPanelHovered, setIsLeftPanelHovered] = useState(false)

  const linkColorValue = linkColor === 'error' ? token.colorError :
                         linkColor === 'warning' ? token.colorWarning :
                         linkColor === 'success' ? token.colorSuccess :
                         (linkColor || token.colorLink)

  const renderLinks = () => {
    if (!links || links.length === 0) {
      if (description) {
        return (
          <Text
            style={{
              display: 'block',
              fontSize: 14,
              lineHeight: 1.5,
              color: token.colorText,
            }}
          >
            {description}
          </Text>
        )
      }
      return children
    }

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridAutoRows: '1fr',
        gap: '1px',
        background: token.colorBorderSecondary,
        flex: isMobileLayout ? 1 : 'none',
        height: isMobileLayout ? '100%' : 'auto',
      }}>
        {links.map((link, index) => {
          const getLinkColor = () => {
            if (link.linkColor) {
              return link.linkColor === 'error' ? token.colorError :
                     link.linkColor === 'warning' ? token.colorWarning :
                     link.linkColor === 'success' ? token.colorSuccess :
                     (link.linkColor || token.colorLink)
            }
            return linkColorValue
          }

          return (
            <div
              key={index}
              role={link.modalContent ? 'button' : undefined}
              tabIndex={link.modalContent ? 0 : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: link.linkColor === 'error' ? token.colorErrorBgSubtle :
                           link.linkColor === 'warning' ? token.colorWarningBgSubtle :
                           token.colorBgContainer,
                cursor: link.modalContent ? 'pointer' : 'default',
                transition: link.modalContent ? 'all 0.2s' : 'none',
                ...(links.length % 2 !== 0 && index === links.length - 1 ? { gridColumn: 'span 2' } : {}),
              }}
              onClick={(e) => {
                e.stopPropagation()
                if (link.modalContent) {
                  setModalContent(link.modalContent)
                  setModalLinkColor(getLinkColor())
                  setModalOpen(true)
                }
              }}
              onKeyDown={(e) => {
                if (link.modalContent && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  e.stopPropagation()
                  setModalContent(link.modalContent)
                  setModalLinkColor(getLinkColor())
                  setModalOpen(true)
                }
              }}
              onMouseEnter={(e) => {
                if (link.modalContent) {
                  e.currentTarget.style.background = token.colorFillSecondary
                }
              }}
              onMouseLeave={(e) => {
                if (link.modalContent) {
                  e.currentTarget.style.background = link.linkColor === 'error' ? token.colorErrorBgSubtle :
                                                     link.linkColor === 'warning' ? token.colorWarningBgSubtle :
                                                     token.colorBgContainer
                }
              }}
            >
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: link.linkColor === 'error' ? token.colorError :
                           link.linkColor === 'warning' ? token.colorWarning :
                           link.linkColor === 'success' ? token.colorSuccess :
                           link.linkColor === 'gray' ? token.colorTextTertiary :
                           token.colorTextTertiary,
              }} />
              <Text
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.5',
                }}
              >
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
          styles: { 
            body: { padding: 0, background: token.colorBgContainer },
            header: { background: token.colorBgContainer },
          },
        }
      : {
          title: modalContent.title,
          open: modalOpen,
          onCancel: () => setModalOpen(false),
          footer: null,
          width: 600,
          style: { top: 20 },
          styles: {
            header: { background: token.colorBgContainer },
            content: { background: token.colorBgContainer },
            body: { background: token.colorBgContainer },
            container: { background: token.colorBgContainer },
          },
        }

    // Support grouped items structure
    if (modalContent.groups) {
      return (
        <WrapperComponent {...wrapperProps}>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {modalContent.groups.map((group, groupIndex) => (
              <div key={groupIndex} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Text>{group.title}</Text>
                {group.items.map((listItem, itemIndex) => {
                  const content = listItem.to ? (
                    <Link to={listItem.to} style={{ textDecoration: 'underline', color: modalLinkColor || token.colorLink }}>
                      {listItem.text}
                    </Link>
                  ) : (
                    <Text>{listItem.text}</Text>
                  )
                  return <div key={itemIndex} style={{ paddingLeft: 12 }}>{content}</div>
                })}
              </div>
            ))}
          </div>
        </WrapperComponent>
      )
    }

    // Original flat list structure with sorting
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
            
            // Render subItems if they exist
            if (listItem.subItems && listItem.subItems.length > 0) {
              return (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontWeight: 500 }}>{content}</div>
                  <div style={{ paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {listItem.subItems.map((subItem, subIndex) => (
                      <Text key={subIndex} style={{ fontSize: 12, color: token.colorTextSecondary }}>
                        {subItem.text}
                      </Text>
                    ))}
                  </div>
                </div>
              )
            }
            
            return <div key={index}>{content}</div>
          })}
        </div>
      </WrapperComponent>
    )
  }

  const leftPanelContent = (
    <div
      style={{
        flex: isMobileLayout ? `0 0 ${leftPanelWidth}` : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        padding: '16px',
        paddingTop: '16px',
        borderBottom: !isMobileLayout && showDivider ? `1px solid ${token.colorBorderSecondary}` : 'none',
        cursor: (to || onClick) ? 'pointer' : 'default',
        height: '100%',
      }}
      onClick={!clickable ? onClick : undefined}
      role={!clickable && (to || onClick) ? 'button' : undefined}
      tabIndex={!clickable && (to || onClick) ? 0 : undefined}
      onKeyDown={(e) => {
        if (!clickable && onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
      onMouseEnter={screens.lg ? (!clickable ? () => setIsLeftPanelHovered(true) : () => setIsHovered(true)) : undefined}
      onMouseLeave={screens.lg ? (!clickable ? () => setIsLeftPanelHovered(false) : () => setIsHovered(false)) : undefined}
    >
      {Icon && (
        <div
          style={{
            fontSize: 16,
            color: token.colorText,
            border: '1px solid',
            borderColor: token.colorBorder,
            padding: 6,
            height: 32,
            width: 32,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
          }}
        >
          <Icon style={{ fontSize: 16 }} />
        </div>
      )}
      <div style={{ marginBottom: 0 }}>
        <Text
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: '1.5',
            wordBreak: 'keep-all',
            whiteSpace: 'normal',
          }}
        >
          {title}
        </Text>
        {hoverText && (
          <div style={{
            maxHeight: (clickable ? isHovered : isLeftPanelHovered) && screens.lg ? 30 : 0,
            overflow: 'hidden',
            transition: screens.lg ? 'max-height 0.15s ease-out' : 'none',
          }}>
            <Text
              style={{
                display: 'block',
                marginTop: 8,
                color: token.colorPrimary,
                fontSize: 12,
                fontWeight: 500,
                opacity: (clickable ? isHovered : isLeftPanelHovered) && screens.lg ? 1 : 0,
                transform: (clickable ? isHovered : isLeftPanelHovered) && screens.lg ? 'translateY(0)' : 'translateY(10px)',
                transition: screens.lg ? 'opacity 0.15s ease-out, transform 0.15s ease-out' : 'none',
              }}
            >
              {hoverText}
            </Text>
          </div>
        )}
      </div>
    </div>
  )

  const leftPanelWrapper = to ? (
    <Link
      to={to}
      style={{
        textDecoration: 'none',
        flex: isMobileLayout ? `0 0 ${leftPanelWidth}` : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        height: isMobileLayout ? '100%' : 'auto',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          padding: '16px',
          paddingTop: '16px',
          borderBottom: !isMobileLayout && showDivider ? `1px solid ${token.colorBorderSecondary}` : 'none',
          cursor: 'pointer',
          width: '100%',
          height: isMobileLayout ? '100%' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        }}
        onMouseEnter={screens.lg ? (!clickable ? () => setIsLeftPanelHovered(true) : () => setIsHovered(true)) : undefined}
        onMouseLeave={screens.lg ? (!clickable ? () => setIsLeftPanelHovered(false) : () => setIsHovered(false)) : undefined}
      >
        {Icon && (
          <div
            style={{
              fontSize: 16,
              color: token.colorText,
              border: '1px solid',
              borderColor: token.colorBorder,
              padding: 6,
              height: 32,
              width: 32,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
            }}
          >
            <Icon style={{ fontSize: 16 }} />
          </div>
        )}
        <div style={{ marginBottom: 0 }}>
          <Text
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: '1.5',
              wordBreak: 'keep-all',
              whiteSpace: 'normal',
            }}
          >
            {title}
          </Text>
  
        </div>
      </div>
    </Link>
  ) : onClick ? (
    <div
      style={{
        flex: isMobileLayout ? `0 0 ${leftPanelWidth}` : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        height: isMobileLayout ? 'auto' : '100%',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          padding: '16px',
          paddingTop: '16px',
          borderBottom: !isMobileLayout && showDivider ? `1px solid ${token.colorBorderSecondary}` : 'none',
          cursor: 'pointer',
          width: '100%',
          height: isMobileLayout ? 'auto' : '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        }}
        onClick={(e) => {
          e.stopPropagation()
          onClick(e)
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            onClick(e)
          }
        }}
        onMouseEnter={screens.lg ? (!clickable ? () => setIsLeftPanelHovered(true) : () => setIsHovered(true)) : undefined}
        onMouseLeave={screens.lg ? (!clickable ? () => setIsLeftPanelHovered(false) : () => setIsHovered(false)) : undefined}
      >
        {Icon && (
          <div
            style={{
              fontSize: 16,
              color: token.colorText,
              border: '1px solid',
              borderColor: token.colorBorder,
              padding: 6,
              height: 32,
              width: 32,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
            }}
          >
            <Icon style={{ fontSize: 16 }} />
          </div>
        )}
        <div style={{ marginBottom: 0 }}>
          <Text
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: '1.5',
              wordBreak: 'keep-all',
              whiteSpace: 'normal',
            }}
          >
            {title}
          </Text>
  
        </div>
      </div>
    </div>
  ) : leftPanelContent

  const cardContent = (
    <div
      style={{
        border: !disableBorderBehavior && ((clickable && isHovered && screens.lg) || (!clickable && isLeftPanelHovered && screens.lg))
          ? `1px solid ${token.colorPrimary}`
          : `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        overflow: 'hidden',
        backgroundColor: token.colorBgContainer,
        cursor: clickable ? 'pointer' : 'default',
        transition: !disableBorderBehavior && screens.lg ? 'border-color 0.2s, box-shadow 0.2s, transform 0.2s' : 'none',
        boxShadow: !disableBorderBehavior && ((clickable && isHovered && screens.lg) || (!clickable && isLeftPanelHovered && screens.lg))
          ? token.boxShadowCard
          : 'none',
        transform: !disableBorderBehavior && ((clickable && isHovered && screens.lg) || (!clickable && isLeftPanelHovered && screens.lg))
          ? 'scale(1.02)'
          : 'scale(1)',
        position: 'relative',
        ...style,
      }}
      onClick={(e) => {
        if (clickable && onClick) {
          onClick(e)
        }
      }}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (clickable && onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
      onMouseEnter={screens.lg && clickable ? () => setIsHovered(true) : undefined}
      onMouseLeave={screens.lg && clickable ? () => setIsHovered(false) : undefined}
    >
      {clickable && hoverText && (
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          maxHeight: isHovered && screens.lg ? 30 : 0,
          overflow: 'hidden',
          transition: screens.lg ? 'max-height 0.15s ease-out' : 'none',
          zIndex: 1,
        }}>
          <Text
            style={{
              color: token.colorPrimary,
              fontSize: 12,
              fontWeight:500,
              opacity: isHovered && screens.lg ? 1 : 0,
              transform: isHovered && screens.lg ? 'translateY(0)' : 'translateY(10px)',
              transition: screens.lg ? 'opacity 0.15s ease-out, transform 0.15s ease-out' : 'none',
            }}
          >
            {hoverText}
          </Text>
        </div>
      )}
      {!clickable && hoverText && (
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          maxHeight: isLeftPanelHovered && screens.lg ? 30 : 0,
          overflow: 'hidden',
          transition: screens.lg ? 'max-height 0.15s ease-out' : 'none',
          zIndex: 1,
        }}>
          <Text
            style={{
              color: token.colorPrimary,
              fontSize: 12,
              fontWeight: 500,
              opacity: isLeftPanelHovered && screens.lg ? 1 : 0,
              transform: isLeftPanelHovered && screens.lg ? 'translateY(0)' : 'translateY(10px)',
              transition: screens.lg ? 'opacity 0.15s ease-out, transform 0.15s ease-out' : 'none',
            }}
          >
            {hoverText}
          </Text>
        </div>
      )}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: isMobileLayout ? 'row' : 'column', height: isMobileLayout ? 'auto' : '100%', minHeight: isMobileLayout ? 'auto' : '100%', alignItems: 'stretch' }}>
            {to ? (
              <Link
                to={to}
                style={{
                  textDecoration: 'none',
                  flex: isMobileLayout ? `0 0 ${leftPanelWidth}` : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  height: '100%',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    padding: '16px',
                    paddingTop: '36px',
                    borderBottom: !isMobileLayout && showDivider ? `1px solid ${token.colorBorderSecondary}` : 'none',
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                  }}
                  onMouseEnter={screens.lg ? (!clickable ? () => setIsLeftPanelHovered(true) : () => setIsHovered(true)) : undefined}
                  onMouseLeave={screens.lg ? (!clickable ? () => setIsLeftPanelHovered(false) : () => setIsHovered(false)) : undefined}
                >
                  <div style={{ marginBottom: 8 }}>
                    <Skeleton.Input size="small" style={{ width: 32, height: 32 }} active />
                  </div>
                  <div>
                    <Skeleton.Input size="small" style={{ width: 100 }} active />
                  </div>
                </div>
              </Link>
            ) : (
              <div
                style={{
                  flex: isMobileLayout ? `0 0 ${leftPanelWidth}` : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  padding: '16px',
                  paddingTop: '36px',
                  borderBottom: !isMobileLayout && showDivider ? `1px solid ${token.colorBorderSecondary}` : 'none',
                  height: '100%',
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  <Skeleton.Input size="small" style={{ width: 32, height: 32 }} active />
                </div>
                <div>
                  <Skeleton.Input size="small" style={{ width: 100, height: 42 }} active />
                </div>
              </div>
            )}
            <div
              style={{
                flex: isMobileLayout ? rightPanelWidth : 1,
                display: 'flex',
                flexDirection: 'column',
                padding: (noRightPanelPadding || links) ? 0 : '16px',
                borderLeft: isMobileLayout && showDivider ? `1px solid ${token.colorBorderSecondary}` : 'none',
              }}
            >
              <Skeleton paragraph={{ rows: 3 }} active />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: isMobileLayout ? 'row' : 'column', height: '100%', minHeight: isMobileLayout ? 'auto' : '100%', alignItems: 'stretch' }}>
            {leftPanelWrapper}
            <div
              style={{
                flex: isMobileLayout ? rightPanelWidth : 1,
                display: 'flex',
                flexDirection: 'column',
                padding: (noRightPanelPadding || links) ? 0 : '16px',
                borderLeft: isMobileLayout && showDivider ? `1px solid ${token.colorBorderSecondary}` : 'none',
                minHeight: isMobileLayout ? 'auto' : '100%',
                overflow: 'visible',
              }}
              onMouseEnter={screens.lg && !clickable ? (e) => {
                e.stopPropagation()
                setIsLeftPanelHovered(false)
              } : undefined}
              onMouseLeave={screens.lg && !clickable ? (e) => {
                e.stopPropagation()
              } : undefined}
            >
              {renderRightPanel ? renderRightPanel({ token, screens, isMobileLayout }) : (
                <>
                  {renderLinks()}
                  {extraText && (
                    <Text style={{ paddingTop: '8px' }}>
                      {extraText}
                    </Text>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
  )

  return (
    <>
      {cardContent}
      {renderModalContent()}
    </>
  )
}
