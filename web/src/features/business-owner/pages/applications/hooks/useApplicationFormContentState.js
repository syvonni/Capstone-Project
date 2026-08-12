import { useState, useEffect } from 'react'
import dayjs from 'dayjs'

export function useApplicationFormContentState(editingApplication, _form) {
  const [formDefinition, setFormDefinition] = useState(null)
  const [loading, setLoading] = useState(!!editingApplication)
  const [formValues, setFormValues] = useState(() => {
    const initial = editingApplication?.formData || {}
    // Ensure generalPermitCategory is set for conditional section visibility
    if (editingApplication?.category && !initial.generalPermitCategory) {
      return { ...initial, generalPermitCategory: editingApplication.category }
    }
    return initial
  })
  const [activeSectionIndex, setActiveSectionIndex] = useState(-1)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [documentCids, setDocumentCids] = useState({})
  const [draftApplicationId, setDraftApplicationId] = useState(null)

  // Convert ISO date strings to Dayjs objects when loading from backend
  const convertDatesToDayjs = (formData, formDefinition) => {
    if (!formData || typeof formData !== 'object') return formData
    const dateKeys = new Set()
    ;(formDefinition?.sections || []).forEach((section) => {
      (section.items || []).forEach((item) => {
        const key = item.key || item.label
        if (item.type === 'date') dateKeys.add(key)
        if (item.type === 'date_range') {
          dateKeys.add(`${key}_start`)
          dateKeys.add(`${key}_end`)
        }
      })
    })
    const out = { ...formData }
    dateKeys.forEach((k) => {
      const v = out[k]
      if (v != null && v !== '' && typeof v === 'string' && !dayjs.isDayjs(v)) {
        const d = dayjs(v)
        if (d.isValid()) {
          out[k] = d
        }
      }
    })
    // Convert nested metadata date strings to Dayjs
    Object.keys(out).forEach((key) => {
      const v = out[key]
      if (key.endsWith('_metadata') && typeof v === 'object' && v !== null) {
        Object.keys(v).forEach((metaKey) => {
          const mv = v[metaKey]
          if (mv != null && mv !== '' && typeof mv === 'string' && !dayjs.isDayjs(mv)) {
            const d = dayjs(mv)
            if (d.isValid()) {
              v[metaKey] = d
            }
          }
        })
      }
    })
    return out
  }

  // When editingApplication changes to a new application, update formValues immediately
  useEffect(() => {
    if (editingApplication) {
      const initial = editingApplication.formData || {}
      const initialWithDates = convertDatesToDayjs(initial, formDefinition)
      if (editingApplication.category && !initialWithDates.generalPermitCategory) {
        setFormValues({ ...initialWithDates, generalPermitCategory: editingApplication.category })
      } else {
        setFormValues(initialWithDates)
      }
      setDraftApplicationId(editingApplication.applicationId || editingApplication._id)
      // Populate documentCids from backend response (documents or lguDocuments)
      const docs = editingApplication.documents || editingApplication.lguDocuments || {}
      setDocumentCids(docs)
    } else {
      setFormValues({})
      setDocumentCids({})
      setDraftApplicationId(null)
      setLoading(false)
      setActiveSectionIndex(-1)
      setHasUnsavedChanges(false)
    }
  }, [editingApplication, formDefinition])

  return {
    formDefinition,
    setFormDefinition,
    loading,
    setLoading,
    formValues,
    setFormValues,
    activeSectionIndex,
    setActiveSectionIndex,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    documentCids,
    setDocumentCids,
    draftApplicationId,
    setDraftApplicationId,
  }
}
