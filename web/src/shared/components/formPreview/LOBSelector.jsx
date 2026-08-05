import { Typography, Select } from 'antd'
import { getLobsByCategory, mapTaxCodeToCategory } from '@/shared/utils/lobApiUtils'

const { Text } = Typography

export default function LOBSelector({
  lobs,
  modalSelectedIndustry,
  value,
  onChange,
  placeholder = "Select line of business",
  industryDetailedLines,
}) {
  return (
    <Select
      placeholder={placeholder}
      style={{ width: '100%' }}
      value={value}
      onChange={onChange}
      disabled={!modalSelectedIndustry}
      options={(() => {
        const category = mapTaxCodeToCategory(lobs, modalSelectedIndustry)
        const detailedLines = getLobsByCategory(lobs, category)
        const existingLines = industryDetailedLines ? (industryDetailedLines[modalSelectedIndustry] || []) : []
        return detailedLines
          .filter(line => line.status === 'active')
          .filter(line => !existingLines.includes(line.name))
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(line => ({
            label: line.name,
            value: line.name,
            description: line.description,
          }))
      })()}
      optionRender={(option) => (
        <div style={{ padding: '8px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ display: 'block' }}>
                {option.label}
              </Text>
              <Text type="secondary" style={{ display: 'block' }}>
                {option.data.description}
              </Text>
            </div>
          </div>
        </div>
      )}
    />
  )
}
