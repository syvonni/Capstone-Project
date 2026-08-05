import { Typography, Button, Card, Divider, Tooltip } from 'antd'
import { DeleteOutlined, BuildOutlined, EditOutlined } from '@ant-design/icons'
import { LINE_OF_BUSINESS_BY_TAX_CODE } from '@/shared/constants/lineOfBusiness'

const { Text } = Typography

const INDUSTRY_ICONS = {
  'RET': <BuildOutlined style={{ fontSize: 36 }} />,
  'WHL': <BuildOutlined style={{ fontSize: 36 }} />,
  'FDS': <BuildOutlined style={{ fontSize: 36 }} />,
  'MFG': <BuildOutlined style={{ fontSize: 36 }} />,
  'SVC': <BuildOutlined style={{ fontSize: 36 }} />,
  'FIN': <BuildOutlined style={{ fontSize: 36 }} />,
  'RES': <BuildOutlined style={{ fontSize: 36 }} />,
  'TRN': <BuildOutlined style={{ fontSize: 36 }} />,
  'AGR': <BuildOutlined style={{ fontSize: 36 }} />,
  'CON': <BuildOutlined style={{ fontSize: 36 }} />,
  'MIN': <BuildOutlined style={{ fontSize: 36 }} />,
  'UTL': <BuildOutlined style={{ fontSize: 36 }} />,
}

export default function IndustryCard({
  taxCode,
  lobs,
  industryDetailedLines,
  lobAllocatedCapital,
  savedVariableInputs,
  allVariables,
  taxBrackets,
  token,
  onRemoveIndustry,
  onRemoveLineOfBusiness,
  onAddLineOfBusiness,
  onEditLineOfBusiness,
  getClassificationForCapital,
  isEditMode = false,
}) {
  const categoryMapping = LINE_OF_BUSINESS_BY_TAX_CODE[taxCode]
  const categoryLabel = categoryMapping?.name || taxCode
  const categoryDescription = categoryMapping?.description || ''

  return (
    <div style={{ marginBottom: 12 }}>
      <Card
        style={{
          border: `1px solid ${token.colorBorder}`,
          backgroundColor: token.colorBgContainer,
        }}
        bodyStyle={{ padding: 12 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: token.colorBgLayout,
            borderRadius: 8,
            color: token.colorTextSecondary,
            flexShrink: 0,
          }}>
            {INDUSTRY_ICONS[taxCode] || <BuildOutlined style={{ fontSize: 36 }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ display: 'block' }}>
              {categoryLabel}
            </Text>
            <Text type="secondary" style={{ display: 'block' }}>
              {categoryDescription}
            </Text>
          </div>
          <Tooltip title="Industry removal is not editable in edit mode">
            <Button
              icon={<DeleteOutlined />}
              onClick={() => onRemoveIndustry(taxCode)}
              disabled={isEditMode}
            />
          </Tooltip>
        </div>

        <Divider style={{ margin: '12px 0' }} />
        {(industryDetailedLines[taxCode] || []).length > 0 && (
          <div style={{ marginTop: 12 }}>
            {(industryDetailedLines[taxCode] || []).map((lineName) => {
              const capitalKey = `${taxCode}-${lineName}`
              const allocatedCapital = (lobAllocatedCapital || {})[capitalKey] || 0
              const classification = getClassificationForCapital(taxCode, allocatedCapital)
              
              const lob = lobs.find(l => l.name === lineName)
              const variables = (lob?.variables || [])
                .map(v => {
                  // The public LOB endpoint populates variables, so they are full objects.
                  if (v && typeof v === 'object' && v.question !== undefined) return v
                  // Fallback: if only an ID is present, resolve it from allVariables.
                  const id = typeof v === 'object' ? v._id : v
                  return allVariables.find(av => av._id === id)
                })
                .filter(Boolean)
              const lobVariables = savedVariableInputs[capitalKey] || {}
              
              const variableResponses = variables
                .filter(variable => lobVariables[variable._id] !== undefined && lobVariables[variable._id] !== null && lobVariables[variable._id] !== '' && lobVariables[variable._id] !== 0)
                .map(variable => {
                  const value = lobVariables[variable._id]
                  if (variable.calculationMethod === 'classification' && variable.classifications) {
                    const classification = variable.classifications.find(c => c.name === value)
                    if (classification) {
                      return `${classification.name} (₱${classification.fee?.toLocaleString() || 0})`
                    }
                    return value
                  }
                  const formattedValue = typeof value === 'number' ? value.toLocaleString() : value
                  // Use context-specific singular/plural unit forms if available, otherwise fallback to unitSingular/unitPlural, then unit
                  const unit = value === 1 
                    ? (variable.unitContextSingular || variable.unitSingular || variable.unit) 
                    : (variable.unitContextPlural || variable.unitPlural || variable.unit)
                  return unit ? `${formattedValue} ${unit}` : formattedValue
                })

              const currentMonth = new Date().toLocaleString('en-US', { month: 'long' })
              const lobTaxBrackets = taxBrackets.filter(tb => tb.lobId === lob?._id)
              const isMonthlyBased = lobTaxBrackets.some(tb => tb.name?.toLowerCase().includes('monthly rate'))

              let displayText = ''
              if (variableResponses.length === 0) {
                displayText = `₱${allocatedCapital.toLocaleString()} capital`
              } else {
                const formattedResponses = variableResponses.map((response, index) =>
                  index === 0 ? response : response.replace(/^Has /, '')
                )
                if (formattedResponses.length === 1) {
                  displayText = `₱${allocatedCapital.toLocaleString()} capital - ${formattedResponses[0]}`
                } else {
                  displayText = `₱${allocatedCapital.toLocaleString()} capital - ${formattedResponses.slice(0, -1).join(', ')} & ${formattedResponses[formattedResponses.length - 1]}`
                }
              }

              if (isMonthlyBased) {
                displayText += ` - Renting from ${currentMonth} to December`
              }

              return (
                <Card
                  key={lineName}
                  size="small"
                  style={{ marginBottom: 8, border: `1px solid ${token.colorBorder}` }}
                  styles={{ body: { padding: 12 } }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <Text strong style={{ display: 'block' }}>
                        {classification ? `${classification} ${lineName}` : lineName}
                      </Text>
                      <Text type="secondary" style={{ display: 'block' }}>
                        {displayText}
                      </Text>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Tooltip title="Line of Business editing is not editable in edit mode">
                        <Button
                          icon={<EditOutlined />}
                          onClick={() => onEditLineOfBusiness && onEditLineOfBusiness(taxCode, lineName)}
                          disabled={isEditMode}
                        />
                      </Tooltip>
                      {(industryDetailedLines[taxCode] || []).length > 1 && (
                        <Tooltip title="Line of Business removal is not editable in edit mode">
                          <Button
                            icon={<DeleteOutlined />}
                            onClick={() => onRemoveLineOfBusiness(taxCode, lineName)}
                            disabled={isEditMode}
                          />
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        <div>
          <Tooltip title="Line of Business addition is not editable in edit mode">
            <Button
              type="dashed"
              onClick={() => onAddLineOfBusiness(taxCode)}
              block
              disabled={isEditMode}
            >
              + Add another line of business
            </Button>
          </Tooltip>
        </div>
      </Card>
    </div>
  )
}
