import { useState, useEffect } from 'react'
import { Typography, Collapse, theme } from 'antd'
import { get } from '@/lib/http.js'

const { Paragraph } = Typography

export default function DynamicFaqSection({ slotId, fallbackSlotId, style, hideWrapper = false, hideHeader = false }) {
  const [faqData, setFaqData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentSlotId, setCurrentSlotId] = useState(slotId)
  const { token } = theme.useToken()

  useEffect(() => {
    setCurrentSlotId(slotId)
  }, [slotId])

  useEffect(() => {
    let cancelled = false
    const fetchFaq = async () => {
      try {
        setLoading(true)
        const res = await get(`/api/cms/faq/${currentSlotId}`)
        if (!cancelled) {
          const hasItems = res?.items && res.items.length > 0
          if (!hasItems && fallbackSlotId && currentSlotId !== fallbackSlotId) {
            setCurrentSlotId(fallbackSlotId)
          } else {
            setFaqData(res)
          }
        }
      } catch {
        if (!cancelled) {
          if (fallbackSlotId && currentSlotId !== fallbackSlotId) {
            setCurrentSlotId(fallbackSlotId)
          } else {
            setFaqData(null)
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    fetchFaq()
    return () => { cancelled = true }
  }, [currentSlotId, fallbackSlotId])

  if (loading || !faqData) {
    return null
  }

  const faqItems = (faqData.items || []).map((item) => ({
    key: item.key,
    label: item.question,
    children: (
      <Paragraph style={{ marginBottom: 0 }}>
        {item.answer}
      </Paragraph>
    ),
  }))

  const content = (
    <>
      {!hideHeader && (
        <Typography.Title
          level={4}
          style={{
            marginTop: 0,
            marginBottom: 8,
            textAlign: 'left',
          }}
        >
          {faqData.title || 'Frequently Asked Questions'}
        </Typography.Title>
      )}
      {!hideHeader && faqData.subtitle && (
        <Paragraph
          type="secondary"
          style={{
            marginBottom: 8,
            textAlign: 'left',
          }}
        >
          {faqData.subtitle}
        </Paragraph>
      )}
      <Collapse
        items={faqItems}
        defaultActiveKey={faqItems[0]?.key}
        style={{ background: token.colorBgContainer, textAlign: 'left', width: '100%', height: '100%' }}
      />
    </>
  )

  if (hideWrapper) {
    return <div style={style}>{content}</div>
  }

  return (
    <section style={{ width: '100%', maxWidth: 1280, margin: '0 auto', ...style }}>
      <div
        style={{
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          padding: '24px 28px',
          background: token.colorBgLayout,
        }}
      >
        {content}
      </div>
    </section>
  )
}
