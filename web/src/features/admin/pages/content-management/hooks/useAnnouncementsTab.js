import { useState, useCallback, useEffect } from 'react'
import { App, Form } from 'antd'
import dayjs from 'dayjs'
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/features/admin/services/announcementService'
import useAnnouncementsUndoRedo from './useAnnouncementsUndoRedo'

export default function useAnnouncementsTab(audience, externalSelected, externalSetSelected) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formValues, setFormValues] = useState(null)

  // Use external selected state if provided, otherwise use internal
  const selected = externalSelected
  const setSelected = externalSetSelected

  // Undo/redo integration
  const undoRedo = useAnnouncementsUndoRedo(formValues, selected?._id)

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getAnnouncements(audience)
      setAnnouncements(Array.isArray(res) ? res : (res?.data || []))
    } catch {
      message.error('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }, [message, audience])

  useEffect(() => { fetchAnnouncements() }, [fetchAnnouncements])

  const handleCreateDraft = useCallback(async () => {
    try {
      setSaving(true)
      const payload = { status: 'draft', audience }
      const res = await createAnnouncement(payload)
      const newAnnouncement = res?._id ? res : res?.data
      await fetchAnnouncements()
      if (newAnnouncement) {
        setSelected(newAnnouncement)
      }
      message.success('Draft created')
    } catch (err) {
      message.error(err?.message || 'Failed to create draft')
    } finally {
      setSaving(false)
    }
  }, [message, audience, fetchAnnouncements, setSelected])

  const handleSave = useCallback(async (id, values, publish = false) => {
    try {
      setSaving(true)
      const payload = {
        ...values,
        status: publish ? 'published' : values.status,
        audience: audience || values.audience || 'public',
      }
      // When publishing immediately, clear publishAt to avoid scheduling for future
      if (publish) {
        payload.publishAt = null
      }
      const result = await updateAnnouncement(id, payload)
      message.success(publish ? 'Announcement published' : 'Draft saved')

      if (publish) {
        // Deselect immediately after publishing
        setSelected(null)
      }

      // Refresh the list
      await fetchAnnouncements()

      if (!publish) {
        // For draft saves, use the returned data or re-fetch
        const updated = result?._id ? result : result?.data
        if (updated) {
          setSelected(updated)
        } else {
          // Fallback: re-fetch from server
          const refreshed = await getAnnouncements(audience)
          const list = Array.isArray(refreshed) ? refreshed : (refreshed?.data || [])
          const found = list.find(a => a._id === id)
          if (found) {
            setSelected(found)
          }
        }
      }
    } catch (err) {
      message.error(err?.message || 'Failed to save announcement')
    } finally {
      setSaving(false)
    }
  }, [message, audience, fetchAnnouncements, setSelected])

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteAnnouncement(id)
      message.success('Announcement deleted')
      setSelected(null)
      fetchAnnouncements()
    } catch {
      message.error('Failed to delete announcement')
    }
  }, [message, fetchAnnouncements, setSelected])

  const handleUnpublish = useCallback(async (id) => {
    try {
      setSaving(true)
      await updateAnnouncement(id, {
        status: 'draft',
        isActive: false,
      })
      message.success('Announcement unpublished')
      await fetchAnnouncements()
      // Force re-select with updated data
      const refreshed = await getAnnouncements(audience)
      const list = Array.isArray(refreshed) ? refreshed : (refreshed?.data || [])
      const updated = list.find(a => a._id === id)
      if (updated) {
        setSelected(updated)
      }
    } catch (err) {
      message.error(err?.message || 'Failed to unpublish announcement')
    } finally {
      setSaving(false)
    }
  }, [message, fetchAnnouncements, audience, setSelected])

  const handleFillTestData = useCallback(() => {
    if (!selected) return

    const testValues = {
      title: 'Test Announcement - ' + dayjs().format('MMM D, h:mm A'),
      body: 'This is a test announcement created for demonstration purposes. It showcases the announcement system functionality and allows testing of various features including publishing, editing, and deletion.',
      priority: 'normal',
      isActive: true,
      publishAt: null,
      expiresAt: dayjs().add(7, 'days'),
    }

    form.setFieldsValue(testValues)
    setFormValues(testValues)
    undoRedo.pushHistory(testValues)
    message.success('Test data filled')
  }, [selected, form, message, undoRedo])

  // Track form changes for undo/redo
  const handleFormChange = useCallback((changedValues) => {
    const newValues = { ...formValues, ...changedValues }
    setFormValues(newValues)
    undoRedo.handleFieldChange(changedValues)
  }, [formValues, undoRedo])

  return {
    announcements,
    loading,
    saving,
    form,
    formValues,
    handleCreateDraft,
    handleSave,
    handleDelete,
    handleUnpublish,
    handleFillTestData,
    handleFormChange,
    undoRedo,
    refresh: fetchAnnouncements,
  }
}
