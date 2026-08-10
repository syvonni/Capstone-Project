import { useState, useEffect } from 'react'
import InfoGrid from '@/shared/components/InfoGrid'
import { SEVERITY_LEVELS } from '../constants/violations.constants'
import { getInspectionItemsByViolation } from '@/features/admin/services/inspectionItemService'

export default function ViolationOverview({ violation, _initialValues, _token, loading = false }) {
  const [inspectionItems, setInspectionItems] = useState([])
  const [loadingInspectionItems, setLoadingInspectionItems] = useState(false)

  useEffect(() => {
    const fetchInspectionItems = async () => {
      if (!violation?._id) return
      try {
        setLoadingInspectionItems(true)
        const items = await getInspectionItemsByViolation(violation._id)
        setInspectionItems(items || [])
      } catch (error) {
        console.error('Failed to fetch inspection items:', error)
        setInspectionItems([])
      } finally {
        setLoadingInspectionItems(false)
      }
    }

    fetchInspectionItems()
  }, [violation?._id])

  const getSeverityLabel = (severity) => {
    const level = SEVERITY_LEVELS.find(l => l.value === severity)
    return level ? level.label : severity
  }

  const getSeverityColor = (severity) => {
    const level = SEVERITY_LEVELS.find(l => l.value === severity)
    return level ? level.color : 'default'
  }

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const effectiveLoading = loading || loadingInspectionItems

  const inspectionItemName = inspectionItems.length === 1
    ? inspectionItems[0]?.name || 'N/A'
    : inspectionItems.length > 1
      ? `${inspectionItems.length} inspection items`
      : 'N/A'

  const overviewItems = [
    {
      label: 'Name',
      value: violation?.name || 'N/A',
    },
    {
      label: 'Severity',
      value: violation?.severity ? getSeverityLabel(violation.severity) : 'N/A',
      badge: violation?.severity ? { color: getSeverityColor(violation.severity) } : undefined,
    },
    {
      label: 'Penalty',
      value: violation?.feeId?.amount ? formatCurrency(violation.feeId.amount) : 'N/A',
      ...(violation?.feeId?._id && { to: `/admin/fees?selectedId=${violation.feeId._id}&tab=penalties` }),
    },
    {
      label: 'Version',
      value: violation?.version || 'N/A',
    },
    {
      label: 'Created on',
      value: violation?.createdAt ? formatRelativeTime(violation.createdAt) : 'N/A',
    },
    {
      label: 'Last updated on',
      value: violation?.updatedAt ? formatRelativeTime(violation.updatedAt) : 'N/A',
    },
    { type: 'divider' },
    {
      label: 'Description',
      value: violation?.description || 'N/A',
    },
    {
      label: 'Corrective Action',
      value: violation?.correctiveAction || 'N/A',
      fullWidth: true,
    },
    {
      label: 'Legal Basis',
      value: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(violation?.legalBasis || []).map((item, index) => (
            <span key={index}>
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'underline' }}
                >
                  {item.title}
                </a>
              ) : (
                <span>{item.title}</span>
              )}
              {item.description && ` - ${item.description}`}
            </span>
          ))}
        </div>
      ),
      fullWidth: true,
    },
    {
      label: 'Notes',
      value: violation?.notes || 'N/A',
    }
  ]

  // Add associated inspection items at the bottom
  if (inspectionItems.length === 1) {
    overviewItems.push({
      label: 'Associated Inspection Item',
      value: inspectionItemName,
      to: `/admin/inspections?selectedId=${inspectionItems[0]?._id}`,
      fullWidth: true,
    })
  } else if (inspectionItems.length > 1) {
    overviewItems.push({
      type: 'sublist',
      title: 'Associated Inspection Items',
      items: inspectionItems.map((item) => ({
        text: item.name || 'N/A',
        to: `/admin/inspections?selectedId=${item._id}`,
      })),
      fullWidth: true,
    })
  } else {
    overviewItems.push({
      label: 'Associated Inspection Item',
      value: '-',
      fullWidth: true,
    })
  }

  return (
    <div>
      <InfoGrid
        noPadding={true}
        loading={effectiveLoading}
        items={overviewItems}
      />
    </div>
  )
}
