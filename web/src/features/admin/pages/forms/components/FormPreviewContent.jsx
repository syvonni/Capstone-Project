import { Typography, Divider, Row, Col, Form, Input, theme } from 'antd'
import InfoGrid from '@/shared/components/InfoGrid'
import { PreviewField, PreviewSection, LobSection } from '@/shared/components/formPreview'

const { Text } = Typography

export default function FormPreviewContent({ sections, title, description, lastUpdated, fees = [], globalFees = [], notes = '', activeTab, disabled = false, version, createdAt, feeId, feeAmount, claimableDocuments = [] }) {
  const { token } = theme.useToken()

  if (!sections || sections.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Text type="secondary">No form sections available.</Text>
      </div>
    )
  }

  // Separate special sections from regular sections
  const requiredDocumentsSection = sections.find(section => section.type === 'required_documents')
  const regularSections = sections.filter(section => section.type !== 'required_documents')

  // Render content based on active tab
  if (activeTab === 'overview') {
    const formFees = fees.map(feeId => globalFees.find(f => f._id === feeId)).filter(Boolean)
    const totalFeeCost = formFees.reduce((sum, fee) => sum + (fee.amount || 0), 0)

    const formatRelativeTime = (dateStr) => {
      if (!dateStr) return 'N/A'
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }

    const formatCurrency = (amount) => {
      if (!amount) return 'N/A'
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
      }).format(amount)
    }

    const infoGridItems = [
      { label: 'Form Name', value: title || 'N/A' },
      {
        label: 'Application Fee',
        value: feeId && feeAmount ? formatCurrency(feeAmount) : 'N/A',
        ...(feeId && { to: `/admin/fees?selectedId=${feeId}&tab=application_fees` }),
      },
      { label: 'Version', value: version || '1' },
      { label: 'Created on', value: createdAt ? formatRelativeTime(createdAt) : 'N/A' },
      { label: 'Last updated on', value: lastUpdated ? formatRelativeTime(lastUpdated) : 'N/A' },
      { type: 'divider' },
      { label: 'Description', value: description || 'N/A' },
      { label: 'Notes', value: notes || 'N/A' },
    ]

    // Add claimable documents list if available
    if (claimableDocuments && claimableDocuments.length > 0) {
      infoGridItems.push({
        type: 'sublist',
        title: 'Claimable Documents',
        items: claimableDocuments.map(doc => ({
          text: doc.name || '(Untitled document)',
          to: `/admin/documents?selectedId=${doc._id}&tab=claimable_documents`,
        })),
      })
      infoGridItems.push({ type: 'divider' })
    }

    // Add required documents list if available
    if (requiredDocumentsSection && requiredDocumentsSection.items) {
      infoGridItems.push({
        type: 'sublist',
        title: 'Required Documents',
        items: requiredDocumentsSection.items.map(item => ({
          text: item.label || '(Untitled document)',
        })),
      })
      infoGridItems.push({ type: 'divider' })
    }

    if (formFees.length > 0) {
      infoGridItems.push({
        type: 'sublist',
        title: 'Fees',
        items: [
          ...formFees.map(fee => ({
            text: `${fee.name} - ₱${fee.amount.toLocaleString()}`,
          })),
          { text: `Total - ₱${totalFeeCost.toLocaleString()}` },
        ],
      })
    }

    return (
      <div>
        <InfoGrid
          noPadding
          items={infoGridItems}
        />
      </div>
    )
  }

  if (activeTab === 'form-details') {
    return (
      <div>
        <Form layout="vertical" requiredMark={false}>
          <Form.Item
            label={<span>Form Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
            rules={[
              {
                validator: (_, value) => {
                  if (!value || value.trim() === '') {
                    return Promise.reject('Form Name is required')
                  }
                  return Promise.resolve()
                }
              }
            ]}
          >
            <Input defaultValue={title || ''} />
          </Form.Item>
          <Form.Item
            label={<span>Description<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
            rules={[
              {
                validator: (_, value) => {
                  if (!value || value.trim() === '') {
                    return Promise.reject('Description is required')
                  }
                  return Promise.resolve()
                }
              }
            ]}
          >
            <Input.TextArea rows={4} defaultValue={description || ''} />
          </Form.Item>
          <Form.Item label="Notes">
            <Input.TextArea rows={4} defaultValue={notes || ''} placeholder="Admin notes (hidden from applicants)" />
          </Form.Item>
        </Form>
      </div>
    )
  }

  // Render required documents section
  if (activeTab === 'required-documents') {
    if (!requiredDocumentsSection) {
      return (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <Text type="secondary">No required documents for this form.</Text>
        </div>
      )
    }
    return (
      <div>
        {requiredDocumentsSection.description ? (
          <>
            <div style={{ color: token.colorTextTertiary }}>
              Section description
            </div>
            <div style={{ marginBottom: 16, color: token.colorText }}>
              {requiredDocumentsSection.description}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, marginBottom: 4, color: token.colorTextSecondary }}>
            Section description
          </div>
        )}
        {requiredDocumentsSection.notes && (
          <>
            <div style={{ color: token.colorTextTertiary  }}>
              Admin notes (Hidden)
            </div>
            <Text style={{ display: 'block', marginBottom: 12 }}>
              {requiredDocumentsSection.notes}
            </Text>
          </>
        )}
        <Divider />
        <Row gutter={[8, 8]}>
          {requiredDocumentsSection.items?.map((item, idx) => (
            <Col key={idx} span={item.span || 24}>
              <PreviewField field={item} disabled={disabled} />
            </Col>
          ))}
        </Row>
      </div>
    )
  }

  // Render LOB section
  if (activeTab === 'lob-section') {
    const lobSection = regularSections.find(section => section.type === 'lob_section')
    if (!lobSection) {
      return (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <Text type="secondary">No Line of Business section for this form.</Text>
        </div>
      )
    }
    return (
      <div>
        {lobSection.description ? (
          <>
            <div style={{ color: token.colorTextTertiary }}>
              Section description
            </div>
            <div style={{ marginBottom: 16, color: token.colorText }}>
              {lobSection.description}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, marginBottom: 4, color: token.colorTextSecondary }}>
            Section description
          </div>
        )}
        {lobSection.notes && (
          <>
            <div style={{ color: token.colorTextTertiary }}>
              Admin notes (Hidden)
            </div>
            <Text style={{ display: 'block', marginBottom: 8 }}>
              {lobSection.notes}
            </Text>
          </>
        )}
        <Divider />
        <LobSection isEditMode={false} />
      </div>
    )
  }

  // Render specific section
  const sectionIndex = parseInt(activeTab.replace('section-', ''), 10)
  const section = regularSections[sectionIndex]

  if (!section) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Text type="secondary">Section not found.</Text>
      </div>
    )
  }

  return (
    <div>
      <PreviewSection section={section} index={sectionIndex} disabled={disabled} />
    </div>
  )
}
