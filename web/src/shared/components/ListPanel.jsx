import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Typography, Input, Empty, theme, Grid, Button, Tooltip, Pagination, Skeleton, Select, Space } from 'antd'

const { Search } = Input
import { SearchOutlined, FilterOutlined, ReloadOutlined, BarChartOutlined } from '@ant-design/icons'
import FilterDropdown from './FilterDropdown'

const { Text } = Typography
const { useBreakpoint } = Grid

const DEFAULT_PAGE_SIZE = 20

export default function ListPanel({
  items = [],
  renderCard,
  onSelectItem,
  selectedId,
  isLoading = false,
  detailPanel: _detailPanel,
  searchPlaceholder = 'Search...',
  filterConfig = [],
  pageSize = DEFAULT_PAGE_SIZE,
  onRefresh,
  showRefresh = false,
  customFilter,
  onFilterChange,
  onClearFilters,
  showStaleInfo = true,
  primaryButton,
  tabSwitcher,
  infoButton,
  primaryButtonInHeader = false,
  search,
  onSearchChange,
  showSearch = true,
  searchOnEnter = false,
  enableStats = false,
  statsActive = false,
  onStatsToggle,
}) {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const [internalSearch, setInternalSearch] = useState(search || '')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterPosition, setFilterPosition] = useState({ top: 0, right: 0 })
  const filterButtonRef = useRef(null)
  const [page, setPage] = useState(1)
  const [showStale, setShowStale] = useState(false)
  const [refreshDisabled, setRefreshDisabled] = useState(false)

  // Use external search if provided, otherwise use internal state
  // When searchOnEnter is enabled, always use internal search for display
  const currentSearch = searchOnEnter ? internalSearch : (search !== undefined ? search : internalSearch)

  // Show stale message after 10 seconds
  useEffect(() => {
    const timeout = setTimeout(() => setShowStale(true), 10000)
    return () => clearTimeout(timeout)
  }, [])

  // Initialize filter values from config
  const filterValues = useMemo(() => {
    const values = {}
    filterConfig.forEach((field) => {
      values[field.key] = field.value || null
    })
    return values
  }, [filterConfig])

  const [activeFilters, setActiveFilters] = useState(filterValues)

  // Sync internal filter state when parent-provided config values change
  const filterValuesKey = JSON.stringify(filterValues)
  useEffect(() => {
    setActiveFilters(filterValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterValuesKey])

  useEffect(() => {
    if (filterOpen && filterButtonRef.current && !screens.xs) {
      const rect = filterButtonRef.current.getBoundingClientRect()
      setFilterPosition({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      })
    }
  }, [filterOpen, screens.xs])

  const activeFilterCount = useMemo(() => {
    return Object.values(activeFilters).filter((val) => val !== null && val !== undefined && val !== '').length
  }, [activeFilters])

  const filteredItems = useMemo(() => {
    // If customFilter is true, skip internal filtering and use items as-is
    if (customFilter) {
      return items
    }

    let list = [...items]

    // Apply filters
    filterConfig.forEach((field) => {
      const value = activeFilters[field.key]
      if (value !== null && value !== undefined && value !== '') {
        list = list.filter((item) => {
          const itemValue = item[field.key]
          return String(itemValue) === String(value)
        })
      }
    })

    // Apply search
    if (currentSearch.trim()) {
      const q = currentSearch.trim().toLowerCase()
      list = list.filter((item) => {
        const searchableFields = Object.keys(item)
        return searchableFields.some((key) => {
          const value = item[key]
          return value && String(value).toLowerCase().includes(q)
        })
      })
    }

    return list
  }, [items, activeFilters, currentSearch, filterConfig, customFilter])

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return filteredItems.slice(start, end)
  }, [filteredItems, page, pageSize])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [activeFilters, search])

  const handleFilterChange = (key, value) => {
    if (onFilterChange) {
      onFilterChange(key, value)
    }
    setActiveFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleClearAllFilters = () => {
    const cleared = {}
    filterConfig.forEach((field) => {
      cleared[field.key] = null
    })
    setActiveFilters(cleared)
    if (onClearFilters) {
      onClearFilters()
    }
  }

  const handleRefresh = useCallback(async () => {
    if (refreshDisabled) return
    setRefreshDisabled(true)
    await onRefresh?.()
    setShowStale(false)
    setTimeout(() => setShowStale(true), 10000)
    setTimeout(() => setRefreshDisabled(false), 5000)
  }, [onRefresh, refreshDisabled])

  const staleInfo = useMemo(() => {
    if (!showStaleInfo) return null
    if (!showStale) return null
    return 'List is stale, please refresh'
  }, [showStale, showStaleInfo])

  const filterFields = filterConfig.map((field) => ({
    key: field.key,
    label: field.label,
    placeholder: field.placeholder,
    value: activeFilters[field.key],
    onChange: (value) => handleFilterChange(field.key, value),
    options: field.options,
    disabled: field.disabled,
  }))

  const listContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Scrollable container with sticky header inside */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Sticky Header - Search, Filter, Refresh, Primary Button */}
        <div
          style={{
            flexShrink: 0,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            backgroundColor: token.colorBgContainer,
            position: 'sticky',
            top: 0,
            zIndex: 1,
            paddingTop: '12px'
          }}
        >
          {/* Tab Switcher */}
          {tabSwitcher && (
            <div style={{ padding: '0px 12px 8px 12px' }}>
              <Select
                value={tabSwitcher.value}
                onChange={tabSwitcher.onChange}
                options={tabSwitcher.options}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {/* Filters - always stays in one row */}
          <div style={{ padding: '0px 12px 8px 12px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'nowrap' }}>
            {showSearch && (
              <Search
                placeholder={staleInfo || searchPlaceholder}
                allowClear
                value={currentSearch}
                onChange={(e) => {
                  if (searchOnEnter) {
                    setInternalSearch(e.target.value)
                  } else {
                    if (onSearchChange) {
                      onSearchChange(e.target.value)
                    } else {
                      setInternalSearch(e.target.value)
                    }
                  }
                }}
                onSearch={(value) => {
                  if (searchOnEnter && onSearchChange) {
                    onSearchChange(value)
                  } else if (onSearchChange) {
                    onSearchChange(value)
                  } else {
                    setInternalSearch(value)
                  }
                }}
                enterButton={<Button type="default" icon={<SearchOutlined />} />}
                loading={isLoading}
                style={{ flex: 1, minWidth: 0 }}
              />
            )}
            {filterConfig.length > 0 || (showRefresh && onRefresh) || (enableStats && onStatsToggle) ? (
              <>
                {filterConfig.length > 0 && (
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Tooltip title="Filter">
                      <Button
                        ref={filterButtonRef}
                        icon={<FilterOutlined />}
                        type={activeFilterCount > 0 ? 'primary' : 'default'}
                        ghost={activeFilterCount > 0}
                        onClick={() => setFilterOpen(!filterOpen)}
                        aria-label="Toggle filters"
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
                )}
                {showRefresh && onRefresh && (
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleRefresh}
                    disabled={refreshDisabled}
                    loading={isLoading}
                    style={{ flexShrink: 0 }}
                  />
                )}
                {enableStats && onStatsToggle && (
                  <Tooltip title="Toggle stats">
                    <Button
                      icon={<BarChartOutlined />}
                      type={statsActive ? 'primary' : 'default'}
                      ghost={statsActive}
                      onClick={onStatsToggle}
                      style={{ flexShrink: 0 }}
                      aria-label="Toggle stats"
                    />
                  </Tooltip>
                )}
              </>
            ) : null}
            {primaryButton && primaryButtonInHeader && (
              <Tooltip title={primaryButton.title || ''}>
                <Button
                  icon={primaryButton.icon}
                  onClick={primaryButton.onClick}
                  disabled={primaryButton.disabled}
                  type={primaryButton.type || 'default'}
                  style={{ flexShrink: 0 }}
                  aria-label={primaryButton.title || 'Primary'}
                />
              </Tooltip>
            )}
            {infoButton && (
              <Tooltip title={infoButton.title || 'Info'}>
                <Button
                  icon={infoButton.icon}
                  onClick={infoButton.onClick}
                  disabled={infoButton.disabled}
                  style={{ flexShrink: 0 }}
                  aria-label={infoButton.title || 'Info'}
                />
              </Tooltip>
            )}
          </div>

          {/* Primary Button Row */}
          {primaryButton && !primaryButtonInHeader && (
            <div style={{ padding: '0px 12px 8px 12px' }}>
              <Button
                icon={primaryButton.icon}
                onClick={primaryButton.onClick}
                disabled={primaryButton.disabled}
                type={primaryButton.type || 'default'}
                style={{ width: '100%' }}
              >
                {primaryButton.label}
              </Button>
            </div>
          )}

          {/* Pagination */}
          <div style={{ padding: '8px 12px 8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Showing {paginatedItems.length} out of {filteredItems.length}
            </Text>
            <Pagination
              current={page}
              total={filteredItems.length}
              pageSize={pageSize}
              showSizeChanger={false}
              onChange={setPage}
              size="small"
              itemRender={(current, type, originalElement) => {
                if (type === 'page') {
                  // Show only current page and adjacent pages (max 3 numbers)
                  if (Math.abs(current - page) <= 1) {
                    return originalElement
                  }
                  return null
                }
                return originalElement
              }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ padding: '12px 12px 12px 12px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{
                  padding: '16px',
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: '8px',
                  backgroundColor: token.colorBgContainer
                }}>
                  {/* Title with bookmark space */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Skeleton.Input active style={{ width: '60%' }} />
                    <Skeleton.Button active size="small" style={{ width: 16, height: 16 }} />
                  </div>
                  {/* Description */}
                  <Skeleton.Input active size="small" style={{ width: '100%', marginBottom: 8 }} />
                  <Skeleton.Input active size="small" style={{ width: '100%', marginBottom: 12 }} />
                  {/* Meta info */}
                  <Skeleton.Input active size="small" style={{ width: '50%', marginBottom: 12 }} />
                  {/* Tags with separator */}
                  <div style={{ paddingTop: 12, borderTop: `1px solid ${token.colorBorderSecondary}`, display: 'flex', gap: 8 }}>
                    <Skeleton.Button active size="small" style={{ width: 60 }} />
                    <Skeleton.Button active size="small" style={{ width: 50 }} />
                    <Skeleton.Button active size="small" style={{ width: 70 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <Empty
              description="No items found"
              style={{ marginTop: 48 }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {paginatedItems.map((item, _idx) => {
                if (renderCard) {
                  return (
                    <div key={item._id || item.id || _idx}>
                      {renderCard(item, selectedId, onSelectItem)}
                    </div>
                  )
                }
                return null
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // Render list only (split layout is handled by SplitLayout)
  return listContent
}
