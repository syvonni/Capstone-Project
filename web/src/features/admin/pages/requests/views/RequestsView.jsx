import { useState, useEffect, useCallback } from 'react'
import { Splitter, Grid } from 'antd'
import { getApprovals, getApproval } from '@/features/admin/services/approvalService'
import { useNotifier } from '@/shared/notifications'
import RequestsTable from '../RequestsTable'
import RequestDetailPanel from '../RequestDetailPanel'

const { useBreakpoint } = Grid

const PAGE_SIZE = 20

export default function RequestsView({ onLastUpdated } = {}) {
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const { error: notifyError } = useNotifier()
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState(null)
  const [detailApproval, setDetailApproval] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [currentPage, setCurrentPage] = useState(1)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const query = statusFilter === 'all' ? {} : { status: 'pending' }
      const { approvals: list } = await getApprovals(query)
      setApprovals(list || [])
    } catch (e) {
      console.error('Load approvals error:', e)
      setApprovals([])
      notifyError(e, 'Failed to load requests')
    } finally {
      setLoading(false)
      onLastUpdated?.(new Date())
    }
  }, [statusFilter, notifyError, onLastUpdated])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    const onRefresh = () => loadList()
    window.addEventListener('admin-requests-refresh', onRefresh)
    return () => window.removeEventListener('admin-requests-refresh', onRefresh)
  }, [loadList])

  const loadDetail = useCallback(async (approvalId) => {
    if (!approvalId) {
      setDetailApproval(null)
      return
    }
    setDetailLoading(true)
    try {
      const { approval } = await getApproval(approvalId)
      setDetailApproval(approval)
    } catch (e) {
      setDetailApproval(null)
      notifyError(e, 'Failed to load request details')
    } finally {
      setDetailLoading(false)
    }
  }, [notifyError])

  const handleSelect = useCallback(
    (rec) => {
      setSelectedApproval(rec)
      loadDetail(rec?.approvalId ?? rec?._id)
    },
    [loadDetail]
  )

  useEffect(() => {
    if (import.meta.env.MODE === 'production') return undefined
    const handler = (event) => {
      const { action, status } = event?.detail || {}
      if (action === 'setStatusFilter' && (status === 'pending' || status === 'all')) {
        setStatusFilter(status)
      } else if (action === 'selectFirst') {
        const first = approvals[0]
        if (first) handleSelect(first)
      }
    }
    window.addEventListener('devtools:requests', handler)
    return () => window.removeEventListener('devtools:requests', handler)
  }, [approvals, handleSelect])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter])

  const handleRefresh = useCallback(() => {
    loadList()
    if (selectedApproval?.approvalId) {
      loadDetail(selectedApproval.approvalId)
    } else {
      setDetailApproval(null)
    }
  }, [loadList, loadDetail, selectedApproval?.approvalId])

  const paginatedApprovals = approvals.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const pagination = {
    current: currentPage,
    total: approvals.length,
    pageSize: PAGE_SIZE,
    onChange: setCurrentPage,
  }

  // Desktop layout with Splitter
  if (!isMobile) {
    return (
      <Splitter style={{ height: '100%' }}>
        <Splitter.Panel min="30%" defaultSize="30%" style={{ overflow: 'hidden' }}>
          <RequestsTable
            approvals={paginatedApprovals}
            loading={loading}
            selectedApproval={selectedApproval}
            onSelect={handleSelect}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            pagination={pagination}
          />
        </Splitter.Panel>
        <Splitter.Panel
          min="50%"
          defaultSize="70%"
          style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          <RequestDetailPanel
            approval={detailApproval}
            loading={detailLoading}
            onRefresh={handleRefresh}
          />
        </Splitter.Panel>
      </Splitter>
    )
  }

  // Mobile layout with vertical stack
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      <div style={{ flexShrink: 0 }}>
        <RequestsTable
          approvals={paginatedApprovals}
          loading={loading}
          selectedApproval={selectedApproval}
          onSelect={handleSelect}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          pagination={pagination}
        />
      </div>
      <div style={{ flex: 1, minHeight: 200, borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
        <RequestDetailPanel
          approval={detailApproval}
          loading={detailLoading}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  )
}
