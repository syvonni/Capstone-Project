import { useState, useEffect } from 'react'
import { get } from '@/lib/http.js'
import { getMaintenanceStatus } from '@/features/public/services/maintenanceService.js'
import { useAnnouncements } from '@/shared/hooks/useAnnouncements.jsx'

export default function useLandingData() {
  // Use shared announcements hook for public/landing page
  const { announcements, announcementItems, defaultOpenKey } = useAnnouncements({ skipAuth: true })
  
  const [maintenanceStatus, setMaintenanceStatus] = useState({
    active: false,
    scheduled: false,
    message: '',
    expectedResumeAt: null,
    scheduledStartAt: null,
  })
  const [publicStats, setPublicStats] = useState(null)

  useEffect(() => {
    const fetchMaintenanceData = async () => {
      try {
        const maintenance = await getMaintenanceStatus().catch(() => ({ active: false, scheduled: false }))
        setMaintenanceStatus({
          active: !!maintenance?.active,
          scheduled: !!maintenance?.scheduled,
          message: maintenance?.message || '',
          expectedResumeAt: maintenance?.expectedResumeAt || null,
          scheduledStartAt: maintenance?.scheduledStartAt || null,
        })
      } catch (err) {
        console.error('[useLandingData] fetchMaintenanceData error:', err)
        setMaintenanceStatus({ active: false, scheduled: false })
      }
    }
    fetchMaintenanceData()
  }, [])

  useEffect(() => {
    const fetchPublicStats = async () => {
      try {
        const res = await get('/api/public/business/stats', { skipAuth: true }).catch(() => null)
        const stats = res ?? null
        setPublicStats(stats)
      } catch {
        setPublicStats(null)
      }
    }
    fetchPublicStats()
  }, [])

  // Derived state
  const hasMaintenanceNotice = maintenanceStatus.active
  const hasAnnouncementPanel = announcementItems.length > 0 || hasMaintenanceNotice

  return {
    announcements,
    maintenanceStatus,
    publicStats,
    hasMaintenanceNotice,
    announcementItems,
    hasAnnouncementPanel,
    defaultOpenKey,
  }
}
