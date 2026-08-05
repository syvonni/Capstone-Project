export const CONTENT_TYPES = [
  { key: 'public-announcements', label: 'Public Announcements', icon: 'NotificationOutlined' },
  { key: 'staff-announcements', label: 'Staff Announcements', icon: 'NotificationOutlined' },
  { key: 'faqs', label: 'FAQs', icon: 'QuestionCircleOutlined' },
  { key: 'instructions', label: 'Instructions', icon: 'InfoCircleOutlined' },
  { key: 'privacy-policy', label: 'Privacy Policy', icon: 'SafetyOutlined' },
  { key: 'terms-of-service', label: 'Terms of Service', icon: 'FileProtectOutlined' },
  { key: 'bizclear-manual', label: 'BizClear Manual', icon: 'BookOutlined' },
  { key: 'business-owners-manual', label: 'Business Owners Manual', icon: 'BookOutlined' },
  { key: 'application-processes', label: 'Application Processes', icon: 'AppstoreOutlined' },
]

export const CONTENT_TYPE_CONFIG = {
  'public-announcements': { showAddButton: true, audience: 'public' },
  'staff-announcements': { showAddButton: true, audience: 'staff' },
  'faqs': { showAddButton: false },
  'instructions': { showAddButton: false },
  'privacy-policy': { showAddButton: true, pageSlotId: 'privacy-policy', isChapterBased: true },
  'terms-of-service': { showAddButton: true, pageSlotId: 'terms-of-service', isChapterBased: true },
  'bizclear-manual': { showAddButton: true, pageSlotId: 'bizclear-manual', isChapterBased: true },
  'business-owners-manual': { showAddButton: true, pageSlotId: 'business-owners-manual', isChapterBased: true },
  'application-processes': { showAddButton: false, fullWidth: true },
}

export const PAGE_CONTENT_TYPES = ['privacy-policy', 'terms-of-service', 'bizclear-manual', 'business-owners-manual']

export const PAGE_SIZE = 20
