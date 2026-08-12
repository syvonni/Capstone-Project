import React, { useState, useCallback, useEffect } from 'react'
import { Card, Button, Space, Spin, Empty, theme, Grid, Typography } from 'antd'

const { Text } = Typography
const { useBreakpoint } = Grid

export default function ListCard({
  icon,
  title,
  items,
  fetchItems,
  renderItem,
  onItemClick,
  onViewAll,
  viewAllText = 'View all',
  itemTypeText = 'items',
  loading: externalLoading,
  emptyText = 'No items',
  headerExtra,
}) {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const [internalLoading, setInternalLoading] = useState(false)
  const [internalItems, setInternalItems] = useState([])

  const loading = externalLoading !== undefined ? externalLoading : internalLoading
  const displayItems = items !== undefined ? items : internalItems

  const handleFetch = useCallback(async () => {
    if (!fetchItems) return
    setInternalLoading(true)
    try {
      const result = await fetchItems()
      setInternalItems(result || [])
    } catch (error) {
      console.error('Failed to fetch items:', error)
      setInternalItems([])
    } finally {
      setInternalLoading(false)
    }
  }, [fetchItems])

  useEffect(() => {
    if (fetchItems) {
      handleFetch()
    }
  }, [fetchItems, handleFetch])

  return (
    <Card
      size="small"
      style={{
        width: '100%',
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorder}`,
        borderRadius: token.borderRadiusLG,
      }}
      styles={{
        body: { padding: screens.lg ? '16px 16px 16px 16px' : '12px', paddingTop: screens.lg ? 90 : 48 }
      }}
    >
      {/* Card Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {icon && (
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
            }}
          >
            {React.cloneElement(icon, { style: { fontSize: 16 } })}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          {headerExtra}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
          <Spin size="small" />
        </div>
      ) : displayItems.length === 0 ? (
        <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '20px 0' }} />
      ) : (
        <Space.Compact orientation="vertical" style={{ width: '100%' }}>
          {displayItems.slice(0, 3).map((item, index) => (
            <Button
              key={index}
              type="default"
              size="small"
              onClick={() => onItemClick?.(item)}
              style={{
                textAlign: 'left',
                height: 'auto',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                justifyContent: 'flex-start',
              }}
            >
              {renderItem(item)}
            </Button>
          ))}
          {onViewAll && (
            <Button
              type="default"
              size="small"
              onClick={onViewAll}
              style={{
                textAlign: 'left',
                height: 'auto',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                justifyContent: 'flex-start',
              }}
            >
              <span style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
                display: 'block',
              }}>
                {viewAllText} {displayItems.length} {itemTypeText} →
              </span>
            </Button>
          )}
        </Space.Compact>
      )}
    </Card>
  )
}
