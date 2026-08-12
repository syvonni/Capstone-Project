import { Typography, Select } from 'antd';
import { INDUSTRY_CATEGORIES_BY_TAX_CODE } from '@/shared/constants/industryCategories';
import IndustryIcon from '@/shared/components/IndustryIcon';
import { getTaxCodeOptions } from '@/shared/utils/lobApiUtils';

const { Text } = Typography;

export default function IndustrySelector({
  lobs,
  selectedIndustryTaxCodes,
  value,
  onChange,
  token,
  placeholder = 'Select business industry',
}) {
  return (
    <Select
      placeholder={placeholder}
      style={{ width: '100%' }}
      value={value}
      onChange={onChange}
      options={getTaxCodeOptions(lobs)
        .filter((lob) => !selectedIndustryTaxCodes.includes(lob.value))
        .map((lob) => {
          const categoryMapping = INDUSTRY_CATEGORIES_BY_TAX_CODE[lob.value];
          const categoryLabel = categoryMapping?.name || lob.label;
          const categoryDescription = categoryMapping?.description || '';
          return {
            label: categoryLabel,
            value: lob.value,
            description: categoryDescription,
          };
        })}
      optionRender={(option) => (
        <div style={{ padding: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: token.colorBgLayout,
                borderRadius: 8,
                color: token.colorTextSecondary,
                flexShrink: 0,
              }}
            >
              <IndustryIcon taxCode={option.value} size={24} />
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
  );
}
