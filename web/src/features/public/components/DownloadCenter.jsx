import { Typography, Grid, theme, Collapse, Button } from 'antd'
import { DownloadOutlined, EditOutlined, FileTextOutlined, CopyOutlined, BookOutlined, DollarOutlined, ReadOutlined, CheckSquareOutlined } from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography
const { useBreakpoint } = Grid

function resolveIpfsUrl(cid) {
  if (!cid) return '#'
  if (cid.startsWith('http')) return cid
  const gateway = import.meta.env.VITE_IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs/'
  return `${gateway}${cid}`
}

const DOWNLOAD_CATEGORIES = [
  {
    key: 'application-forms',
    label: 'Application Forms',
    icon: <FileTextOutlined />,
    items: [
      { 
        name: 'New Business Permit Application', 
        type: 'PDF', 
        size: '245 KB',
        cid: 'QmSample1',
        fileName: 'new_business_permit_application.pdf'
      },

      { 
        name: 'Business Closure Form', 
        type: 'PDF', 
        size: '156 KB',
        cid: 'QmSample3',
        fileName: 'business_closure_form.pdf'
      },
    ],
  },
  {
    key: 'sample-forms',
    label: 'Sample Filled Forms',
    icon: <CopyOutlined />,
    items: [
      { 
        name: 'Sample New Business Application', 
        type: 'PDF', 
        size: '312 KB',
        cid: 'QmSample4',
        fileName: 'sample_new_business_application.pdf'
      },
      { 
        name: 'Sample Renewal Application', 
        type: 'PDF', 
        size: '287 KB',
        cid: 'QmSample5',
        fileName: 'sample_renewal_application.pdf'
      },
    ],
  },
  {
    key: 'ordinances',
    label: 'Ordinances',
    icon: <BookOutlined />,
    items: [
      { 
        name: 'Business Tax Ordinance 2023', 
        type: 'PDF', 
        size: '1.2 MB',
        cid: 'QmSample6',
        fileName: 'business_tax_ordinance_2023.pdf'
      },
      { 
        name: 'Zoning Ordinance', 
        type: 'PDF', 
        size: '890 KB',
        cid: 'QmSample7',
        fileName: 'zoning_ordinance.pdf'
      },
      { 
        name: 'Health and Sanitation Ordinance', 
        type: 'PDF', 
        size: '756 KB',
        cid: 'QmSample8',
        fileName: 'health_sanitation_ordinance.pdf'
      },
    ],
  },
  {
    key: 'fee-schedules',
    label: 'Fee Schedules',
    icon: <DollarOutlined />,
    items: [
      { 
        name: '2024 Business Permit Fee Schedule', 
        type: 'PDF', 
        size: '234 KB',
        cid: 'QmSample9',
        fileName: '2024_business_permit_fee_schedule.pdf'
      },
      { 
        name: 'Inspection Fee Schedule', 
        type: 'PDF', 
        size: '178 KB',
        cid: 'QmSample10',
        fileName: 'inspection_fee_schedule.pdf'
      },
    ],
  },
  {
    key: 'guidelines',
    label: 'Business Guidelines',
    icon: <ReadOutlined />,
    items: [
      { 
        name: 'Business Permit Application Guide', 
        type: 'PDF', 
        size: '456 KB',
        cid: 'QmSample11',
        fileName: 'business_permit_application_guide.pdf'
      },
      { 
        name: 'Document Requirements Checklist', 
        type: 'PDF', 
        size: '198 KB',
        cid: 'QmSample12',
        fileName: 'document_requirements_checklist.pdf'
      },
      { 
        name: 'Step-by-Step Application Process', 
        type: 'PDF', 
        size: '312 KB',
        cid: 'QmSample13',
        fileName: 'step_by_step_application_process.pdf'
      },
    ],
  },
  {
    key: 'checklists',
    label: 'Checklists',
    icon: <CheckSquareOutlined />,
    items: [
      { 
        name: 'New Business Checklist', 
        type: 'PDF', 
        size: '145 KB',
        cid: 'QmSample14',
        fileName: 'new_business_checklist.pdf'
      },
      { 
        name: 'Renewal Checklist', 
        type: 'PDF', 
        size: '132 KB',
        cid: 'QmSample15',
        fileName: 'renewal_checklist.pdf'
      },
      { 
        name: 'Document Submission Checklist', 
        type: 'PDF', 
        size: '167 KB',
        cid: 'QmSample16',
        fileName: 'document_submission_checklist.pdf'
      },
    ],
  },
]

