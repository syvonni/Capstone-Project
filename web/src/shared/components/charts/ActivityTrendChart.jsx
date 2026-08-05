import { useState, useRef } from 'react'
import { Typography, Button, Tooltip, theme } from 'antd'
import { FilterOutlined } from '@ant-design/icons'
import { Line } from '@ant-design/charts'
import FilterDropdown from '../FilterDropdown'

const { Text } = Typography

export default function ActivityTrendChart({ data = [], height = 200 }) {
  const { token } = theme.useToken()
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterPosition, setFilterPosition] = useState({ top: 0, right: 0 })
  const filterButtonRef = useRef(null)

  // Filter fields configuration
  const [timeRange, setTimeRange] = useState('7d')
  const [variableType, setVariableType] = useState('all')

  const filterFields = [
    {
      key: 'timeRange',
      label: 'Time Range',
      placeholder: 'Select time range',
      value: timeRange,
      onChange: setTimeRange,
      options: [
        { label: 'Last 7 days', value: '7d' },
        { label: 'Last 30 days', value: '30d' },
        { label: 'Last 90 days', value: '90d' },
        { label: 'Last year', value: '1y' },
      ],
    },
    {
      key: 'variableType',
      label: 'Variable Type',
      placeholder: 'Select type',
      value: variableType,
      onChange: setVariableType,
      options: [
        { label: 'All Variables', value: 'all' },
        { label: 'Active Only', value: 'active' },
        { label: 'Disabled Only', value: 'disabled' },
      ],
    },
  ]

  const activeFilterCount = [timeRange, variableType].filter(
    (val) => val && val !== 'all' && val !== '7d'
  ).length

  const handleFilterClick = () => {
    if (filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect()
      setFilterPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
    setFilterOpen(!filterOpen)
  }

  const handleClearAllFilters = () => {
    setTimeRange('7d')
    setVariableType('all')
  }

  return (
    <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: `1px solid ${token.colorBorderSecondary}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text>Activity Trend</Text>
        <div style={{ position: 'relative' }}>
          <Tooltip title="Filter">
            <Button
              ref={filterButtonRef}
              icon={<FilterOutlined />}
              size="small"
              type="text"
              style={{ border: 'none' }}
              onClick={handleFilterClick}
              aria-label="Filter chart"
            />
          </Tooltip>
          <FilterDropdown
            open={filterOpen}
            onClose={() => setFilterOpen(false)}
            filterFields={filterFields}
            activeFilterCount={activeFilterCount}
            onClearAll={handleClearAllFilters}
            position={filterPosition}
          />
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <Line
          data={data}
          xField="date"
          yField="value"
          height={height}
          smooth
          color={token.colorPrimary}
          point={{ size: 4 }}
          lineStyle={{ lineWidth: 2 }}
          tooltip={{
            formatter: (datum) => {
              return { name: 'Activity Count', value: datum.value }
            },
          }}
        />
      </div>
    </div>
  )
}
