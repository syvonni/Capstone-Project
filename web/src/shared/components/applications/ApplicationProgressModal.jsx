import { Steps, theme } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'
import { useState, useEffect, useMemo, useRef } from 'react'
import { getAppealById } from '@/features/business-owner/services/appealsService.js'
import { getAppealsByBusiness } from '@/features/staffs/lgu-officer/services/appealsService.js'
import { useAudit } from '@/shared/audit/hooks/useAudit'
import { useAuthSession } from '@/features/authentication'
import buildProgressSteps from './buildApplicationProgressSteps'

const AUDIT_ROLES = new Set(['lgu_officer', 'staff', 'admin', 'business_owner'])

export default function ApplicationProgressModal({
  open,
  onClose,
  application,
  statusLower,
  latestAppeal: propLatestAppeal,
}) {
  const [fetchedAppeal, setFetchedAppeal] = useState(null)
  const [loadingAppeal, setLoadingAppeal] = useState(false)
  const fetchingAppealRef = useRef(false)
  const { role } = useAuthSession()

  useEffect(() => {
    const fetchAppeal = async () => {
      if (
        !propLatestAppeal &&
        (application?.appealId || application?.hadAppealGranted) &&
        !fetchingAppealRef.current
      ) {
        fetchingAppealRef.current = true
        setLoadingAppeal(true)
        try {
          let res
          if (application?.appealId) {
            res = await getAppealById(application.appealId)
          } else if (application?.hadAppealGranted && application?.businessId) {
            res = await getAppealsByBusiness(application.businessId)
          }
          const appealData = res
          setFetchedAppeal(Array.isArray(appealData) ? appealData[0] : appealData)
        } catch (err) {
          console.error('Failed to fetch appeal for timeline:', err)
        } finally {
          setLoadingAppeal(false)
          fetchingAppealRef.current = false
        }
      }
    }
    fetchAppeal()
  }, [
    application?.appealId,
    application?.hadAppealGranted,
    application?.businessId,
    propLatestAppeal,
  ])

  const { token: themeToken } = theme.useToken()
  const latestAppeal = propLatestAppeal || fetchedAppeal
  const effectiveStatusLower =
    statusLower || (application?.applicationStatus || '').toLowerCase()
  const appId =
    application?.applicationId || application?.businessId || application?._id
  const canAudit = AUDIT_ROLES.has(role)

  const { auditLogs, loading: auditLoading } = useAudit(
    'application',
    appId,
    open && !!appId && canAudit,
  )

  const { steps, current } = useMemo(() => {
    return buildProgressSteps(
      auditLogs,
      application,
      effectiveStatusLower,
      latestAppeal,
      themeToken,
    )
  }, [auditLogs, application, effectiveStatusLower, latestAppeal, themeToken])

  const loading = auditLoading || loadingAppeal

  const loadingSteps = [
    {
      title: 'Loading application history',
      content: 'Please wait...',
      status: 'process',
    },
  ]

  return (
    <ResponsiveModal
      title="Application Progress"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <div style={{ padding: 12 }}>
        <Steps
          orientation="vertical"
          current={loading ? 0 : current}
          items={loading ? loadingSteps : steps}
          size="small"
        />
      </div>
    </ResponsiveModal>
  )
}
