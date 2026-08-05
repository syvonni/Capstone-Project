import { Empty, Typography } from 'antd'
import InfoGrid from '@/shared/components/InfoGrid'

const { Text } = Typography

export default function TaxBracketOverview({ overviewData, lobId, _token, selectedBracket }) {
  if (!overviewData || !lobId) {
    return <Empty description="No Line of Business selected" />
  }

  const { lobName, byBasis } = overviewData

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const formatBracketItem = (bracket, taxBasisLabel) => {
    const range = bracket.maxValue !== undefined && bracket.maxValue !== null
      ? `₱${bracket.minValue?.toLocaleString() || '0'} to ₱${bracket.maxValue?.toLocaleString()}`
      : `₱${bracket.minValue?.toLocaleString() || '0'}+`
    const amount = bracket.fixedAmount !== null && bracket.fixedAmount !== undefined
      ? `₱${bracket.fixedAmount.toLocaleString()}`
      : '₱0'
    const excess = bracket.excessRate !== null && bracket.excessRate !== undefined
      ? ` + ${(bracket.excessRateType === 'percentage_of_percentage' ? (bracket.excessRate * 100).toFixed(2) + '% of 1%' : (bracket.excessRate * 100).toFixed(2) + '%')}`
      : ''
    return {
      text: `${amount}${excess} for ${bracket.name} (${range} ${taxBasisLabel})`,
    }
  }

  const items = [
    { label: 'Line of Business', value: lobName },
  ]

  // Add metaInfo if selected bracket is provided
  if (selectedBracket) {
    if (selectedBracket.version !== undefined) {
      items.push({ label: 'Version', value: selectedBracket.version })
    }
    if (selectedBracket.createdAt) {
      items.push({ label: 'Created on', value: formatRelativeTime(selectedBracket.createdAt) })
    }
    if (selectedBracket.updatedAt) {
      items.push({ label: 'Last updated on', value: formatRelativeTime(selectedBracket.updatedAt) })
    }
  }

  items.push({ type: 'divider' })
  items.push({
    type: 'sublist',
    title: 'Capital Tax',
    items: byBasis.capitalization && byBasis.capitalization.length > 0
      ? byBasis.capitalization.map((bracket) => formatBracketItem(bracket, 'Capital'))
      : [{ text: '-' }],
  })
  items.push({ type: 'divider' })
  items.push({
    type: 'sublist',
    title: 'Gross Sales Tax',
    items: byBasis.gross_sales && byBasis.gross_sales.length > 0
      ? byBasis.gross_sales.map((bracket) => formatBracketItem(bracket, 'Gross Sales'))
      : [{ text: '-' }],
  })

  return (
    <div style={{ padding: '24px 24px 16px 24px' }}>
      <InfoGrid
        noPadding
        items={items}
      />
    </div>
  )
}
