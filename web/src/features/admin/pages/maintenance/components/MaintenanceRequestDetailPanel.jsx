import { useState, useEffect } from 'react'
import { Typography, Tag, Button, Descriptions, Space, theme, Empty } from 'antd'
import { ToolOutlined } from '@ant-design/icons'
import { useAuthSession } from '@/features/authentication'
import { getAdminList } from '@/features/admin/services/staffService'
import dayjs from 'dayjs'
import MaintenanceVotePanel from './MaintenanceVotePanel.jsx'
import { userName, userEmail } from '../utils/maintenance.utils.js'

const { Text } = Typography
const REQUEST_EXPIRY_HOURS = 48

export default function MaintenanceRequestDetailPanel({ approval, allApprovals, onApprove, onUndoVote, onCancelApproved, onRefresh }) {
  const { token } = theme.useToken()
  const { currentUser } = useAuthSession()
  const [admins, setAdmins] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const scheduledStart = approval?.requestDetails?.scheduledStartAt ? dayjs(approval.requestDetails.scheduledStartAt) : null
  const isApprovedUpcoming = approval?.status === 'approved' && scheduledStart?.isValid() && scheduledStart.isAfter(dayjs())

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const list = await getAdminList()
        setAdmins(Array.isArray(list) ? list : [])
      } catch (err) {
        console.error('Failed to fetch admins', err)
      }
    }
    fetchAdmins()
  }, [])

  const handleCancelApproved = async () => {
    if (!approval?.approvalId || !isApprovedUpcoming || !onCancelApproved) return
    setSubmitting(true)
    try {
      await onCancelApproved(approval.approvalId)
      onRefresh?.()
    } finally {
      setSubmitting(false)
    }
  }

  if (!approval) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: token.colorBgLayout,
        }}
      >
        <Empty
          image={<ToolOutlined style={{ fontSize: 48, color: token.colorTextQuaternary }} />}
          styles={{ image: { height: 60 } }}
          description={<Text type="secondary">Select a request to view details</Text>}
        />
      </div>
    )
  }

  const details = approval.requestDetails || {}
  const requestExpiryDate = approval?.createdAt
    ? dayjs(approval.createdAt).add(REQUEST_EXPIRY_HOURS, 'hour')
    : null
  const requestExpiryText = requestExpiryDate?.isValid() && (approval?.status === 'pending' || approval?.status === 'expired')
    ? approval?.status === 'expired'
      ? `Request expired on ${requestExpiryDate.format('MMM D, YYYY HH:mm')}`
      : `Request expires on ${requestExpiryDate.format('MMM D, YYYY HH:mm')}`
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      <div style={{ padding: 16, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text strong style={{ fontSize: 16, lineHeight: '1.4' }}>
            {details.reason || 'No reason provided'}
          </Text>
          <Tag color={approval.status === 'pending' ? 'gold' : approval.status === 'approved' ? 'green' : approval.status === 'expired' ? 'default' : approval.status === 'cancelled' ? 'orange' : 'red'} style={{ textTransform: 'capitalize' }}>{approval.status}</Tag>
        </div>
      </div>

      <div style={{ padding: 16, flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Descriptions
          column={1}
          size="small"
          bordered
          style={{ marginBottom: 16 }}
          styles={{ label: { color: token.colorTextSecondary, width: 140 } }}
        >
          <Descriptions.Item label="ID">{approval.approvalId}</Descriptions.Item>
          <Descriptions.Item label="Requested by">
            <div>
              <div>
                {userName(approval.requestedBy)} {userEmail(approval.requestedBy) && `(${userEmail(approval.requestedBy)})`}
                {approval.createdAt && ` on ${dayjs(approval.createdAt).format('MMM D, YYYY HH:mm')}`}
              </div>
              {requestExpiryText && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {requestExpiryText}
                </Text>
              )}
            </div>
          </Descriptions.Item>
          {details.action !== 'disable' && (
            details.scheduledStartAt ? (
              <Descriptions.Item label="Starts">
                {dayjs(details.scheduledStartAt).format('MMM D, YYYY HH:mm')}
              </Descriptions.Item>
            ) : (
              <Descriptions.Item label="Starts">Immediately after approval</Descriptions.Item>
            )
          )}
          {details.expectedResumeAt && (
            <Descriptions.Item label="Resumes">
              {dayjs(details.expectedResumeAt).format('MMM D, YYYY HH:mm')}
            </Descriptions.Item>
          )}
          {details.message != null && details.message !== '' && details.message !== details.reason && (
            <Descriptions.Item label="Public Announcement Message">{details.message}</Descriptions.Item>
          )}
          {approval.executedAt && (
            <Descriptions.Item label="Executed at">
              {dayjs(approval.executedAt).format('MMM D, YYYY HH:mm')}
            </Descriptions.Item>
          )}
        </Descriptions>

        <MaintenanceVotePanel
          approval={approval}
          allApprovals={allApprovals}
          admins={admins}
          currentUser={currentUser}
          onApprove={onApprove}
          onUndoVote={onUndoVote}
          onRefresh={onRefresh}
          token={token}
        />

        {isApprovedUpcoming && (
          <Space style={{ marginTop: 16 }}>
            <Button danger loading={submitting} onClick={handleCancelApproved}>
              Request cancellation
            </Button>
          </Space>
        )}
      </div>
    </div>
  )
}
