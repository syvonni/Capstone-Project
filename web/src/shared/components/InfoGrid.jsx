import { Typography, Card, Divider, Button, theme, Modal, Drawer, Grid } from 'antd'
import { Link } from 'react-router-dom'
import { useState } from 'react'

const { Text } = Typography
const { useBreakpoint } = Grid

export default function InfoGrid({ items = [], style, cardStyle, size = '', noPadding = false, title, titleTo, titleIcon }) {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState(null)

  // Group items by dividers
  const itemGroups = []
  let currentGroup = []

  items.forEach((item, index) => {
    if (item.type === 'divider' || item.type === 'verticalDivider') {
      if (currentGroup.length > 0) {
        if (item.type === 'verticalDivider') {
          // Mark this group as consumed by the upcoming vertical divider
          itemGroups.push({ items: currentGroup, type: 'horizontal', consumedByVertical: true })
        } else {
          itemGroups.push({ items: currentGroup, type: 'horizontal' })
        }
        currentGroup = []
      }
      if (item.type === 'verticalDivider') {
        itemGroups.push({ type: 'vertical', splitRatio: item.splitRatio })
      } else {
        // Always push regular dividers, even if group was empty
        itemGroups.push({ type: 'divider' })
      }
    } else {
      currentGroup.push({ item, index })
    }
  })
  if (currentGroup.length > 0) {
    // Check if the last group was a vertical divider
    const lastGroup = itemGroups[itemGroups.length - 1]
    if (lastGroup && lastGroup.type === 'vertical') {
      // Mark this group as consumed by vertical divider
      itemGroups.push({ items: currentGroup, type: 'horizontal', consumedByVertical: true })
    } else {
      itemGroups.push({ items: currentGroup, type: 'horizontal' })
    }
  }


  // Check if item should be full width (description, card, or complex value)
  const isFullWidth = (item) => {
    if (item.fullWidth) return true
    if (item.label === 'Description' || item.label === 'Notes') return true
    if (typeof item.value === 'object' && item.value !== null && !Array.isArray(item.value)) return true
    if (item.type === 'card' || item.type === 'emptyCard' || item.type === 'sublist') return true
    return false
  }

  // Handle click for modalContent items
  const handleModalContentClick = (item) => {
    if (item.type === 'modalContent' && item.content) {
      setModalContent(item.content)
      setModalOpen(true)
    }
  }

  // Common grid style for item groups
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
    gap: '16px',
    width: '100%',
  }

  // Render a single info item (label + value)
  const renderItem = (item) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {item.icon && (
          <span
            style={{
              fontSize: 16,
              color: token.colorText,
              border: '1px solid',
              borderColor: token.colorBorder,
              padding: 6,
              height: 36,
              width: 36,
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {item.icon}
          </span>
        )}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>{item.label}</Text>
          <div style={typeof item.value === 'string' || typeof item.value === 'number' ? { wordBreak: 'break-word' } : {}}>
            {item.value !== undefined && item.value !== null ? (
            item.to ? (
              <Link
                to={item.to}
                style={{
                  textDecoration: 'underline',
                  color: token.colorLink,
                }}
              >
                {typeof item.value === 'string' || typeof item.value === 'number' ? item.value : item.value}
              </Link>
            ) : item.onClick ? (
              <Button
                type="link"
                size="small"
                onClick={item.onClick}
                style={{
                  padding: 0,
                  height: 'auto',
                  textDecoration: 'underline',
                }}
              >
                {typeof item.value === 'string' || typeof item.value === 'number' ? item.value : item.value}
              </Button>
            ) : item.type === 'modalContent' ? (
              <Button
                type="link"
                size="small"
                onClick={() => handleModalContentClick(item)}
                style={{
                  padding: 0,
                  height: 'auto',
                  textDecoration: 'underline',
                }}
              >
                {typeof item.value === 'string' || typeof item.value === 'number' ? item.value : item.value}
              </Button>
            ) : item.link ? (
              <Button
                type="link"
                size="small"
                href={item.link}
                target={item.linkTarget || '_blank'}
                rel="noopener noreferrer"
                style={{
                  padding: 0,
                  height: 'auto',
                  textDecoration: 'underline',
                }}
              >
                {typeof item.value === 'string' || typeof item.value === 'number' ? item.value : item.value}
              </Button>
            ) : typeof item.value === 'string' || typeof item.value === 'number' ? (
              <Text>{item.value}</Text>
            ) : (
              item.value
            )
          ) : (
            <Text strong>N/A</Text>
          )}
          </div>
        </div>
      </div>
    )
  }

  // Render a single card item
  const renderCard = (item) => {
    if (item.type === 'custom') {
      return item.content
    }

    if (item.type === 'modalContent') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {item.content?.title && (
            <Text>{item.content.title}</Text>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {item.content?.items && item.content.items.length > 0 ? (
              item.content.items.map((listItem, index) => {
                const content = listItem.to ? (
                  <Link to={listItem.to} style={{ textDecoration: 'underline', color: token.colorLink }}>
                    {listItem.text}
                  </Link>
                ) : (
                  <Text>{listItem.text}</Text>
                )

                return (
                  <span key={index}>
                    {content}
                    {listItem.suffix && ` ${listItem.suffix}`}
                  </span>
                )
              })
            ) : (
              <Text type="secondary">No items to display.</Text>
            )}
          </div>
        </div>
      )
    }

    if (item.type === 'card') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {item.title && (
            <Text>{item.title}</Text>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {item.cards && item.cards.length > 0 ? (
              item.cards.map((card, index) => {
                const isFirst = index === 0
                const isLast = index === item.cards.length - 1
                const borderRadius = isFirst && isLast ? '8px' : isFirst ? '8px 8px 0 0' : isLast ? '0 0 8px 8px' : '0'

                const titleContent = card.to ? (
                  <Link to={card.to} style={{ textDecoration: 'underline', color: token.colorLink }}>
                    {card.title}
                  </Link>
                ) : (
                  <Text>{card.title}</Text>
                )

                return (
                  <div
                    key={index}
                    style={{
                      padding: 12,
                      border: `1px solid ${token.colorBorderSecondary}`,
                      borderRadius,
                      background: token.colorBgContainer,
                      ...(index < item.cards.length - 1 && { borderBottom: 'none' }),
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: card.subtitle ? 4 : 0 }}>
                      {titleContent}
                    </div>
                    {card.subtitle && (
                      <Text type="secondary" style={{ fontSize: 12 }}>{card.subtitle}</Text>
                    )}
                  </div>
                )
              })
            ) : (
              <div
                style={{
                  padding: 12,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: 8,
                  background: token.colorBgContainer,
                }}
              >
                <Text type="secondary">No items to display.</Text>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (item.type === 'sublist') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column'}}>
          {item.title && (
            <Text type="secondary" style={{ fontSize: 12 }}>{item.title}</Text>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {item.items && item.items.length > 0 ? (
              item.items.map((listItem, index) => {
                const content = listItem.to ? (
                  <Link to={listItem.to} style={{ textDecoration: 'underline', color: token.colorLink }}>
                    {listItem.text}
                  </Link>
                ) : (
                  <Text>{listItem.text}</Text>
                )

                return (
                  <span key={index}>
                    {content}
                    {listItem.suffix && ` ${listItem.suffix}`}
                  </span>
                )
              })
            ) : (
              <Text type="secondary">No items to display.</Text>
            )}
          </div>
        </div>
      )
    }

    if (item.type === 'emptyCard') {
      return (
        <div
          style={{
            padding: 12,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: 8,
            background: token.colorBgContainer,
          }}
        >
          <Text type="secondary">{item.message}</Text>
        </div>
      )
    }

    return null
  }

  const cardContent = (
    <Card size={size} style={{ margin: noPadding ? 0 : 16, ...cardStyle, width: '100%', boxSizing: 'border-box' }}>
      <div style={{ ...style, width: '100%', boxSizing: 'border-box' }}>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 0 }}>
            {titleIcon && (
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
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {titleIcon}
              </span>
            )}
            <Text>{title}</Text>
          </div>
        )}
        {itemGroups.map((group, groupIndex) => {
          if (group.type === 'divider') {
            return <Divider key={groupIndex} style={{ margin: '16px 0' }} />
          }

          if (group.type === 'vertical') {
            // Find the previous horizontal group (left side) and next horizontal group (right side)
            const prevGroup = itemGroups[groupIndex - 1]
            const nextGroup = itemGroups[groupIndex + 1]

            if (!prevGroup || !nextGroup || prevGroup.type !== 'horizontal' || nextGroup.type !== 'horizontal') {
              return null
            }

            // Get split ratio from the vertical divider item (default: 1 for equal split)
            const splitRatio = itemGroups[groupIndex].splitRatio || 1

            return (
              <div key={groupIndex} style={{ display: 'flex', gap: '16px' }}>
                {/* Left side - previous horizontal group */}
                <div style={{ flex: splitRatio }}>
                  <div style={gridStyle}>
                    {prevGroup.items.map(({ item, index }) => (
                      <div
                        key={index}
                        style={{
                          gridColumn: isFullWidth(item) ? '1 / -1' : 'auto',
                        }}
                      >
                        {item.type === 'card' || item.type === 'emptyCard' || item.type === 'sublist' || item.type === 'custom' ? (
                          renderCard(item)
                        ) : (
                          renderItem(item)
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vertical divider line */}
                <Divider type="vertical" style={{ height: 'auto' }} />

                {/* Right side - next horizontal group */}
                <div style={{ flex: 1 }}>
                  <div style={gridStyle}>
                    {nextGroup.items.map(({ item, index }) => (
                      <div
                        key={index}
                        style={{
                          gridColumn: isFullWidth(item) ? '1 / -1' : 'auto',
                        }}
                      >
                        {item.type === 'card' || item.type === 'emptyCard' || item.type === 'sublist' || item.type === 'custom' ? (
                          renderCard(item)
                        ) : (
                          renderItem(item)
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          }

          if (group.type === 'horizontal') {
            // Skip if this group was already rendered as part of a vertical split
            if (group.consumedByVertical) {
              return null
            }

            return (
              <div key={groupIndex}>
                <div style={gridStyle}>
                  {group.items.map(({ item, index }) => (
                    <div
                      key={index}
                      style={{
                        gridColumn: isFullWidth(item) ? '1 / -1' : 'auto',
                      }}
                    >
                      {item.type === 'card' || item.type === 'emptyCard' || item.type === 'sublist' || item.type === 'custom' ? (
                        renderCard(item)
                      ) : (
                        renderItem(item)
                      )}
                    </div>
                  ))}
                </div>
                {groupIndex < itemGroups.length - 1 && itemGroups[groupIndex + 1].type !== 'vertical' && itemGroups[groupIndex + 1].type !== 'divider' && (
                  <Divider style={{ margin: '16px 0' }} />
                )}
              </div>
            )
          }

          return null
        })}
      </div>
    </Card>
  )

  // Render Modal for desktop, Drawer for mobile
  const isMobile = !screens.lg
  const modalDrawerContent = (
    <>
      {isMobile ? (
        <Drawer
          title={modalContent?.title || 'Details'}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          placement="bottom"
        >
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {modalContent?.items && modalContent.items.length > 0 ? (
                [...modalContent.items].sort((a, b) => a.text.localeCompare(b.text)).map((listItem, index) => {
                  const content = listItem.to ? (
                    <Link to={listItem.to} style={{ textDecoration: 'underline', color: token.colorLink }}>
                      {listItem.text}
                    </Link>
                  ) : (
                    <Text>{listItem.text}</Text>
                  )

                  return (
                    <span key={index}>
                      {content}
                      {listItem.suffix && ` ${listItem.suffix}`}
                    </span>
                  )
                })
              ) : (
                <Text type="secondary">No items to display.</Text>
              )}
            </div>
          </div>
        </Drawer>
      ) : (
        <Modal
          title={modalContent?.title || 'Details'}
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          footer={null}
        >
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {modalContent?.items && modalContent.items.length > 0 ? (
                [...modalContent.items].sort((a, b) => a.text.localeCompare(b.text)).map((listItem, index) => {
                  const content = listItem.to ? (
                    <Link to={listItem.to} style={{ textDecoration: 'underline', color: token.colorLink }}>
                      {listItem.text}
                    </Link>
                  ) : (
                    <Text>{listItem.text}</Text>
                  )

                  return (
                    <span key={index}>
                      {content}
                      {listItem.suffix && ` ${listItem.suffix}`}
                    </span>
                  )
                })
              ) : (
                <Text type="secondary">No items to display.</Text>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  )

  return (
    <>
      {titleTo ? (
        <Link to={titleTo} style={{ textDecoration: 'none' }}>
          {cardContent}
        </Link>
      ) : cardContent}
      {modalDrawerContent}
    </>
  )
}
