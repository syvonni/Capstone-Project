import { useState, useMemo, useCallback, useEffect } from 'react'
import { App, Card, Col, Typography, Modal, Input } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import useContentManagement from '../hooks/useContentManagement'
import useAnnouncementsTab from '../hooks/useAnnouncementsTab'
import { CONTENT_TYPES, CONTENT_TYPE_CONFIG } from '../constants/contentManagement.constants'
import AnnouncementDetailPanel from '../components/AnnouncementDetailPanel'
import FaqSectionEditor from '../components/FaqSectionEditor'
import InstructionEditor from '../components/InstructionEditor'
import PageChapterEditor from '../components/PageChapterEditor'
import ApplicationProcessEditor from '../components/ApplicationProcessEditor'
import ListPanel from '@/shared/components/ListPanel'
import PanelCard from '@/shared/components/PanelCard'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'
import { get, put, post, del, patch } from '@/lib/http.js'
import dayjs from 'dayjs'
import { ANNOUNCEMENT_PRIORITY_SELECT_OPTIONS, STATUS_COLORS, PRIORITY_COLORS } from '../constants/announcements.constants'

const { Paragraph } = Typography

export default function ContentManagementView() {
  const { message } = App.useApp()

  const {
    contentType,
    setContentType,
    selectedItem,
    setSelectedItem,
  } = useContentManagement()

  const [statusFilter, setStatusFilter] = useState(null)
  const [priorityFilter, setPriorityFilter] = useState(null)

  // ─── Announcements data ───────────────────────────────────────────────────────
  const announcementsPublic = useAnnouncementsTab('public', selectedItem, setSelectedItem)
  const announcementsStaff = useAnnouncementsTab('staff', selectedItem, setSelectedItem)

  // ─── FAQ data ─────────────────────────────────────────────────────────────────
  const [faqSections, setFaqSections] = useState([])
  const [faqLoading, setFaqLoading] = useState(true)

  const fetchFaqSections = useCallback(async () => {
    try {
      setFaqLoading(true)
      const res = await get('/api/admin/cms/faq')
      setFaqSections(Array.isArray(res) ? res : [])
    } catch {
      message.error('Failed to load FAQ sections')
    } finally {
      setFaqLoading(false)
    }
  }, [message])

  useEffect(() => { fetchFaqSections() }, [fetchFaqSections])

  const handleSaveFaq = useCallback(async (slotId, values, publish = false) => {
    await put(`/api/admin/cms/faq/${slotId}?publish=${publish}`, values)
    await fetchFaqSections()
  }, [fetchFaqSections])

  // ─── Instructions data ────────────────────────────────────────────────────────
  const [instructions, setInstructions] = useState([])
  const [instructionsLoading, setInstructionsLoading] = useState(true)

  const fetchInstructions = useCallback(async () => {
    try {
      setInstructionsLoading(true)
      const res = await get('/api/admin/cms/instructions')
      setInstructions(Array.isArray(res) ? res : [])
    } catch {
      message.error('Failed to load instructions')
    } finally {
      setInstructionsLoading(false)
    }
  }, [message])

  useEffect(() => { fetchInstructions() }, [fetchInstructions])

  const handleSaveInstruction = useCallback(async (slotId, values, publish = false) => {
    await put(`/api/admin/cms/instructions/${slotId}?publish=${publish}`, values)
    await fetchInstructions()
  }, [fetchInstructions])

  const config = useMemo(() => CONTENT_TYPE_CONFIG[contentType] || {}, [contentType])

  // ─── Chapters data (for privacy-policy, terms-of-service, bizclear-manual) ──
  const [chapters, setChapters] = useState([])
  const [chaptersLoading, setChaptersLoading] = useState(false)
  const [addChapterOpen, setAddChapterOpen] = useState(false)
  const [newChapterTitle, setNewChapterTitle] = useState('')
  const [newChapterDesc, setNewChapterDesc] = useState('')

  const fetchChapters = useCallback(async (pageSlotId) => {
    if (!pageSlotId) return
    try {
      setChaptersLoading(true)
      const res = await get(`/api/admin/cms/pages?pageSlotId=${pageSlotId}`)
      setChapters(Array.isArray(res) ? res : [])
    } catch {
      message.error('Failed to load chapters')
    } finally {
      setChaptersLoading(false)
    }
  }, [message])

  useEffect(() => {
    if (config.isChapterBased) {
      fetchChapters(config.pageSlotId)
    } else {
      setChapters([])
    }
  }, [contentType, config, fetchChapters])

  const handleSaveChapter = useCallback(async (chapterId, values, publish = false) => {
    await put(`/api/admin/cms/pages/${chapterId}?publish=${publish}`, values)
    await fetchChapters(config.pageSlotId)
  }, [fetchChapters, config])

  const handleDeleteChapter = useCallback(async (chapterId) => {
    await del(`/api/admin/cms/pages/${chapterId}`)
    setSelectedItem(null)
    await fetchChapters(config.pageSlotId)
    message.success('Chapter deleted')
  }, [fetchChapters, config, message, setSelectedItem])

  const handleAddChapter = useCallback(async () => {
    if (!newChapterTitle.trim()) return
    try {
      await post('/api/admin/cms/pages', {
        pageSlotId: config.pageSlotId,
        title: newChapterTitle.trim(),
        description: newChapterDesc.trim(),
      })
      setAddChapterOpen(false)
      setNewChapterTitle('')
      setNewChapterDesc('')
      message.success('Chapter created')
      await fetchChapters(config.pageSlotId)
    } catch {
      message.error('Failed to create chapter')
    }
  }, [newChapterTitle, newChapterDesc, config, fetchChapters, message])

  const _handleReorderChapters = useCallback(async (orderedIds) => {
    await patch('/api/admin/cms/pages/reorder', { pageSlotId: config.pageSlotId, orderedIds })
    await fetchChapters(config.pageSlotId)
  }, [config, fetchChapters])

  // ─── Filtered items based on content type ───────────────────────────────────────
  const filteredItems = useMemo(() => {
    let items = []
    let loading = false

    switch (contentType) {
      case 'public-announcements':
        items = announcementsPublic.announcements
        loading = announcementsPublic.loading
        break
      case 'staff-announcements':
        items = announcementsStaff.announcements
        loading = announcementsStaff.loading
        break
      case 'faqs':
        items = faqSections
        loading = faqLoading
        break
      case 'instructions':
        items = instructions
        loading = instructionsLoading
        break
      case 'privacy-policy':
      case 'terms-of-service':
      case 'bizclear-manual': {
        items = chapters
        loading = chaptersLoading
        break
      }
      case 'application-processes':
        items = []
        loading = false
        break
      default:
        items = []
        loading = false
    }

    if (statusFilter) {
      items = items.filter((item) => item?.status === statusFilter)
    }

    if (priorityFilter) {
      items = items.filter((item) => item?.priority === priorityFilter)
    }

    return { items, loading }
  }, [contentType, statusFilter, priorityFilter, announcementsPublic, announcementsStaff, faqSections, faqLoading, instructions, instructionsLoading, chapters, chaptersLoading])

  const clearFilters = () => {
    setStatusFilter(null)
    setPriorityFilter(null)
  }

  const handleRefresh = useCallback(() => {
    switch (contentType) {
      case 'public-announcements':
        announcementsPublic.refresh()
        break
      case 'staff-announcements':
        announcementsStaff.refresh()
        break
      case 'faqs':
        fetchFaqSections()
        break
      case 'instructions':
        fetchInstructions()
        break
      case 'privacy-policy':
      case 'terms-of-service':
      case 'bizclear-manual':
        fetchChapters(config.slotId)
        break
      default:
        break
    }
  }, [contentType, announcementsPublic, announcementsStaff, fetchFaqSections, fetchInstructions, fetchChapters, config.slotId])

  // ─── Render item card ───────────────────────────────────────────────────────────
  const renderItem = useCallback((item, selectedId, onSelect, token) => {
    const isSelected = selectedId && (selectedId === item._id || selectedId === item.slotId)
    return (
      <Col span={24} key={item._id || item.slotId}>
        <Card
          size="small"
          hoverable
          onClick={() => onSelect(item)}
          title={item.slotId}
          style={{
            cursor: 'pointer',
            border: isSelected ? `1px solid ${token.colorPrimary}` : undefined,
          }}
        >
          <Paragraph type="secondary" ellipsis={{ rows: 4 }} style={{ fontSize: 12, marginBottom: 0 }}>
            {item.body || item.description || item.introText || ''}
          </Paragraph>
        </Card>
      </Col>
    )
  }, [])

  // ─── Render announcement card for ListPanel ─────────────────────────────────────
  const renderAnnouncementCard = useCallback((item, selectedId, onSelectItem) => {
    const isSelected = selectedId === item._id
    const priorityLabel = ANNOUNCEMENT_PRIORITY_SELECT_OPTIONS.find(opt => opt.value === item.priority)?.label || item.priority

    return (
      <PanelCard
        key={item._id}
        title={item.title || 'Untitled'}
        description={item.body || 'No content'}
        selected={isSelected}
        onClick={() => onSelectItem(item)}
        metaInfo={[
          { label: 'Status', value: (item.status || 'draft').toUpperCase() },
          { label: 'Created', value: item.createdAt ? dayjs(item.createdAt).format('MMM D, YYYY') : '-' },
        ]}
        tags={[
          { label: priorityLabel, color: PRIORITY_COLORS[item.priority] || 'default' },
          { label: (item.status || 'draft').toUpperCase(), color: STATUS_COLORS[item.status] || 'default' },
        ]}
      />
    )
  }, [])

  // ─── Filter config for announcements ─────────────────────────────────────────────
  const announcementFilterConfig = [
    {
      key: 'status',
      label: 'Status',
      placeholder: 'Filter by status',
      value: statusFilter,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
    {
      key: 'priority',
      label: 'Priority',
      placeholder: 'Filter by priority',
      value: priorityFilter,
      options: ANNOUNCEMENT_PRIORITY_SELECT_OPTIONS,
    },
  ]

  // ─── Right panel content ───────────────────────────────────────────────────────
  const rightPanelContent = useMemo(() => {
    if (config.fullWidth) {
      return <ApplicationProcessEditor />
    }

    switch (contentType) {
      case 'public-announcements':
        return (
          <AnnouncementDetailPanel
            selected={selectedItem}
            saving={announcementsPublic.saving}
            onSave={announcementsPublic.handleSave}
            onDelete={announcementsPublic.handleDelete}
            onUnpublish={announcementsPublic.handleUnpublish}
            audience="public"
            form={announcementsPublic.form}
            onFillTestData={announcementsPublic.handleFillTestData}
            undoRedo={announcementsPublic.undoRedo}
            onFormChange={announcementsPublic.handleFormChange}
            isBookmarked={false}
            onBookmarkToggle={() => {}}
            onHistoryClick={() => {}}
            instructionSlotId="announcements-public-info"
            manualSlotId="bizclear-manual"
          />
        )
      case 'staff-announcements':
        return (
          <AnnouncementDetailPanel
            selected={selectedItem}
            saving={announcementsStaff.saving}
            onSave={announcementsStaff.handleSave}
            onDelete={announcementsStaff.handleDelete}
            onUnpublish={announcementsStaff.handleUnpublish}
            audience="staff"
            form={announcementsStaff.form}
            onFillTestData={announcementsStaff.handleFillTestData}
            undoRedo={announcementsStaff.undoRedo}
            onFormChange={announcementsStaff.handleFormChange}
            isBookmarked={false}
            onBookmarkToggle={() => {}}
            onHistoryClick={() => {}}
            instructionSlotId="announcements-staff-info"
            manualSlotId="bizclear-manual"
          />
        )
      case 'faqs':
        return <FaqSectionEditor selected={selectedItem} onSave={handleSaveFaq} />
      case 'instructions':
        return <InstructionEditor selected={selectedItem} onSave={handleSaveInstruction} />
      case 'privacy-policy':
      case 'terms-of-service':
      case 'bizclear-manual':
        return <PageChapterEditor selected={selectedItem} onSave={handleSaveChapter} onDelete={handleDeleteChapter} />
      default:
        return null
    }
  }, [contentType, config, selectedItem, announcementsPublic, announcementsStaff, handleSaveFaq, handleSaveInstruction, handleSaveChapter, handleDeleteChapter])

  // ─── List panel content ───────────────────────────────────────────────────────
  const listContent = (
    <ListPanel
      items={filteredItems.items}
      isLoading={filteredItems.loading}
      selectedId={selectedItem?._id || selectedItem?.slotId}
      onSelectItem={setSelectedItem}
      renderCard={contentType === 'public-announcements' || contentType === 'staff-announcements' ? renderAnnouncementCard : renderItem}
      filterConfig={contentType === 'public-announcements' || contentType === 'staff-announcements' ? announcementFilterConfig : undefined}
      onFilterChange={(key, value) => {
        if (key === 'status') setStatusFilter(value)
        if (key === 'priority') setPriorityFilter(value)
      }}
      onClearFilters={clearFilters}
      customFilter={contentType === 'public-announcements' || contentType === 'staff-announcements'}
      onRefresh={handleRefresh}
      showRefresh={true}
      primaryButton={contentType === 'public-announcements' || contentType === 'staff-announcements' ? {
        label: contentType === 'public-announcements' ? 'Add Public Announcement' : 'Add Staff Announcement',
        icon: <PlusOutlined />,
        onClick: contentType === 'public-announcements' ? announcementsPublic.handleCreateDraft : announcementsStaff.handleCreateDraft,
      } : undefined}
      tabSwitcher={{
        value: contentType,
        onChange: setContentType,
        options: CONTENT_TYPES.map((t) => ({ value: t.key, label: t.label })),
      }}
      style={{ flex: 1, minHeight: 0 }}
    />
  )

  const handleDrawerClose = () => {
    setSelectedItem(null)
  }

  return (
    <>
      <ResponsiveSplitLayout
        listContent={listContent}
        detailContent={rightPanelContent}
        drawerTitle={selectedItem?.title || 'Details'}
        onDrawerClose={handleDrawerClose}
        drawerOpen={!!selectedItem}
        mobileDrawerPlacement="bottom"
      />

      <Modal
        title="Add Chapter"
        open={addChapterOpen}
        onOk={handleAddChapter}
        onCancel={() => setAddChapterOpen(false)}
        okText="Create"
        cancelText="Cancel"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label htmlFor="chapter-title" style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Title</label>
            <Input
              id="chapter-title"
              placeholder="Chapter title"
              value={newChapterTitle}
              onChange={(e) => setNewChapterTitle(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="chapter-desc" style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Description</label>
            <Input.TextArea
              id="chapter-desc"
              placeholder="Short description (shown in list card)"
              value={newChapterDesc}
              onChange={(e) => setNewChapterDesc(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
