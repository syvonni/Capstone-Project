import { useMemo, useState, useEffect, useCallback } from 'react'
import { Table, Tag, Input, Select, Typography, theme, Button, Card } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getPayments } from '../services/paymentService'

const { Text } = Typography

const PAYMENT_STATUS_CONFIG = {
  pending: { color: 'warning', label: 'Pending' },
  completed: { color: 'success', label: 'Completed' },
  failed: { color: 'error', label: 'Failed' },
  cancelled: { color: 'default', label: 'Cancelled' },
  refunded: { color: 'orange', label: 'Refunded' },
}

const PAYMENT_TYPE_CONFIG = {
  permit_fee: { color: 'blue', label: 'Permit Fee' },
  renewal_fee: { color: 'cyan', label: 'Renewal Fee' },
  cessation_tax: { color: 'orange', label: 'Cessation Tax' },
  inspection_fee: { color: 'purple', label: 'Inspection Fee' },
  penalty: { color: 'red', label: 'Penalty' },
  surcharge: { color: 'magenta', label: 'Surcharge' },
}

export default function LedgerTable({ loading = false, onRefresh }) {
  const { token } = theme.useToken()
  const [payments, setPayments] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(null)
  const [typeFilter, setTypeFilter] = useState(null)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [isLoading, setIsLoading] = useState(false)

  const fetchPayments = useCallback(async (page = 1, pageSize = 20) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page)
      params.append('limit', pageSize)
      if (statusFilter) params.append('status', statusFilter)
      if (typeFilter) params.append('paymentType', typeFilter)

      const response = await getPayments({ page, pageSize, search, status: statusFilter, type: typeFilter })
      setPayments(response || [])
      setPagination(prev => ({
        ...prev,
        current: page,
        pageSize,
        total: response.meta?.total || 0,
      }))
    } catch (error) {
      console.error('Failed to fetch payments:', error)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, typeFilter])

  useEffect(() => {
    fetchPayments(pagination.current, pagination.pageSize)
  }, [fetchPayments])

  const handleRefresh = () => {
    fetchPayments(pagination.current, pagination.pageSize)
    onRefresh?.()
  }

  const filteredPayments = useMemo(() => {
    let result = [...payments]
    
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(payment => {
        const paymentId = (payment.paymentId || '').toLowerCase()
        const businessName = (payment.businessName || '').toLowerCase()
        const businessId = (payment.businessId || '').toLowerCase()
        const paymentType = (payment.paymentType || '').toLowerCase()
        return paymentId.includes(q) || businessName.includes(q) || businessId.includes(q) || paymentType.includes(q)
      })
    }
    
    return result
  }, [payments, search])

  const statusOptions = useMemo(() => {
    return Object.keys(PAYMENT_STATUS_CONFIG).map(key => ({
      value: key,
      label: PAYMENT_STATUS_CONFIG[key].label,
    }))
  }, [])

  const typeOptions = useMemo(() => {
    return Object.keys(PAYMENT_TYPE_CONFIG).map(key => ({
      value: key,
      label: PAYMENT_TYPE_CONFIG[key].label,
    }))
  }, [])

  const columns = [
    {
      title: 'Payment ID',
      dataIndex: 'paymentId',
      key: 'paymentId',
      width: 180,
      render: (paymentId) => (
        <Text code style={{ fontSize: 11 }}>{paymentId || '—'}</Text>
      ),
    },
    {
      title: 'Business',
      dataIndex: 'businessName',
      key: 'businessName',
      width: 200,
      render: (businessName, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Text strong style={{ fontSize: 13 }}>{businessName || 'Unknown'}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{record.businessId || '—'}</Text>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'paymentType',
      key: 'paymentType',
      width: 150,
      render: (paymentType) => {
        const cfg = PAYMENT_TYPE_CONFIG[paymentType] || { color: 'default', label: paymentType }
        const label = cfg.label || paymentType?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—'
        return <Tag color={cfg.color}>{label}</Tag>
      },
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount) => (
        <Text strong style={{ fontSize: 13 }}>
          ₱{(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const cfg = PAYMENT_STATUS_CONFIG[status] || { color: 'default', label: status }
        const label = cfg.label || status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—'
        return <Tag color={cfg.color}>{label}</Tag>
      },
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (createdAt) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {createdAt ? dayjs(createdAt).format('MMM D, YYYY h:mm A') : '—'}
        </Text>
      ),
    },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header with search and filters */}
      <Card size="small" style={{ marginBottom: 8, borderRadius: token.borderRadiusLG }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search payments..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200, flex: 'none' }}
            allowClear
          />
          <Select
            placeholder="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[{ value: null, label: 'All Statuses' }, ...statusOptions]}
            style={{ width: 140, flex: 'none' }}
            allowClear
          />
          <Select
            placeholder="Type"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[{ value: null, label: 'All Types' }, ...typeOptions]}
            style={{ width: 140, flex: 'none' }}
            allowClear
          />
          <div style={{ flex: 1 }} />
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={isLoading}
          >
            Refresh
          </Button>
        </div>
      </Card>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Table
          columns={columns}
          dataSource={filteredPayments}
          loading={isLoading || loading}
          rowKey="_id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: filteredPayments.length,
            showSizeChanger: true,
            showTotal: (total) => `${total} payment${total !== 1 ? 's' : ''}`,
            onChange: (page, pageSize) => {
              fetchPayments(page, pageSize)
            },
          }}
          size="small"
          scroll={{ y: 'calc(100vh - 300px)' }}
        />
      </div>
    </div>
  )
}
