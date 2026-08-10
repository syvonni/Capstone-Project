import { useState, useEffect } from 'react'
import { getPublicPermitForm, getPublicPermitFormByFormId } from '@/shared/services/permitFormService'

export function useFormDefinition(appIdentifier, formDefId, formType, businessType) {
  const [formDefinition, setFormDefinition] = useState(null)
  const [formDefLoading, setFormDefLoading] = useState(false)

  useEffect(() => {
    if (!appIdentifier) {
      setFormDefinition(null)
      return
    }

    let cancelled = false
    setFormDefLoading(true)
    setFormDefinition(null)

    const fetchDef = async () => {
      try {
        let res
        if (formDefId) {
          res = await getPublicPermitForm(formDefId)
        } else {
          res = await getPublicPermitFormByFormId(formType)
        }
        if (cancelled) return
        // Handle both response structures: { success: true, form: ... } or direct form object
        if (res?.success && res?.form) {
          setFormDefinition(res.form)
        } else if (res?.formId || res?.sections) {
          // Direct form object response
          setFormDefinition(res)
        } else {
          console.error('Failed to load form definition - no valid response:', res)
        }
      } catch (e) {
        if (!cancelled) console.error('Failed to load form definition for review:', e)
      } finally {
        if (!cancelled) setFormDefLoading(false)
      }
    }
    fetchDef()
    return () => { cancelled = true }
  }, [appIdentifier, formDefId, formType, businessType])

  return { formDefinition, formDefLoading }
}
