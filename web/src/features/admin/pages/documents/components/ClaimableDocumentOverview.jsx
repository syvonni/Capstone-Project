import { useMemo } from 'react'
import { Typography } from 'antd'
import InfoGrid from '@/shared/components/InfoGrid'

const { Text } = Typography

export default function ClaimableDocumentOverview({ document, templateHtml, templateImages, templateTexts, permitFormMap, dependencies, token, isMobile = false }) {
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Replace template image and text placeholders with actual values
  const processedHtml = useMemo(() => {
    if (!templateHtml) return ''
    let html = templateHtml
    
    // Replace image placeholders
    templateImages.forEach(img => {
      const placeholder = `{{${img.attributeName}}}`
      html = html.replace(new RegExp(placeholder, 'g'), img.path)
    })
    
    // Replace text placeholders with preview text
    templateTexts.forEach(text => {
      const placeholder = `{{${text.attributeName}}}`
      html = html.replace(new RegExp(placeholder, 'g'), text.previewText || placeholder)
    })
    
    return html
  }, [templateHtml, templateImages, templateTexts])

  const infoGridItems = [
    { label: 'Document Name', value: document?.name || '-' },
    { label: 'Document Fee', value: document?.feeId ? `₱${document.feeId.amount?.toFixed(2) || '0.00'}` : '₱0.00', ...(document?.feeId?._id && { to: `/admin/fees?selectedId=${document.feeId._id}&tab=claimable_documents` }) },
    { label: 'Version', value: document?.version || '1' },
    { label: 'Created on', value: document?.createdAt ? formatRelativeTime(document.createdAt) : 'N/A' },
    { label: 'Last updated on', value: document?.updatedAt ? formatRelativeTime(document.updatedAt) : 'N/A' },
    { type: 'divider' },
    { label: 'Notes', value: document?.notes || '-' },
    { label: 'Associated Checklist', value: document?.checklistId?.name || 'N/A', ...(document?.checklistId?._id && { to: `/admin/inspections?selectedId=${document.checklistId._id}&tab=checklists`, fullWidth: true }) },
    {
      type: 'sublist',
      title: dependencies.length === 1 ? 'Associated Line of Business' : 'Associated Lines of Business',
      items: dependencies.length > 0 ? dependencies.map((lob) => ({
        text: lob.name,
        to: `/admin/lob?selectedId=${lob._id}`,
        suffix: lob.description ? ` - ${lob.description}` : undefined,
      })) : [],
    },
    {
      type: 'sublist',
      title: 'Associated Forms',
      items: document?.formIds && document.formIds.length > 0
        ? document.formIds.map(formId => {
            const form = permitFormMap[formId]
            const to = form?.formId === 'unified-business-permit'
              ? '/admin/forms/business-permit'
              : form?.formId
                ? `/admin/forms/temporary-permits?selectedId=${form.formId}`
                : undefined
            return {
              text: form?.name || '(Untitled form)',
              to,
            }
          })
        : [{ text: '-' }],
    },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <div style={{ padding: '24px' }}>
        <InfoGrid items={infoGridItems} noPadding />
      </div>

      {!templateHtml ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Text type="secondary">No HTML document uploaded</Text>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            height: '550px', // 1100px * 0.5 scale
            borderRadius: 4,
            transform: isMobile ? 'scale(0.6)' : 'scale(0.8)',
            transformOrigin: 'top',
            transition: 'transform 0.2s ease'
          }}>
            <div style={{
              width: '794px',
              height: '1100px', // Original A4 height
              border: `1px solid ${token.colorBorder}`
            }}>
              <iframe
                srcDoc={processedHtml}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Document Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
