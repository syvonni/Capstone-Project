import DynamicFaqSection from '@/shared/components/cms/DynamicFaqSection'
import { getApplicationFaqSlotId } from '../utils/statusUtils'

export default function ApplicationFaqTab({ application }) {
  const faqSlotId = getApplicationFaqSlotId(application?.applicationStatus)

  return (
    <div>
      <DynamicFaqSection
        slotId={faqSlotId}
        fallbackSlotId="business-owner-application-faq"
        hideWrapper
        hideHeader
      />
    </div>
  )
}