export default function DownloadCenter() {
  const { token } = theme.useToken()
  const screens = useBreakpoint()

  const downloadItems = DOWNLOAD_CATEGORIES.map((category) => ({
    key: category.key,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {category.icon}
        <span>{category.label}</span>
        <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>
          {category.items.length} items
        </Text>
      </div>
    ),
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: screens.md ? 12 : 10 }}>
        {category.items.map((item, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: screens.md ? 'center' : 'flex-start',
              padding: screens.md ? '14px 18px' : '12px 14px',
              background: token.colorBgContainer,
              borderRadius: token.borderRadius,
              border: `1px solid ${token.colorBorder}`,
              transition: 'all 0.2s',
              gap: screens.md ? 0 : 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: screens.md ? 1 : 'auto', minWidth: 0 }}>
              <DownloadOutlined style={{ color: token.colorPrimary, fontSize: screens.md ? '16px' : '14px', flexShrink: 0 }} />
              <Text 
                style={{ 
                  fontSize: screens.md ? '14px' : '13px', 
                  color: token.colorText,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {item.name}
              </Text>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: screens.md ? 8 : 6,
              flexShrink: 0,
              flexWrap: screens.md ? 'nowrap' : 'wrap'
            }}>
              {!screens.sm && (
                <>
                  <Text type="secondary" style={{ fontSize: screens.md ? '12px' : '11px' }}>
                    {item.type}
                  </Text>
                  <Text type="secondary" style={{ fontSize: screens.md ? '12px' : '11px' }}>
                    • {item.size}
                  </Text>
                </>
              )}
              {screens.sm && (
                <Text type="secondary" style={{ fontSize: '11px', marginRight: 4 }}>
                  {item.type} • {item.size}
                </Text>
              )}
              <Button
                type="link"
                size={screens.md ? 'small' : 'small'}
                icon={<EditOutlined />}
                onClick={() => console.log('Edit:', item.name)}
                style={{ padding: screens.md ? '0 8px' : '0 4px', fontSize: screens.md ? '14px' : '12px' }}
              >
                {screens.md ? 'Edit' : ''}
              </Button>
              <Button
                type="link"
                size={screens.md ? 'small' : 'small'}
                icon={<DownloadOutlined />}
                href={resolveIpfsUrl(item.cid)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding: screens.md ? '0 8px' : '0 4px', fontSize: screens.md ? '14px' : '12px' }}
              >
                {screens.md ? 'Download' : ''}
              </Button>
            </div>
          </div>
        ))}
      </div>
    ),
  }))

  return (
    <section id="download-center" style={{ width: '100%', maxWidth: 1280, margin: '0 auto', padding: screens.md ? '0 20px' : '0 16px' }}>
      <div
        style={{
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          padding: screens.md ? '32px 36px' : '24px 20px',
          background: token.colorBgLayout,
        }}
      >
        <Title
          level={4}
          style={{
            marginTop: 0,
            marginBottom: screens.md ? 12 : 8,
            textAlign: screens.md ? 'left' : 'center',
            fontSize: screens.md ? 20 : 18,
          }}
        >
          Download Center
        </Title>
        <Paragraph
          type="secondary"
          style={{
            marginBottom: screens.md ? 24 : 16,
            textAlign: screens.md ? 'left' : 'center',
            fontSize: screens.md ? 14 : 13,
            lineHeight: 1.6,
          }}
        >
          Access application forms, guidelines, ordinances, and other essential documents for your business permit application.
        </Paragraph>
        <Collapse
          items={downloadItems}
          defaultActiveKey={['application-forms']}
          style={{ background: token.colorBgContainer, textAlign: 'left' }}
          size={screens.md ? 'middle' : 'small'}
        />
      </div>
    </section>
  )
}
