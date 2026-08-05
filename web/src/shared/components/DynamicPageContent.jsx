import { useState, useEffect } from 'react'
import { Layout, Typography, Collapse, theme, Skeleton, Grid, Menu, List, Drawer, Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import { MenuOutlined } from '@ant-design/icons'
import { get } from '@/lib/http.js'
import HomeHeader from '@/features/public/components/HomeHeader'
import HomeFooter from '@/features/public/components/HomeFooter'
import dayjs from 'dayjs'

const { Content, Sider } = Layout
const { Title, Paragraph, Text } = Typography
const { useBreakpoint } = Grid

export default function DynamicPageContent({ slotId, embedded = false, compact = false }) {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const navigate = useNavigate()
  const [pageData, setPageData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeChapterId, setActiveChapterId] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    const fetchPage = async () => {
      try {
        setLoading(true)
        const res = await get(`/api/cms/pages/${slotId}`)
        if (!cancelled) setPageData(res)
      } catch {
        if (!cancelled) setPageData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchPage()
    return () => { cancelled = true }
  }, [slotId])

  // Set first chapter as active when data loads
  useEffect(() => {
    if (pageData?.chapters && pageData.chapters.length > 0 && !activeChapterId) {
      setActiveChapterId(pageData.chapters[0]._id)
    }
  }, [pageData, activeChapterId])

  const isChapterBased = pageData?.chapters && pageData.chapters.length > 0
  const activeChapter = isChapterBased ? pageData.chapters.find(ch => ch._id === activeChapterId) : null

  // Legacy: single-document sections
  const collapseItems = (pageData?.sections || []).map((section) => ({
    key: section.key,
    label: section.title,
    children: (
      <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-line' }}>
        {section.body}
      </Paragraph>
    ),
  }))

  // Chapter sections collapse items
  const chapterCollapseItems = (activeChapter?.sections || []).map((section) => ({
    key: section.key,
    label: section.title,
    children: (
      <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-line' }}>
        {section.body}
      </Paragraph>
    ),
  }))

  const pageTitle = pageData ? {
    'privacy-policy': 'Privacy Policy',
    'terms-of-service': 'Terms of Service',
    'bizclear-manual': 'BizClear Manual',
    'business-owners-manual': 'Business Owners Manual',
  }[pageData.slotId] || pageData.slotId : ''

  // Desktop: Left sidebar TOC + right content
  if (!embedded && !compact && screens.md && isChapterBased) {
    const menuItems = pageData.chapters.map((ch, idx) => ({
      key: ch._id,
      label: `${idx + 1}. ${ch.title}`,
    }))

    return (
      <Layout style={{ minHeight: '100vh', background: token.colorBgContainer }}>
        <HomeHeader onNavigate={navigate} />
        <Layout style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          <Sider
            width={240}
            style={{
              background: token.colorBgContainer,
              padding: '96px 0',
              overflow: 'auto',
              position: 'sticky',
            }}
          >
            <style>{`
              .ant-menu-item-selected {
                background-color: transparent !important;
                border-left: 2px solid ${token.colorPrimary} !important;
                color: ${token.colorPrimary} !important;
              }
              .ant-menu-item:hover {
                background-color: transparent !important;
              }
            `}</style>
            <Menu
              mode="inline"
              selectedKeys={[activeChapterId]}
              items={menuItems}
              onClick={({ key }) => setActiveChapterId(key)}
              style={{ borderRight: 0 }}
            />
          </Sider>
          <Content style={{ padding: '96px 48px 0', minHeight: 'calc(100vh - 64px)',  background: token.colorBgContainer  }}>
            {loading ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : !activeChapter ? (
              <Text type="secondary">Chapter not found.</Text>
            ) : (
              <Typography>
                <Title level={2} style={{ marginTop: 0 }}>{pageTitle}</Title>
                <Title level={4} style={{ marginTop: 24 }}>{activeChapter.order + 1}. {activeChapter.title}</Title>
                {activeChapter.introText && (
                  <Paragraph style={{ marginBottom: 24 }}>{activeChapter.introText}</Paragraph>
                )}
                {chapterCollapseItems.length > 0 && (
                  <Collapse
                    defaultActiveKey={[chapterCollapseItems[0]?.key]}
                    items={chapterCollapseItems}
                    style={{ background: token.colorBgContainer, textAlign: 'left', width: '100%', height: '100%' }}
                  />
                )}
              </Typography>
            )}
          </Content>
        </Layout>
        <HomeFooter />
      </Layout>
    )
  }

  // Mobile or embedded/compact: Vertical chapter list
  return (
    <Layout style={{ minHeight: embedded ? 'auto' : '100vh', background: token.colorBgContainer }}>
      {!embedded && <HomeHeader onNavigate={navigate} />}
      <Content style={{
        padding: compact ? 0 : (embedded ? '16px' : `${screens.md ? '160px' : '100px'} 16px 24px 16px`),
        maxWidth: compact ? 'none' : 720,
        margin: compact ? 0 : '0 auto',
        width: '100%',
      }}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : !pageData ? (
          <Typography>
            <Paragraph type="secondary">Page content not available.</Paragraph>
          </Typography>
        ) : isChapterBased ? (
          <Typography>
            {!embedded && <Title level={screens.md ? 2 : 4} style={{ marginTop: 0 }}>{pageTitle}</Title>}
            {!embedded && !screens.md && (
              <Button
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuOpen(true)}
                style={{ marginBottom: 16 }}
              >
                Chapters
              </Button>
            )}
            {activeChapter && (
              <>
                <Title level={screens.md ? 3 : 5} style={{ marginTop: 8 }}>{activeChapter.order + 1}. {activeChapter.title}</Title>
                {activeChapter.introText && (
                  <Paragraph style={{ marginBottom: 16 }}>{activeChapter.introText}</Paragraph>
                )}
                {chapterCollapseItems.length > 0 && (
                  <Collapse
                    defaultActiveKey={[chapterCollapseItems[0]?.key]}
                    items={chapterCollapseItems}
                    style={{ background: token.colorBgContainer, textAlign: 'left', width: '100%', height: '100%' }}
                  />
                )}
              </>
            )}
            {!embedded && !screens.md && (
              <Drawer
                title="Chapters"
                placement="left"
                onClose={() => setMobileMenuOpen(false)}
                open={mobileMenuOpen}
              >
                <List
                  dataSource={pageData.chapters}
                  renderItem={(ch, idx) => (
                    <List.Item
                      onClick={() => {
                        setActiveChapterId(ch._id)
                        setMobileMenuOpen(false)
                      }}
                      style={{ cursor: 'pointer', background: ch._id === activeChapterId ? token.colorBgLayout : undefined }}
                    >
                      <Text strong={ch._id === activeChapterId}>{idx + 1}. {ch.title}</Text>
                    </List.Item>
                  )}
                />
              </Drawer>
            )}
          </Typography>
        ) : (
          <Typography>
            {!embedded && <Title level={screens.md ? 2 : 4} style={{ marginTop: 0 }}>{pageData.title}</Title>}
            {pageData.updatedAt && !embedded && (
              <Paragraph type="secondary" style={{ marginBottom: 24 }}>
                Last updated: {dayjs(pageData.updatedAt).format('MMMM D, YYYY')}
              </Paragraph>
            )}
            {pageData.introText && (
              <Paragraph>{pageData.introText}</Paragraph>
            )}
            {collapseItems.length > 0 && (
              <Collapse
                defaultActiveKey={[collapseItems[0]?.key]}
                items={collapseItems}
              />
            )}
          </Typography>
        )}
      </Content>
      {!embedded && <HomeFooter />}
    </Layout>
  )
}
