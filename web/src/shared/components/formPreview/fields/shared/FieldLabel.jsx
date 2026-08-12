import { Typography } from 'antd'

const { Text } = Typography

export function FieldLabel({ field, token, reason }) {
  return (
    <span>
      {reason && (
        <Text
          type="secondary"
          style={{
            fontSize: 12,
            display: 'block',
            fontWeight: 'normal',
            marginBottom: 4,
            color: token.colorVolcano,
          }}
        >
          Requested Change: {reason}
        </Text>
      )}
      <span style={{ display: 'block', marginBottom: field.helpText ? 2 : 0 }}>
        {field.label || '(Untitled field)'}
        {field.required && <span style={{ color: token.colorError, marginLeft: 4 }}>*</span>}
      </span>
      {field.helpText && (
        <Text
          type="secondary"
          style={{
            fontSize: 12,
            display: 'block',
            fontWeight: 'normal',
            marginTop: 2,
          }}
        >
          {field.helpText}
        </Text>
      )}
    </span>
  )
}
