import { useState, useEffect, useMemo } from 'react'
import { Typography, Space, Button, Select, Input, Divider, Spin, Alert } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { getLobs } from '@/shared/services/lobService'
import { getTaxCodeOptions, getLobsByCategory, mapTaxCodeToCategory } from '@/shared/utils/lobApiUtils'
import FieldDecisionControl from './ApplicationFieldDecisionControl'

const { Text } = Typography

export default function LobReviewBlock({
  formData,
  fieldReviewDecisions = {},
  onFieldDecision,
  onSaveLob,
  _token,
  _saving = false,
  primaryLineOfBusiness,
  reviewLocked = false,
  isFinalState = false,
}) {
  const desc = formData?.businessDescriptionText ?? ''
  const activities = useMemo(() => Array.isArray(formData?.businessActivities) ? formData.businessActivities : [], [formData?.businessActivities])
  const [localActivities, setLocalActivities] = useState(activities.map((a) => ({
    taxCode: a.taxCode ?? '',
    lineOfBusiness: a.lineOfBusiness ?? '',
    detailedLineOfBusiness: a.detailedLineOfBusiness ?? a.detailedLine ?? '',
  })))
  const [lobs, setLobs] = useState([])
  const [lobsLoading, setLobsLoading] = useState(true)
  const [lobsError, setLobsError] = useState(null)

  useEffect(() => {
    setLocalActivities(activities.map((a) => ({
      taxCode: a.taxCode ?? '',
      lineOfBusiness: a.lineOfBusiness ?? '',
      detailedLineOfBusiness: a.detailedLineOfBusiness ?? a.detailedLine ?? '',
    })))
  }, [activities])

  useEffect(() => {
    const loadLobs = async () => {
      setLobsLoading(true)
      setLobsError(null)
      try {
        const response = await getLobs({ isActive: true })
        setLobs(response || [])
      } catch (error) {
        console.error('Failed to load LOBs:', error)
        setLobsError('Failed to load line of business data')
        setLobs([])
      } finally {
        setLobsLoading(false)
      }
    }
    loadLobs()
  }, [])

  const handleAccept = (fieldKey, payload) => {
    console.log('[LobReviewBlock] handleAccept called:', { fieldKey, payload })
    if (onFieldDecision) onFieldDecision(fieldKey, payload || { status: 'accepted' })
  }
  const handleReject = (fieldKey, payload) => {
    console.log('[LobReviewBlock] handleReject called:', { fieldKey, payload })
    if (onFieldDecision) onFieldDecision(fieldKey, payload)
  }

  const addRow = () => {
    setLocalActivities((prev) => {
      const newRow = { taxCode: '', lineOfBusiness: '', detailedLineOfBusiness: '' }
      const updated = [...prev, newRow]
      // Auto-save
      if (onSaveLob) {
        onSaveLob({
          businessDescriptionText: desc,
          businessActivities: updated.filter((a) => a.taxCode || a.lineOfBusiness || a.detailedLineOfBusiness),
        })
      }
      return updated
    })
  }
  const removeRow = (index) => {
    setLocalActivities((prev) => {
      const updated = prev.filter((_, i) => i !== index)
      // Auto-save
      if (onSaveLob) {
        onSaveLob({
          businessDescriptionText: desc,
          businessActivities: updated.filter((a) => a.taxCode || a.lineOfBusiness || a.detailedLineOfBusiness),
        })
      }
      return updated
    })
  }
  const updateRow = (index, field, value) => {
    setLocalActivities((prev) => {
      const updated = prev.map((row, i) => 
        i === index ? { ...row, [field]: value } : row
      )
      // Auto-save
      if (onSaveLob) {
        onSaveLob({
          businessDescriptionText: desc,
          businessActivities: updated.filter((a) => a.taxCode || a.lineOfBusiness || a.detailedLineOfBusiness),
        })
      }
      return updated
    })
  }

  const taxCodeOptions = useMemo(() => getTaxCodeOptions(lobs), [lobs])
  const getDetailedForTaxCode = (taxCode) => {
    const category = mapTaxCodeToCategory(lobs, taxCode)
    const detailedLines = getLobsByCategory(lobs, category)
    return detailedLines.map((d) => ({ value: d.name, label: d.name }))
  }

  return (
    <Space direction="vertical" size={0} style={{ width: '100%' }}>
      {lobsLoading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin size="large" />
        </div>
      ) : lobsError ? (
        <Alert
          message="Error"
          description={lobsError}
          type="error"
          showIcon
        />
      ) : (
        <>
          {/* Business description - read-only */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '12px 0',
            gap: 8
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Business description</Text>
              <Text strong>{desc || '—'}</Text>
            </div>
            {(onFieldDecision || reviewLocked) && (
              <div style={{ width: 'auto', alignSelf: 'flex-start' }}>
                <FieldDecisionControl
                  fieldKey="businessDescriptionText"
                  decision={fieldReviewDecisions["businessDescriptionText"]}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  _token={_token}
                  disabled={reviewLocked}
                  hideRequest={true}
                  isFinalState={isFinalState}
                />
              </div>
            )}
          </div>
          <Divider style={{ margin: 0 }} />

          {/* Lines of business - editable */}
          {localActivities.length === 0 && !primaryLineOfBusiness && (
            <>
              <div style={{ padding: '12px 0' }}>
                <Text type="secondary">No activities. Add a row or they will be filled from primary line of business.</Text>
              </div>
              {!reviewLocked && (
                <Button type="dashed" block icon={<PlusOutlined />} onClick={addRow}>
                  Add line of business
                </Button>
              )}
            </>
          )}
          {localActivities.length > 0 && (
            <>
              {localActivities.map((row, i) => (
                <div key={i}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px 0',
                    gap: 8
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                        {i === 0 ? 'Line of business' : ''}
                      </Text>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Select
                          placeholder="Tax code"
                          options={taxCodeOptions}
                          value={row.taxCode || undefined}
                          onChange={(v) => {
                            updateRow(i, 'taxCode', v)
                            updateRow(i, 'lineOfBusiness', v || '')
                          }}
                          style={{ width: '100%' }}
                          allowClear
                          disabled={reviewLocked}
                        />
                        <Input
                          placeholder="Line of business"
                          value={row.lineOfBusiness}
                          onChange={(e) => updateRow(i, 'lineOfBusiness', e.target.value)}
                          style={{ width: '100%' }}
                          disabled={reviewLocked}
                        />
                        <Select
                          placeholder="Detailed line"
                          options={getDetailedForTaxCode(row.taxCode)}
                          value={row.detailedLineOfBusiness || undefined}
                          onChange={(v) => updateRow(i, 'detailedLineOfBusiness', v)}
                          style={{ width: '100%' }}
                          allowClear
                          disabled={reviewLocked}
                        />
                      </Space>
                    </div>
                    {(onFieldDecision || reviewLocked) && (
                      <div style={{ width: 'auto', alignSelf: 'flex-start' }}>
                        <Space.Compact>
                          <FieldDecisionControl
                            fieldKey={`businessActivities.${i}`}
                            decision={fieldReviewDecisions[`businessActivities.${i}`]}
                            onAccept={handleAccept}
                            onReject={handleReject}
                            _token={_token}
                            disabled={reviewLocked}
                            hideRequest={true}
                            isFinalState={isFinalState}
                          />
                          {!reviewLocked && (
                            <Button
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => removeRow(i)}
                              disabled={reviewLocked}
                            />
                          )}
                        </Space.Compact>
                      </div>
                    )}
                  </div>
                  {i < localActivities.length - 1 && <Divider style={{ margin: 0 }} />}
                </div>
              ))}
              {!reviewLocked && (
                <Button type="dashed" block icon={<PlusOutlined />} onClick={addRow} style={{ marginTop: 12 }}>
                  Add line of business
                </Button>
              )}
            </>
          )}
        </>
      )}
    </Space>
  )
}
