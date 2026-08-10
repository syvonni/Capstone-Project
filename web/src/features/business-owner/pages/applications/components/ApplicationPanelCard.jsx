import PanelCard from '@/shared/components/PanelCard.jsx'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { getStatusTagColor, isDraftStatus, formatKebabCaseToTitleCase } from '../utils/statusUtils'

dayjs.extend(relativeTime)

export default function ApplicationPanelCard({ business, isSelected, onClick, style }) {
  const isDraft = isDraftStatus(business.permitStatus)
  const hasRef = business.referenceNumber != null && business.referenceNumber !== ''
  const timeSinceCreation = business.createdAt ? dayjs(business.createdAt).fromNow() : null
  const timeSinceUpdate = business.updatedAt ? dayjs(business.updatedAt).fromNow() : null
  const statusColor = business.rawStatus ? getStatusTagColor(business.rawStatus) : getStatusTagColor(business.permitStatus)

  const metaInfo = []
  if (timeSinceUpdate) {
    metaInfo.push({ label: 'Updated', value: timeSinceUpdate })
  }
  if (isDraft && timeSinceCreation) {
    metaInfo.push({ label: 'Created', value: timeSinceCreation })
  }

  const tags = [{ label: business.permitStatus, color: statusColor }]
  if (business.permitType) {
    tags.push({ label: formatKebabCaseToTitleCase(business.permitType), color: 'default' })
  }
  if (hasRef) {
    tags.push({ label: business.referenceNumber, color: 'default' })
  }

  return (
    <PanelCard
      title={business.name}
      selected={isSelected}
      onClick={onClick}
      metaInfo={metaInfo}
      tags={tags}
      style={style}
    />
  )
}
