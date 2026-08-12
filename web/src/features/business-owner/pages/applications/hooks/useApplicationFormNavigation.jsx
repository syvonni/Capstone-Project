import { useState, useEffect, useMemo } from 'react'
import { FileTextOutlined, BookOutlined } from '@ant-design/icons'

/**
 * Hook for managing form navigation (tabs, sections, status indicators)
 * @param {Object} params
 * @param {number} activeSectionIndex - Current active section index
 * @param {Function} setActiveSectionIndex - Function to set active section index
 * @param {Array} visibleSections - Array of visible form sections
 * @param {string} currentApplicationStatus - Current application status
 * @param {Object} sectionCompleteMap - Map of section completion status
 * @param {Function} onFaqClick - Callback when FAQ tab is clicked
 * @returns {Object} Navigation state and handlers
 */
export function useApplicationFormNavigation({
  activeSectionIndex,
  setActiveSectionIndex,
  visibleSections,
  currentApplicationStatus,
  sectionCompleteMap,
  onFaqClick,
}) {
  const [activeTab, setActiveTab] = useState('overview')

  // Keep active tab in range when visible sections change
  useEffect(() => {
    if (visibleSections.length > 0 && activeSectionIndex >= visibleSections.length) {
      setActiveSectionIndex(-1)
    }
  }, [visibleSections.length, activeSectionIndex, setActiveSectionIndex])

  // Sync activeTab with activeSectionIndex (-1=overview, -2=FAQ, 0+=sections)
  useEffect(() => {
    if (activeSectionIndex === -1) {
      setActiveTab('overview')
    } else if (activeSectionIndex === -2) {
      setActiveTab('faq')
    } else if (activeSectionIndex >= 0 && activeSectionIndex < visibleSections.length) {
      setActiveTab(`section-${activeSectionIndex}`)
    }
  }, [activeSectionIndex, visibleSections.length])

  // Handle tab changes from FormNavigation
  const handleTabChange = (tabKey) => {
    if (tabKey === 'overview') {
      setActiveSectionIndex(-1)
    } else if (tabKey === 'faq') {
      setActiveSectionIndex(-2)
      if (onFaqClick) {
        onFaqClick()
      }
    } else if (tabKey.startsWith('section-')) {
      const sectionIndex = parseInt(tabKey.replace('section-', ''), 10)
      setActiveSectionIndex(sectionIndex)
    }
  }

  // Create main navigation items (Overview, FAQ)
  const mainNavItems = useMemo(() => [
    { key: 'overview', label: 'Overview', icon: <FileTextOutlined /> },
    { key: 'faq', label: 'FAQs', icon: <BookOutlined /> },
  ], [])

  // Create form navigation items from visible sections
  const formNavItems = useMemo(() => 
    visibleSections.map((section, idx) => ({
      key: `section-${idx}`,
      label: section.sectionName || section.category || `Section ${idx + 1}`,
    })),
    [visibleSections]
  )

  // Get item status for form navigation icons
  const getItemStatus = (item) => {
    if (item.key.startsWith('section-')) {
      // Show green checks for all sections except in draft or returned status
      if (currentApplicationStatus !== 'draft' && currentApplicationStatus !== 'returned') {
        return 'ok'
      }
      const idx = parseInt(item.key.replace('section-', ''), 10)
      if (sectionCompleteMap[idx]) return 'ok'
      return 'pending'
    }
    return null
  }

  return {
    activeTab,
    setActiveTab,
    handleTabChange,
    mainNavItems,
    formNavItems,
    getItemStatus,
  }
}
