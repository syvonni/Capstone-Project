import { Typography, Space, Divider, Descriptions, Grid } from 'antd'
import { getFileUrlFromFormValue } from '../utils/applicationDetail.utils'
import FieldDecisionControl from './ApplicationFieldDecisionControl'
import DocumentViewer from '@/shared/components/DocumentViewer'
import { getFieldKey } from '@/features/staffs/lgu-officer/utils/fieldKeyUtils'
import DynamicFormRenderer from '@/shared/components/formPreview/DynamicFormRenderer'

const { Text } = Typography
const { useBreakpoint } = Grid

export default function ApplicationSectionContent({
  section,
  sectionIdx,
  formData,
  documents = {},
  token,
  isFinalState = false,
  formatDate,
  formatBoolean,
  formatCurrency,
  formatNumber,
  onViewDocument,
  _primaryLineOfBusiness,
  fieldReviewDecisions = {},
  onFieldDecision,
  reviewLocked = false,
  application,
  isResubmit = false,
  isOfficerDraft = false,
  form,
  onDocumentCid,
  isClaimedByMe = false,
}) {
  const screens = useBreakpoint()
  const isMobile = !screens.lg

  // Officer draft mode: render editable form (Form is wrapped by parent in ApplicationSectionTabs)
  if (isOfficerDraft && form) {
    return (
      <DynamicFormRenderer
        definition={{ sections: [section] }}
        form={form}
        formValues={formData}
        readOnly={!isClaimedByMe}
        businessId={application?.applicationId || application?._id}
        onDocumentCid={onDocumentCid}
        formDataKey={application?.applicationId}
        documents={application?.lguDocuments || {}}
        containerVariant="small"
        customPadding={true}
      />
    )
  }

  const items = section?.items || []
  if (!items.length) {
    return <Text type="secondary">No fields in this section.</Text>
  }

  const handleAccept = (fieldKey, payload = { status: 'accepted' }) => {
    if (onFieldDecision) onFieldDecision(fieldKey, payload)
  }
  const handleReject = (fieldKey, payload) => {
    if (onFieldDecision) onFieldDecision(fieldKey, payload)
  }

  // Build table data, expanding repeatable groups into multiple rows
  const tableData = []
  items.forEach((item, idx) => {
    const key = item.key || item.label
    const value = formData?.[key]
    const label = item.label || key || `Field ${idx + 1}`

    // Handle repeatable groups - expand each row
    if (item.type === 'repeatable_group') {
      if (!Array.isArray(value) || value.length === 0) {
        tableData.push({
          key: `${idx}`,
          field: label,
          value: 'N/A',
          fieldKey: getFieldKey(sectionIdx, item),
          decision: fieldReviewDecisions[getFieldKey(sectionIdx, item)],
          showDecision: false,
          item
        })
        return
      }
      value.forEach((row, rowIdx) => {
        const rowFieldKey = getFieldKey(sectionIdx, item, rowIdx)
        const rowDecision = fieldReviewDecisions[rowFieldKey]
        const rowValue = (
          <Descriptions
            column={1}
            size="small"
            bordered
            style={{ marginTop: 8 }}
          >
            {(item.groupFields || []).map((gf) => {
              const gk = gf.key || gf.label
              const gv = row?.[gk]
              const gLabel = gf.label || gk
              const gDisplay = gf.type === 'date' ? formatDate(gv) : (gv != null && gv !== '' ? String(gv) : '—')
              return (
                <Descriptions.Item key={gk} label={gLabel}>
                  {gDisplay}
                </Descriptions.Item>
              )
            })}
          </Descriptions>
        )
        tableData.push({
          key: `${idx}-${rowIdx}`,
          field: rowIdx === 0 ? label : '',
          value: rowValue,
          fieldKey: rowFieldKey,
          decision: rowDecision,
          showDecision: onFieldDecision || reviewLocked,
          item
        })
      })
      return
    }

    // Handle other field types
    let rendered = null
    if (item.type === 'file' || item.type === 'photo' || item.type === 'attachment') {
      const urlFromForm = getFileUrlFromFormValue(value)
      const lguDocuments = application?.lguDocuments || {}
      // Check for IPFS CID variant (e.g., occupancyPermit -> occupancyPermitIpfsCid)
      const ipfsCidKey = `${key}IpfsCid`
      const url = urlFromForm || lguDocuments[ipfsCidKey] || lguDocuments[key] || lguDocuments[item.label] || documents[item.documentKey] || documents[key] || documents[item.label] || ''
      rendered = <DocumentViewer url={url} label={label} onViewDocument={onViewDocument} token={token} />
    } else if (item.type === 'date') {
      rendered = formatDate(value)
    } else if (item.type === 'checkbox') {
      rendered = formatBoolean(value)
    } else if (item.type === 'number') {
      rendered = formatNumber(value)
    } else if (item.type === 'currency') {
      rendered = formatCurrency(value)
    } else if (item.type === 'multiline_text') {
      rendered = value || '—'
    } else if (item.type === 'address' || key === 'businessAddress' || key === 'lessorAddress' || key === 'locationOfActivity' || key === 'location') {
      // Handle address objects
      if (value && typeof value === 'object') {
        const parts = [
          value.streetAddress || value.street,
          value.barangayName || value.barangay,
          value.city,
          value.province,
          value.postalCode || value.zipCode
        ].filter(Boolean)
        rendered = parts.length > 0 ? parts.join(', ') : '—'
      } else {
        rendered = value || '—'
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Handle any other object that might be address-like
      const parts = [
        value.streetAddress || value.street,
        value.barangayName || value.barangay,
        value.city,
        value.province,
        value.postalCode || value.zipCode,
        value.address,
        value.fullAddress
      ].filter(Boolean)
      if (parts.length > 0) {
        rendered = parts.join(', ')
      } else {
        rendered = JSON.stringify(value)
      }
    } else {
      rendered = value != null && value !== '' ? String(value) : '—'
    }

    const fieldKey = getFieldKey(sectionIdx, item)
    const decision = fieldReviewDecisions[fieldKey]

    tableData.push({
      key: `${idx}`,
      field: label,
      value: rendered,
      fieldKey,
      decision,
      showDecision: onFieldDecision || reviewLocked,
      item
    })
  })

  return (
    <Space direction="vertical" size={0} style={{ width: '100%' }}>
      {tableData.map((record, idx) => (
        <div key={record.key}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '12px 0',
            gap: 8
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{record.field}</Text>
              <Text strong>{record.value}</Text>
            </div>
            {(onFieldDecision || reviewLocked) && (
              <div style={{ width: isMobile ? '100%' : 'auto', alignSelf: 'flex-start' }}>
                <FieldDecisionControl
                  fieldKey={record.fieldKey}
                  decision={record.decision}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  token={token}
                  disabled={reviewLocked}
                  isMobile={isMobile}
                  isFinalState={isFinalState}
                  isResubmit={isResubmit}
                />
              </div>
            )}
          </div>
          {idx < tableData.length - 1 && <Divider style={{ margin: 0 }} />}
        </div>
      ))}
    </Space>
  )
}
