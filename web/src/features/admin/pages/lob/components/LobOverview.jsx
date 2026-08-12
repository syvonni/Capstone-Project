import { Typography } from 'antd';
import InfoGrid from '@/shared/components/InfoGrid';
import { INDUSTRY_CATEGORIES_BY_TAX_CODE } from '@/shared/constants/industryCategories';

const { Text } = Typography;

export default function LobOverview({
  lob,
  initialValues,
  variables,
  documents,
  postRequirements,
  taxBrackets,
  loading = false,
}) {
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const variableFeeRulesValues = lob?.variables || [];
  const variableFeeRuleIds = variableFeeRulesValues.map((r) => (typeof r === 'object' ? r._id : r));
  const selectedVariableFeeRules = variables.filter((rule) =>
    variableFeeRuleIds.includes(rule._id)
  );

  const documentsValues = lob?.documents || [];
  const documentsIds = documentsValues.map((d) => (typeof d === 'object' ? d._id : d));
  const selectedDocuments = documents.filter((doc) => documentsIds.includes(doc._id));

  const postRequirementsValues = lob?.postRequirements || { required: [], conditional: [] };
  const requiredPostRequirementValues = postRequirementsValues.required || [];
  const conditionalPostRequirementValues = postRequirementsValues.conditional || [];
  const requiredPostRequirementIds = requiredPostRequirementValues.map((r) =>
    typeof r === 'object' ? r._id : r
  );
  const conditionalPostRequirementIds = conditionalPostRequirementValues.map((r) =>
    typeof r === 'object' ? r._id : r
  );
  const requiredPostRequirements = postRequirements.filter((pr) =>
    requiredPostRequirementIds.includes(pr._id)
  );
  const conditionalPostRequirements = postRequirements.filter((pr) =>
    conditionalPostRequirementIds.includes(pr._id)
  );

  const categoryMapping = INDUSTRY_CATEGORIES_BY_TAX_CODE[initialValues.category];
  const categoryLabel = categoryMapping
    ? categoryMapping.industryCategory.charAt(0).toUpperCase() +
      categoryMapping.industryCategory.slice(1).replace('_', ' ')
    : initialValues.category || '-';

  return (
    <div>
      <InfoGrid
        noPadding
        loading={loading}
        items={[
          { label: 'Line of Business', value: initialValues.name || '-' },
          { label: 'Category', value: categoryLabel },
          { label: 'Version', value: lob?.version || '-' },
          { label: 'Created on', value: formatRelativeTime(lob?.createdAt) },
          { label: 'Last updated on', value: formatRelativeTime(lob?.updatedAt) },
          { type: 'divider' },
          { label: 'Description', value: initialValues.description || '-' },
          {
            type: 'sublist',
            title: 'Capital Tax',
            items: (() => {
              const capitalizationBrackets = taxBrackets.filter(
                (tb) => tb.taxBasis === 'capitalization'
              );
              return capitalizationBrackets.length > 0
                ? capitalizationBrackets.map((bracket) => {
                    const range =
                      bracket.maxValue !== undefined && bracket.maxValue !== null
                        ? `₱${bracket.minValue?.toLocaleString() || '0'} to ₱${bracket.maxValue?.toLocaleString()}`
                        : `₱${bracket.minValue?.toLocaleString() || '0'}+`;
                    const amount =
                      bracket.fixedAmount !== null && bracket.fixedAmount !== undefined
                        ? `₱${bracket.fixedAmount.toLocaleString()}`
                        : '₱0';
                    const excess =
                      bracket.excessRate !== null && bracket.excessRate !== undefined
                        ? ` + ${bracket.excessRateType === 'percentage_of_percentage' ? (bracket.excessRate * 100).toFixed(2) + '% of 1%' : (bracket.excessRate * 100).toFixed(2) + '%'}`
                        : '';
                    return {
                      text: `${amount}${excess} for ${bracket.name} (${range} Capital)`,
                    };
                  })
                : [{ text: '-' }];
            })(),
          },
          {
            type: 'sublist',
            title: 'Gross Sales Tax',
            items: (() => {
              const grossSalesBrackets = taxBrackets.filter((tb) => tb.taxBasis === 'gross_sales');
              return grossSalesBrackets.length > 0
                ? grossSalesBrackets.map((bracket) => {
                    const range =
                      bracket.maxValue !== undefined && bracket.maxValue !== null
                        ? `₱${bracket.minValue?.toLocaleString() || '0'} to ₱${bracket.maxValue?.toLocaleString()}`
                        : `₱${bracket.minValue?.toLocaleString() || '0'}+`;
                    const amount =
                      bracket.fixedAmount !== null && bracket.fixedAmount !== undefined
                        ? `₱${bracket.fixedAmount.toLocaleString()}`
                        : '₱0';
                    const excess =
                      bracket.excessRate !== null && bracket.excessRate !== undefined
                        ? ` + ${bracket.excessRateType === 'percentage_of_percentage' ? (bracket.excessRate * 100).toFixed(2) + '% of 1%' : (bracket.excessRate * 100).toFixed(2) + '%'}`
                        : '';
                    return {
                      text: `${amount}${excess} for ${bracket.name} (${range} Gross Sales)`,
                    };
                  })
                : [{ text: '-' }];
            })(),
          },
          { type: 'divider' },
          {
            type: 'sublist',
            title: 'Claimable Documents',
            items:
              selectedDocuments.length > 0
                ? selectedDocuments.map((doc) => ({
                    text: doc.name,
                    to: `/admin/documents?selectedId=${doc._id}`,
                  }))
                : [{ text: '-' }],
          },
          {
            type: 'sublist',
            title: 'Conditional Post Requirements',
            items:
              conditionalPostRequirements.length > 0
                ? conditionalPostRequirements.map((req) => ({
                    text: req.name,
                    to: `/admin/post-requirements?selectedId=${req._id}`,
                  }))
                : [{ text: '-' }],
          },
          {
            type: 'sublist',
            title: 'Post Requirements',
            items:
              requiredPostRequirements.length > 0
                ? requiredPostRequirements.map((req) => ({
                    text: req.name,
                    to: `/admin/post-requirements?selectedId=${req._id}`,
                  }))
                : [{ text: '-' }],
          },
          {
            type: 'sublist',
            title: 'Variables',
            items:
              selectedVariableFeeRules.length > 0
                ? selectedVariableFeeRules.map((rule) => ({
                    text: rule.name,
                    to: `/admin/fees?selectedId=${rule._id}&tab=variables`,
                  }))
                : [{ text: '-' }],
          },
          { label: 'Notes', value: initialValues.notes || '-' },
          { type: 'divider' },
          {
            label: 'Associated Tax Brackets',
            value: 'View Tax Brackets',
            to: `/admin/fees?tab=tax_brackets&selectedId=${lob?._id}`,
          },
        ]}
      />
    </div>
  );
}
