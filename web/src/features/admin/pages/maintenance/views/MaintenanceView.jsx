import { useState, useMemo, useEffect } from 'react'
import { Button, theme, Typography, Drawer, Empty } from 'antd'
import { StopOutlined, ClockCircleOutlined, InfoCircleOutlined } from '@ant-design/icons'
import MaintenanceRequestCard from '../components/MaintenanceRequestCard'
import MaintenanceRequestDetailPanel from '../components/MaintenanceRequestDetailPanel'
import MaintenanceRequestModal from '../components/MaintenanceRequestModal'
import MaintenanceExportModal from '../components/MaintenanceExportModal'
import DynamicInfoModal from '@/shared/components/DynamicInfoModal'
import ListPanel from '@/shared/components/ListPanel'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'
import { isDefaultVisible, filterApprovalsBySearch, filterApprovalsByStatus, filterApprovalsByReason } from '../utils/maintenance.utils'
import { useMaintenanceFilters, useMaintenanceExport, useMaintenance } from '../hooks'
import { Grid } from 'antd'

const { Text } = Typography

export default function MaintenanceView() {
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.lg
  const [infoOpen, setInfoOpen] = useState(false)
  const { token } = theme.useToken()
  const [selectedApproval, setSelectedApproval] = useState(null)

  const {
    form,
    current,
    approvals,
    loading,
    submitting,
    requestModalOpen,
    setRequestModalOpen,
    requestModalOptions,
    load,
    handleConfirmSubmit,
    handleApprove,
    handleUndoVote,
    handleCancelApproved,
    openRequestModalOrBlock,
    stepUpModal,
  } = useMaintenance()

  const {
    historySearch,
    setHistorySearch,
    historyStatusFilter,
    setHistoryStatusFilter,
    historyReasonFilter,
    setHistoryReasonFilter,
    showAllRequests,
    setShowAllRequests,
  } = useMaintenanceFilters()

  const scopedApprovals = useMemo(() => {
    const list = approvals || []
    return showAllRequests ? list : list.filter(isDefaultVisible)
  }, [approvals, showAllRequests])

  const filteredApprovals = useMemo(() => {
    let list = [...scopedApprovals]
    list = filterApprovalsBySearch(list, historySearch)
    list = filterApprovalsByStatus(list, historyStatusFilter)
    list = filterApprovalsByReason(list, historyReasonFilter)
    return list
  }, [scopedApprovals, historySearch, historyStatusFilter, historyReasonFilter])

  const { exportOpen: historyExportOpen, setExportOpen: setHistoryExportOpen, exportRange: historyExportRange, setExportRange: setHistoryExportRange, handleExport: handleExportHistory, rowCount: exportRangeRows } = useMaintenanceExport(filteredApprovals, () => setHistoryExportOpen(false))

  // Update selectedApproval with fresh data when approvals change
  useEffect(() => {
    if (selectedApproval) {
      const updatedApproval = approvals?.find(a => a.approvalId === selectedApproval.approvalId)
      if (updatedApproval) setSelectedApproval(updatedApproval)
    }
  }, [approvals, selectedApproval])

  // Devtools hook for testing
  useEffect(() => {
    if (import.meta.env.MODE === 'production') return undefined
    const handler = () => {
      const first = scopedApprovals.find((a) => a.status === 'pending') || scopedApprovals[0]
      if (first) setSelectedApproval(first)
    }
    window.addEventListener('devtools:maintenance-select-first', handler)
    return () => window.removeEventListener('devtools:maintenance-select-first', handler)
  }, [scopedApprovals])

  const handleSelectItem = (item) => {
    setSelectedApproval(item)
  }

  const renderCard = (item, currentSelectedId, onSelect) => {
    return (
      <MaintenanceRequestCard
        approval={item}
        selectedId={currentSelectedId}
        onSelect={onSelect}
        token={token}
      />
    )
  }

  const statusOptions = useMemo(() => [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'cancelled', label: 'Cancelled' },
  ], [])

  const reasonOptions = useMemo(() => [
    { value: 'scheduled_maintenance', label: 'Scheduled Maintenance' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'security', label: 'Security Update' },
    { value: 'performance', label: 'Performance' },
  ], [])

  const listContent = (
    <ListPanel
      items={filteredApprovals}
      isLoading={loading}
      selectedId={selectedApproval?.approvalId}
      onSelectItem={handleSelectItem}
      renderCard={renderCard}
      filterConfig={[
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: statusOptions,
          value: historyStatusFilter,
        },
        {
          key: 'reason',
          label: 'Reason',
          type: 'select',
          options: reasonOptions,
          value: historyReasonFilter,
        },
      ]}
      onFilterChange={(key, value) => {
        if (key === 'status') setHistoryStatusFilter(value)
        if (key === 'reason') setHistoryReasonFilter(value)
      }}
      onClearFilters={() => {
        setHistoryStatusFilter(null)
        setHistoryReasonFilter(null)
      }}
      customFilter={true}
      showRefresh={true}
      onRefresh={load}
      search={historySearch}
      onSearchChange={setHistorySearch}
      searchOnEnter={true}
      showStaleInfo={false}
      primaryButton={{
        icon: current?.isActive ? <StopOutlined /> : <ClockCircleOutlined />,
        onClick: () => openRequestModalOrBlock({ forceScheduleMode: current?.isActive }),
        label: current?.isActive ? 'Disable' : 'Schedule',
      }}
      secondaryButtons={[
        {
          icon: <InfoCircleOutlined />,
          onClick: () => setInfoOpen(true),
          tooltip: 'About',
        },
      ]}
      showAllToggle={true}
      showAll={showAllRequests}
      onToggleShowAll={() => setShowAllRequests((prev) => !prev)}
    />
  )

  const detailContent = selectedApproval ? (
    <MaintenanceRequestDetailPanel
      approval={selectedApproval}
      allApprovals={approvals}
      onApprove={handleApprove}
      onUndoVote={handleUndoVote}
      onCancelApproved={handleCancelApproved}
      onRefresh={load}
    />
  ) : isMobile ? null : (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Empty description="Select a request to view details" />
    </div>
  )

  if (isMobile) {
    return (
      <>
        {listContent}
        <Drawer
          title="Request details"
          open={!!selectedApproval}
          onClose={() => setSelectedApproval(null)}
          placement="bottom"
          height="100%"
          styles={{ body: { padding: 0 } }}
        >
          {detailContent}
        </Drawer>
        <Drawer
          title="Download requests"
          open={historyExportOpen}
          onClose={() => setHistoryExportOpen(false)}
          placement="bottom"
          height="50%"
          styles={{ body: { padding: 16 } }}
          extra={
            <Button type="primary" onClick={handleExportHistory} disabled={exportRangeRows === 0}>
              Download CSV
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Text type="secondary">Select start and end date for exported records (based on request date).</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Export functionality coming soon
            </Text>
          </div>
        </Drawer>
        <DynamicInfoModal slotId="maintenance-info" open={infoOpen} onClose={() => setInfoOpen(false)} title="About Maintenance" />
        <MaintenanceRequestModal
          open={requestModalOpen}
          onCancel={() => setRequestModalOpen(false)}
          form={form}
          forceScheduleMode={requestModalOptions.forceScheduleMode}
          onSubmit={handleConfirmSubmit}
          submitting={submitting}
          maintenanceActive={current?.isActive === true}
          isMobile={true}
        />
        {stepUpModal}
      </>
    )
  }

  return (
    <>
      <ResponsiveSplitLayout
        listContent={listContent}
        detailContent={detailContent}
        drawerTitle="Request details"
        onDrawerClose={() => setSelectedApproval(null)}
        mobileDrawerPlacement="bottom"
      />
      <MaintenanceExportModal
        open={historyExportOpen}
        onCancel={() => setHistoryExportOpen(false)}
        onOk={handleExportHistory}
        exportRange={historyExportRange}
        onRangeChange={(value) => setHistoryExportRange(value || [null, null])}
        rowCount={exportRangeRows}
      />
      <DynamicInfoModal slotId="maintenance-info" open={infoOpen} onClose={() => setInfoOpen(false)} title="About Maintenance" />
      <MaintenanceRequestModal
        open={requestModalOpen}
        onCancel={() => setRequestModalOpen(false)}
        form={form}
        forceScheduleMode={requestModalOptions.forceScheduleMode}
        onSubmit={handleConfirmSubmit}
        submitting={submitting}
        maintenanceActive={current?.isActive === true}
        isMobile={false}
      />
      {stepUpModal}
    </>
  )
}
