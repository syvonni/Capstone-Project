import { Card, Tag, Typography, theme } from 'antd'
import { StarFilled } from '@ant-design/icons'

const { Text } = Typography

export default function PanelCard({
  item: _item,
  selected = false,
  onClick,
  title,
  description,
  metaInfo = [],
  tags = [],
  isBookmarked = false,
}) {
  const { token } = theme.useToken()

  const card = (
    <Card
      size="small"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        position: 'relative',
        background: token.colorBgContainer,
        boxShadow: selected ? `0 0 0 2px ${token.colorPrimaryBg}20, 0 2px 8px ${token.colorPrimary}15` : undefined,
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = token.colorPrimaryBorder
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = ''
      }}
    >
      {isBookmarked && (
        <StarFilled
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            color: token.colorWarning,
            fontSize: 12,
            zIndex: 1,
          }}
        />
      )}
      {title && (
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, paddingRight: isBookmarked ? 20 : 0, color: token.colorText }}>
          {title}
        </div>
      )}
      {description && (
        <div
          style={{
            fontSize: 13,
            lineHeight: '1.5em',
            maxHeight: '3em',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: 12,
            color: token.colorTextSecondary,
          }}
        >
          {description}
        </div>
      )}
      {metaInfo.length > 0 && (
        <div style={{ marginTop: description ? 12 : 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {metaInfo.map((meta, idx) => (
            <Text key={idx} type="secondary" style={{ fontSize: 12, lineHeight: '1.2em' }}>
              {meta.label}: {meta.value}
            </Text>
          ))}
        </div>
      )}
      {tags.length > 0 && (
        <div style={{ marginTop: (description || metaInfo.length > 0) ? 12 : 0, paddingTop: 10, borderTop: `1px solid ${token.colorBorderSecondary}`, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tags.map((tag, idx) => (
            <Tag key={idx} color={tag.color} style={{ margin: 0, fontSize: 11, textTransform: tag.textTransform || 'none' }}>
              {tag.label}
            </Tag>
          ))}
        </div>
      )}
    </Card>
  )

  return card
}
