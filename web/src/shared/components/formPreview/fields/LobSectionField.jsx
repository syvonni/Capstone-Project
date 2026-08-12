import LOBSection from '../LOBSection'
import { useFieldContext } from './FieldContext'

export default function LobSectionField() {
  const { form, effectiveReadOnly, onLobChange, formValues, lobSectionRef } = useFieldContext()

  return (
    <LOBSection
      ref={lobSectionRef}
      isEditMode={!effectiveReadOnly}
      onLobChange={onLobChange}
      form={form}
      businessActivities={formValues?.businessActivities}
    />
  )
}
