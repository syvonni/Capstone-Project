import React from 'react'
import { Modal, theme, DatePicker, Typography, Descriptions } from 'antd'
import { DownloadOutlined, InfoCircleOutlined } from '@ant-design/icons'
import DefaultAuditCard from './DefaultAuditCard'
import ListPanel from './ListPanel'
import ResponsiveSplitLayout from './ResponsiveSplitLayout'
import { getEventTypeLabel } from '@/shared/config/auditEventTypes'

const { Text } = Typography
const { RangePicker } = DatePicker
const AUDIT_HISTORY_PAGE_SIZE = 20

export default function AuditHistoryModal({
  open,
  onClose,
  auditLogs = [],
  eventDescriptions = null,
  loading = false,
  error: _error,
  onRefresh,
  // Custom renderers for flexibility
  AuditCardComponent = null,
  DetailPanelComponent = null,
  // Card selection handler
  onCardSelect = null,
  // Inline mode: render content without Modal wrapper
  inline = false,
  // Show entity name in card title
  showEntityName = true,
  // Search handler
  onSearchChange,
}) {
  const { token: themeToken } = theme.useToken()
  const [selectedAudit, setSelectedAudit] = React.useState(null)
  const [showInfo, setShowInfo] = React.useState(false)
  const [exportOpen, setExportOpen] = React.useState(false)
  const [exportRange, setExportRange] = React.useState(null)

  const handleCardSelect = (audit) => {
    setSelectedAudit(audit)
    setShowInfo(false)
    if (onCardSelect) {
      onCardSelect(audit)
    }
  }

  const handleExport = () => {
    if (auditLogs.length === 0) return

    // Filter by date range if specified
    let logsToExport = auditLogs
    if (exportRange && exportRange[0] && exportRange[1]) {
      const startDate = exportRange[0].startOf('day')
      const endDate = exportRange[1].endOf('day')
      logsToExport = auditLogs.filter(audit => {
        const timestamp = audit.timestamp || audit.createdAt
        if (!timestamp) return false
        const auditDate = new Date(timestamp)
        return auditDate >= startDate && auditDate <= endDate
      })
    }

    if (logsToExport.length === 0) {
      alert('No records in the selected date range')
      return
    }

    // Convert audit logs to CSV format
    const headers = ['Event Type', 'Timestamp', 'User', 'User ID', 'Entity Type', 'Entity ID', 'Metadata']
    const rows = logsToExport.map(audit => [
      audit.eventType || '',
      audit.timestamp ? new Date(audit.timestamp).toLocaleString() : '',
      audit.userName || '',
      audit.userId || '',
      audit.entityType || '',
      audit.entityId || '',
      audit.metadata ? JSON.stringify(audit.metadata) : '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setExportOpen(false)
  }

  const getExportRowCount = () => {
    if (!exportRange || !exportRange[0] || !exportRange[1]) return auditLogs.length
    const startDate = exportRange[0].startOf('day')
    const endDate = exportRange[1].endOf('day')
    return auditLogs.filter(audit => {
      const timestamp = audit.timestamp || audit.createdAt
      if (!timestamp) return false
      const auditDate = new Date(timestamp)
      return auditDate >= startDate && auditDate <= endDate
    }).length
  }

  const renderAuditCard = (item) => {
    const CardComponent = AuditCardComponent || DefaultAuditCard
    return (
      <CardComponent
        audit={item}
        selected={selectedAudit?._id === item._id}
        onSelect={() => handleCardSelect(item)}
        showEntityName={showEntityName}
      />
    )
  }

  const listContent = (
    <ListPanel
      items={auditLogs}
      renderCard={renderAuditCard}
      selectedId={selectedAudit?._id}
      onSelectItem={handleCardSelect}
      isLoading={loading}
      searchPlaceholder="Search by user or event type"
      searchOnEnter={true}
      onSearchChange={onSearchChange}
      pageSize={AUDIT_HISTORY_PAGE_SIZE}
      customFilter={true}
      showStaleInfo={false}
      onRefresh={onRefresh}
      showRefresh={!!onRefresh}
      infoButton={{
        icon: <InfoCircleOutlined />,
        onClick: () => setShowInfo(!showInfo),
        title: 'View event type documentation',
      }}
      primaryButton={{
        icon: <DownloadOutlined />,
        onClick: () => setExportOpen(true),
        disabled: auditLogs.length === 0,
        title: 'Download records',
      }}
      primaryButtonInHeader={true}
    />
  )

  const detailContent = showInfo ? (
    <div style={{ padding: 16, overflow: 'auto' }}>
      <Text style={{ marginBottom: 8, display: 'block' }}>Event Types</Text>
      {eventDescriptions && eventDescriptions.length > 0 ? (
        <Descriptions column={1} size="small" bordered>
          {eventDescriptions.map((eventInfo) => (
            <Descriptions.Item key={eventInfo.event} label={getEventTypeLabel(eventInfo.event)}>
              {eventInfo.description}
            </Descriptions.Item>
          ))}
        </Descriptions>
      ) : (
        <Text type="secondary">No event type documentation available</Text>
      )}
    </div>
  ) : DetailPanelComponent ? (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <DetailPanelComponent
          audit={selectedAudit}
          eventDescriptions={eventDescriptions}
        />
      </div>
    </div>
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      Select an audit log to view details
    </div>
  )

  const content = (
    <div
      style={{
        height: 600,
        display: 'flex',
        border: inline ? 'none' : `1px solid ${themeToken.colorBorderSecondary}`,
        borderRadius: inline ? 0 : themeToken.borderRadiusLG,
        overflow: 'hidden',
      }}
    >
      <ResponsiveSplitLayout
        listContent={listContent}
        detailContent={detailContent}
        drawerTitle="Audit Details"
        drawerOpen={!!selectedAudit}
        mobileDrawerPlacement="right"
        listMinWidth={300}
        listMaxWidth={400}
        listDefaultSize="40%"
        mobileBreakpoint="lg"
      />
    </div>
  )

  if (inline) {
    return (
      <>
        <div
          style={{
            border: `1px solid ${themeToken.colorBorderSecondary}`,
            borderRadius: themeToken.borderRadiusLG,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${themeToken.colorBorderSecondary}` }}>
            <Text>History</Text>
          </div>
          {content}
        </div>
        <Modal
          title="Download audit records"
          open={exportOpen}
          onCancel={() => setExportOpen(false)}
          onOk={handleExport}
          okText="Download CSV"
          okButtonProps={{ disabled: getExportRowCount() === 0 }}
        >
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Text type="secondary">Select start and end date for exported records (based on audit timestamp).</Text>
            <RangePicker
              value={exportRange}
              onChange={(value) => setExportRange(value || [null, null])}
              style={{ width: '100%' }}
              format="MMM D, YYYY"
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {exportRange?.[0] && exportRange?.[1]
                ? `${getExportRowCount()} record${getExportRowCount() === 1 ? '' : 's'} ready to export`
                : 'Choose a date range to enable download'}
            </Text>
          </div>
        </Modal>
      </>
    )
  }

  return (
    <>
      <Modal
        title="Audit History"
        open={open}
        onCancel={onClose}
        footer={null}
        width={900}
        style={{ top: 20 }}
      >
        {content}
      </Modal>
      <Modal
        title="Download audit records"
        open={exportOpen}
        onCancel={() => setExportOpen(false)}
        onOk={handleExport}
        okText="Download CSV"
        okButtonProps={{ disabled: getExportRowCount() === 0 }}
      >
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Text type="secondary">Select start and end date for exported records (based on audit timestamp).</Text>
          <RangePicker
            value={exportRange}
            onChange={(value) => setExportRange(value || [null, null])}
            style={{ width: '100%' }}
            format="MMM D, YYYY"
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {exportRange?.[0] && exportRange?.[1]
              ? `${getExportRowCount()} record${getExportRowCount() === 1 ? '' : 's'} ready to export`
              : 'Choose a date range to enable download'}
          </Text>
        </div>
      </Modal>
    </>
  )
}
