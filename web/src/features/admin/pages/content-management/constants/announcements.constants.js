export const ANNOUNCEMENTS_PAGE_SIZE = 20

export const STATUS_COLORS = {
  draft: 'orange',
  published: 'green',
}

export const PRIORITY_COLORS = {
  high: 'red',
  urgent: 'magenta',
  normal: 'blue',
  low: 'default',
}

export const AUDIT_ACTION_COLORS = {
  announcement_created: 'green',
  announcement_updated: 'blue',
  announcement_deleted: 'red',
}

export const ANNOUNCEMENT_FORM_DEFAULTS = {
  title: '',
  body: '',
  priority: 'normal',
  isActive: false,
  expiresAt: null,
}

export const ANNOUNCEMENT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
]

export const ANNOUNCEMENT_PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
]

export const ANNOUNCEMENT_PRIORITY_SELECT_OPTIONS = [
  { value: 'urgent', label: '🔴 Urgent' },
  { value: 'high', label: '🟠 High' },
  { value: 'normal', label: '🟡 Normal' },
  { value: 'low', label: '🟢 Low' },
]
