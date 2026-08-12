import { useState, useEffect } from 'react'
import { Typography, Collapse, Space, Divider, theme } from 'antd'
import { get } from '@/lib/http.js'
import ResponsiveModal from '@/shared/components/ResponsiveModal'

const { Text } = Typography

function InfoContent({ infoData, token }) {
  const faqItems = (infoData.faqItems || []).map((item) => ({
    key: item.key,
    label: item.question,
    children: <Text>{item.answer}</Text>,
  }))

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {infoData.description && (
        <Text>{infoData.description}</Text>
      )}

      {infoData.bulletPoints && infoData.bulletPoints.length > 0 && (
        <>
          <Divider style={{ margin: '8px 0' }} />
          <div>
            <Text strong>What you can do</Text>
            <ul style={{ margin: '4px 0 0 0', paddingLeft: 20 }}>
              {infoData.bulletPoints.map((bp, idx) => (
                <li key={idx}>
                  <Text>
                    <strong>{bp.title}</strong> — {bp.content}
                  </Text>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {faqItems.length > 0 && (
        <>
          <Divider style={{ margin: '8px 0' }} />
          <div>
            <Text strong>Frequently asked questions</Text>
            <Collapse
              size="small"
              items={faqItems}
              style={{ marginTop: 8, background: token.colorBgContainer }}
              bordered
            />
          </div>
        </>
      )}
    </Space>
  )
}

export default function DynamicInfoModal({ slotId, open, onClose, title }) {
  const { token } = theme.useToken()
  const [infoData, setInfoData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchInfo = async () => {
      if (!open) return
      try {
        setLoading(true)
        const res = await get(`/api/admin/cms/instructions/${slotId}`)
        if (!cancelled) {
          setInfoData(res)
        }
      } catch {
        if (!cancelled) {
          setInfoData(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    fetchInfo()
    return () => { cancelled = true }
  }, [slotId, open])

  if (!open) {
    return null
  }

  return (
    <ResponsiveModal
      title={title || 'Information'}
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      {loading ? (
        <div style={{ padding: 24 }}>
          <Text type="secondary">Loading information...</Text>
        </div>
      ) : !infoData ? (
        <div style={{ padding: 24 }}>
          <Text type="secondary">No information available.</Text>
        </div>
      ) : (
        <InfoContent infoData={infoData} token={token} />
      )}
    </ResponsiveModal>
  )
}
