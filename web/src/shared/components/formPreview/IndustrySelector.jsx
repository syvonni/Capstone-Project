import { Typography, Select } from 'antd'
import { BuildOutlined } from '@ant-design/icons'
import { LINE_OF_BUSINESS_BY_TAX_CODE } from '@/shared/constants/lineOfBusiness'
import { getTaxCodeOptions } from '@/shared/utils/lobApiUtils'

const { Text } = Typography

const INDUSTRY_ICONS = {
  'RET': <BuildOutlined style={{ fontSize: 24 }} />,
  'WHL': <BuildOutlined style={{ fontSize: 24 }} />,
  'FDS': <BuildOutlined style={{ fontSize: 24 }} />,
  'MFG': <BuildOutlined style={{ fontSize: 24 }} />,
  'SVC': <BuildOutlined style={{ fontSize: 24 }} />,
  'FIN': <BuildOutlined style={{ fontSize: 24 }} />,
  'RES': <BuildOutlined style={{ fontSize: 24 }} />,
  'TRN': <BuildOutlined style={{ fontSize: 24 }} />,
  'AGR': <BuildOutlined style={{ fontSize: 24 }} />,
  'CON': <BuildOutlined style={{ fontSize: 24 }} />,
  'MIN': <BuildOutlined style={{ fontSize: 24 }} />,
  'UTL': <BuildOutlined style={{ fontSize: 24 }} />,
}

export default function IndustrySelector({
  lobs,
  selectedIndustryTaxCodes,
  value,
  onChange,
  token,
  placeholder = "Select business industry",
}) {
  return (
    <Select
      placeholder={placeholder}
      style={{ width: '100%' }}
      value={value}
      onChange={onChange}
      options={getTaxCodeOptions(lobs).filter(lob => !selectedIndustryTaxCodes.includes(lob.value)).map(lob => {
        const categoryMapping = LINE_OF_BUSINESS_BY_TAX_CODE[lob.value]
        const categoryLabel = categoryMapping?.name || lob.label
        const categoryDescription = categoryMapping?.description || ''
        return {
          label: categoryLabel,
          value: lob.value,
          description: categoryDescription,
        }
      })}
      optionRender={(option) => (
        <div style={{ padding: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
              {INDUSTRY_ICONS[option.value] || <BuildOutlined style={{ fontSize: 24 }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong style={{ display: 'block' }}>
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
