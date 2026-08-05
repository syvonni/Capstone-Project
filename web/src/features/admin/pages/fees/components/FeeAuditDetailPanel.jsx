import { Typography, Tag, Descriptions, Empty } from 'antd'

const { Text } = Typography

const getCategoryName = (categoryOptions, categoryCode) => {
  const option = categoryOptions.find(opt => opt.value === categoryCode)
  return option?.label || categoryCode
}

const getCategoryNames = (categoryOptions, categoryCodes) => {
  if (!categoryCodes || !Array.isArray(categoryCodes)) return '-'
  return categoryCodes.map(code => getCategoryName(categoryOptions, code)).join(', ')
}

// Helper to combine name and email into "Name (email)" format
function formatAuthor(name, email) {
  if (!name && !email) return null
  if (!email) return name
  if (!name) return email
  return `${name} (${email})`
}

export default function FeeAuditDetailPanel({ audit, categoryOptions = [] }) {
  if (!audit) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="Select an audit log to view details" />
      </div>
    )
  }

  const metadata = audit.metadata || {}

  // Determine entity type from event type
  const isFee = audit.eventType?.startsWith('fee_')
  const isPenaltyFee = audit.eventType?.startsWith('penalty_fee_')
  const isVariableFeeRule = audit.eventType?.startsWith('variable_fee_rule_')
  const isTaxBracket = audit.eventType?.startsWith('tax_bracket_')

  return (
    <div style={{ padding: 16 }}>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="Event Type">
          {audit.eventType || 'Unknown Event'}
        </Descriptions.Item>
        <Descriptions.Item label="Timestamp">
          {new Date(audit.createdAt).toLocaleString()}
        </Descriptions.Item>

        {/* User Information */}
        {(metadata.userName || metadata.userEmail || metadata.updatedByName || metadata.updatedByEmail ||
          metadata.createdByName || metadata.createdByEmail ||
          metadata.deletedByName || metadata.deletedByEmail || metadata.publishedByName) && (
          <Descriptions.Item label="Author">
            {formatAuthor(
              metadata.userName || metadata.updatedByName || metadata.createdByName ||
              metadata.deletedByName || metadata.publishedByName,
              metadata.userEmail || metadata.updatedByEmail || metadata.createdByEmail ||
              metadata.deletedByEmail
            ) || 'Unknown'}
          </Descriptions.Item>
        )}

        {/* Fee Information */}
        {isFee && (
          <>
            <Descriptions.Item label="Name">{metadata.name}</Descriptions.Item>
            <Descriptions.Item label="Amount">₱{metadata.amount}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={metadata.isActive ? 'green' : 'red'}>
                {metadata.isActive ? 'Active' : 'Disabled'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Version">{metadata.version}</Descriptions.Item>
          </>
        )}

        {/* Penalty Fee Information */}
        {isPenaltyFee && (
          <>
            <Descriptions.Item label="Name">{metadata.name}</Descriptions.Item>
            <Descriptions.Item label="Amount">₱{metadata.amount}</Descriptions.Item>
            <Descriptions.Item label="Category">{getCategoryName(categoryOptions, metadata.category)}</Descriptions.Item>
            <Descriptions.Item label="Description">{metadata.description}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={metadata.isActive ? 'green' : 'red'}>
                {metadata.isActive ? 'Active' : 'Disabled'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Version">{metadata.version}</Descriptions.Item>
          </>
        )}

        {/* Variable Fee Rule Information */}
        {isVariableFeeRule && (
          <>
            <Descriptions.Item label="Name">{metadata.name}</Descriptions.Item>
            <Descriptions.Item label="Calculation Method">{metadata.calculationMethod?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '-'}</Descriptions.Item>
            <Descriptions.Item label="Base Rate">₱{metadata.baseRate}</Descriptions.Item>
            <Descriptions.Item label="Unit">{metadata.unit}</Descriptions.Item>
            <Descriptions.Item label="Categories">{getCategoryNames(categoryOptions, metadata.categories)}</Descriptions.Item>
            <Descriptions.Item label="Question">{metadata.question || '-'}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={metadata.isActive ? 'green' : 'red'}>
                {metadata.isActive ? 'Active' : 'Disabled'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Version">{metadata.version}</Descriptions.Item>
          </>
        )}

        {/* Tax Bracket Information */}
        {isTaxBracket && (
          <>
            <Descriptions.Item label="Category">{getCategoryName(categoryOptions, metadata.category)}</Descriptions.Item>
            <Descriptions.Item label="Tax Basis">{metadata.taxBasis?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '-'}</Descriptions.Item>
            <Descriptions.Item label="Name">{metadata.name}</Descriptions.Item>
            <Descriptions.Item label="Min Value">₱{metadata.minValue?.toLocaleString() || '-'}</Descriptions.Item>
            <Descriptions.Item label="Max Value">{metadata.maxValue ? `₱${metadata.maxValue.toLocaleString()}` : 'Unlimited'}</Descriptions.Item>
            <Descriptions.Item label="Fixed Amount">{metadata.fixedAmount ? `₱${metadata.fixedAmount.toLocaleString()}` : '-'}</Descriptions.Item>
            <Descriptions.Item label="Excess Rate">{metadata.excessRate ? `${(metadata.excessRate * 100).toFixed(2)}%` : '-'}</Descriptions.Item>
            <Descriptions.Item label="Excess Rate Type">{metadata.excessRateType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '-'}</Descriptions.Item>
            <Descriptions.Item label="Notes">{metadata.notes || '-'}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={metadata.isActive ? 'green' : 'red'}>
                {metadata.isActive ? 'Active' : 'Disabled'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Version">{metadata.version}</Descriptions.Item>
          </>
        )}
      </Descriptions>
    </div>
  )
}
