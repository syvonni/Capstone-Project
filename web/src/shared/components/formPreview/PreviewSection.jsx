import { Typography, Divider, Row, Col, Tag, theme } from 'antd'
import { PreviewField } from './PreviewField'

const { Text } = Typography

export function PreviewSection({ section, _index, disabled = false, editable = false, form = null, businessId = null, onDocumentCid = null, onSaveDraft = null }) {
  const { token } = theme.useToken()

  return (
    <div>
      {section.description ? (
        <>
          <div style={{ color: token.colorTextTertiary }}>
            Section description
          </div>
          <div style={{ marginBottom: 16, color: token.colorText }}>
            {section.description}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
          Section description
        </div>
      )}
      {section.notes && (
        <>
          <div style={{ color: token.colorTextTertiary, }}>
            Admin notes (Hidden)
          </div>
          <Text style={{ display: 'block', marginBottom: 12 }}>
            {section.notes}
          </Text>
        </>
      )}
      {section.showWhen && (
        <div style={{ marginBottom: 12 }}>
          <Tag color="orange">Conditional</Tag>
          <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
            Shows when: {JSON.stringify(section.showWhen)}
          </Text>
        </div>
      )}
      <Divider />
      <Row gutter={[8, 8]}>
        {section.items && section.items.map((item, idx) => {
          const span = item.span || 24
          // Responsive breakpoints: full width on mobile/tablet, configured span on desktop
          return (
            <Col key={idx} xs={24} sm={24} md={span} lg={span} xl={span}>
              <PreviewField 
                field={item} 
                disabled={disabled} 
                editable={editable}
                form={form}
                businessId={businessId}
                onDocumentCid={onDocumentCid}
                onSaveDraft={onSaveDraft}
              />
            </Col>
          )
        })}
      </Row>
    </div>
  )
}
