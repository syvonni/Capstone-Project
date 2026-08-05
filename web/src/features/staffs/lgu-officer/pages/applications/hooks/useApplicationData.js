import { useState, useEffect, useCallback, useMemo } from 'react'
import { App } from 'antd'
import { PermitApplicationService } from '@/features/staffs/lgu-officer/services/permitApplicationService'
import { getPublicPermitForm, getPublicPermitFormByFormId } from '@/shared/services/permitFormService'

export function useApplicationData(initialApplication, form) {
  const [application, setApplication] = useState(initialApplication) 
  const [formDefinition, setFormDefinition] = useState(null)
  const [formDefLoading, setFormDefLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const { message } = App.useApp()

  const permitService = useMemo(() => new PermitApplicationService(), [])

  const loadApplicationDetails = useCallback(async () => {
    if (!initialApplication?.applicationId) return

    setLoading(true)
    try {
      const details = await permitService.getApplicationById(
        initialApplication.applicationId,
        initialApplication.businessId
      )
      setApplication(details)
    } catch (error) {
      console.error('Failed to load application details:', error)
      message.error('Failed to load application details')
    } finally {
      setLoading(false)
    }
  }, [initialApplication?.applicationId, initialApplication?.businessId, message, permitService])

  useEffect(() => {
    if (initialApplication) {
      setApplication(initialApplication)
      loadApplicationDetails()
      form.resetFields()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialApplication?.applicationId, loadApplicationDetails, form])

  useEffect(() => {
    const app = application || initialApplication
    if (!app?.applicationId) {
      setFormDefinition(null)
      return
    }

    let cancelled = false
    setFormDefLoading(true)
    setFormDefinition(null)

    const formDefId = app?.formDefinitionId
    const formType = app?.formType || 'permit'

    const fetchDef = async () => {
      try {
        let res
        if (formDefId) {
          res = await getPublicPermitForm(formDefId)
        } else {
          res = await getPublicPermitFormByFormId(formType)
        }
        if (cancelled) return
        if (res?.success && res?.form) {
          setFormDefinition(res.form)
        }
      } catch (e) {
        if (!cancelled) console.error('Failed to load form definition for review:', e)
      } finally {
        if (!cancelled) setFormDefLoading(false)
      }
    }
    fetchDef()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application?.applicationId, application?.formDefinitionId, application?.formType, application?.businessRegistration?.businessType, initialApplication])

  return {
    application,
    setApplication,
    formDefinition,
    formDefLoading,
    loading,
    loadApplicationDetails,
  }
}
