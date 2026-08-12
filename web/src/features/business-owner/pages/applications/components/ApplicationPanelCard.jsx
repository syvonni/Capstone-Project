import PanelCard from '@/shared/components/PanelCard.jsx'
import { getStatusTagColor, formatKebabCaseToTitleCase } from '../utils/statusUtils'
import { formatDateLong } from '../utils/formatters'

export default function ApplicationPanelCard({ application, isSelected, onClick }) {
  const creationDate = application.createdAt ? formatDateLong(application.createdAt) : null
  const updateDate = application.updatedAt ? formatDateLong(application.updatedAt) : null
  const statusColor = application.rawStatus ? getStatusTagColor(application.rawStatus) : getStatusTagColor(application.permitStatus)

  const metaInfo = []
  if (creationDate) {
    metaInfo.push({ label: 'Created On', value: creationDate })
  }
  if (updateDate) {
    metaInfo.push({ label: 'Last Updated On', value: updateDate })
  }

  const tags = [{ label: application.permitStatus, color: statusColor }]
  if (application.permitType) {
    tags.push({ label: formatKebabCaseToTitleCase(application.permitType), color: 'default' })
  }

  return (
    <PanelCard
      title={application.name || 'Unnamed Application'}
      selected={isSelected}
      onClick={onClick}
      metaInfo={metaInfo}
      tags={tags}
    />
  )
}
