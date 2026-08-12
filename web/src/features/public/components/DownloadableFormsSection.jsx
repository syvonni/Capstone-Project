import { Typography, Collapse, theme, Tag, Space, Button, Grid } from 'antd'
import { FilePdfOutlined, FileWordOutlined, FileExcelOutlined, DownloadOutlined } from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography
const { useBreakpoint } = Grid

const FILE_ICONS = {
  pdf: <FilePdfOutlined />,
  doc: <FileWordOutlined />,
  docx: <FileWordOutlined />,
  xls: <FileExcelOutlined />,
  xlsx: <FileExcelOutlined />,
}

// Seeded downloadable forms data
const DOWNLOADABLE_FORMS = [
  {
    category: 'Application Forms',
    key: 'app-forms',
    forms: [
      {
        id: 'app-1',
        label: 'Unified Business Permit Application Form',
        fileType: 'pdf',
        fileSize: 245000,
        fileUrl: '#',
        description: 'Standard application form for all business types'
      },
      {
        id: 'app-2',
        label: 'Mayor\'s Permit Application Form',
        fileType: 'pdf',
        fileSize: 180000,
        fileUrl: '#',
        description: 'Application form for Mayor\'s Permit'
      },

    ]
  },
  {
    category: 'Sample Filled Forms',
    key: 'sample-forms',
    forms: [
      {
        id: 'sample-1',
        label: 'Sample Filled Business Permit Application',
        fileType: 'pdf',
        fileSize: 320000,
        fileUrl: '#',
        description: 'Example of a completed application form'
      },

    ]
  },
  {
    category: 'Ordinances',
    key: 'ordinances',
    forms: [
      {
        id: 'ord-1',
        label: 'Revenue Code of Alaminos City',
        fileType: 'pdf',
        fileSize: 1500000,
        fileUrl: '#',
        description: 'Complete revenue code and tax ordinances'
      },
      {
        id: 'ord-2',
        label: 'Business Permit Ordinance No. 2023-001',
        fileType: 'pdf',
        fileSize: 450000,
        fileUrl: '#',
        description: 'Latest ordinance on business permits'
      },
      {
        id: 'ord-3',
        label: 'Zoning Ordinance',
        fileType: 'pdf',
        fileSize: 890000,
        fileUrl: '#',
        description: 'City zoning regulations and requirements'
      },
    ]
  },
  {
    category: 'Fee Schedules',
    key: 'fee-schedules',
    forms: [
      {
        id: 'fee-1',
        label: '2024 Schedule of Fees and Charges',
        fileType: 'xlsx',
        fileSize: 125000,
        fileUrl: '#',
        description: 'Complete fee schedule for all business types'
      },
      {
        id: 'fee-2',
        label: 'Environmental Protection Fee Schedule',
        fileType: 'pdf',
        fileSize: 95000,
        fileUrl: '#',
        description: 'EPF rates and computation guide'
      },
      {
        id: 'fee-3',
        label: 'Sanitary Inspection Fee Schedule',
        fileType: 'pdf',
        fileSize: 78000,
        fileUrl: '#',
        description: 'Sanitary inspection fees and requirements'
      },
    ]
  },
  {
    category: 'Business Guidelines',
    key: 'guidelines',
    forms: [
      {
        id: 'guide-1',
        label: 'Business Permit Application Guidelines',
        fileType: 'pdf',
        fileSize: 520000,
        fileUrl: '#',
        description: 'Step-by-step guide for new applicants'
      },

      {
        id: 'guide-3',
        label: 'Line of Business Classification Guide',
        fileType: 'pdf',
        fileSize: 750000,
        fileUrl: '#',
        description: 'Complete list of business categories and codes'
      },
    ]
  },
  {
    category: 'Checklists',
    key: 'checklists',
    forms: [
      {
        id: 'check-1',
        label: 'New Business Application Checklist',
        fileType: 'pdf',
        fileSize: 145000,
        fileUrl: '#',
        description: 'Required documents for new business applications'
      },

      {
        id: 'check-3',
        label: 'Document Requirements by Business Type',
        fileType: 'xlsx',
        fileSize: 98000,
        fileUrl: '#',
        description: 'Matrix of requirements per business category'
      },
    ]
  },
]

export default function DownloadableFormsSection() {
  const screens = useBreakpoint()
  const { token } = theme.useToken()

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (fileType) => {
    return FILE_ICONS[fileType?.toLowerCase()] || <FilePdfOutlined />
  }

  const collapseItems = DOWNLOADABLE_FORMS.map((category) => ({
    key: category.key,
    label: (
      <Space size={8}>
        <Text strong>{category.category}</Text>
        <Tag>{category.forms.length} files</Tag>
      </Space>
    ),
    children: (
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {category.forms.map((form) => (
          <div
            key={form.id}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              padding: '12px',
              borderRadius: token.borderRadius,
              background: token.colorBgContainer,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <span style={{ fontSize: 20, color: token.colorPrimary, flexShrink: 0 }}>
              {getFileIcon(form.fileType)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong style={{ display: 'block', marginBottom: 4, fontSize: '14px' }}>
                {form.label}
              </Text>
              <Paragraph
                type="secondary"
                style={{ marginBottom: 8, fontSize: '13px', lineHeight: 1.5 }}
              >
                {form.description}
              </Paragraph>
              <Space size={8}>
                <Tag>{form.fileType?.toUpperCase()}</Tag>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {formatFileSize(form.fileSize)}
                </Text>
              </Space>
            </div>
            <Button
              type="primary"
              size="small"
              icon={<DownloadOutlined />}
              href={form.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flexShrink: 0 }}
            >
              Download
            </Button>
          </div>
        ))}
      </Space>
    ),
  }))

  return (
    <section style={{ 
      width: '100%', 
      maxWidth: 1280, 
      margin: '0 auto',
    }}>
      <div
        style={{
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          padding: screens.md ? '24px 28px' : '18px 14px',
          background: token.colorBgLayout,
        }}
      >
        <Title
          level={4}
          style={{
            marginTop: 0,
            marginBottom: 8,
            textAlign: screens.md ? 'left' : 'center',
          }}
        >
          Downloadable Forms
        </Title>
        <Paragraph
          type="secondary"
          style={{
            marginBottom: 16,
            textAlign: screens.md ? 'left' : 'center',
          }}
        >
          Access application forms, sample documents, ordinances, fee schedules, guidelines, and checklists.
        </Paragraph>
        <Collapse
          items={collapseItems}
          defaultActiveKey={['app-forms']}
          style={{ background: token.colorBgContainer, textAlign: 'left' }}
        />
      </div>
    </section>
  )
}
