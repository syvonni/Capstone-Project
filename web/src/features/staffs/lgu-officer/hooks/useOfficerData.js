import { useState, useCallback, useEffect } from 'react'
import { useAuthSession } from '@/features/authentication'
import { getAppealsForReview } from '../services/appealsService'
import { getEditRequests } from '../services/editRequestService'
import { getHelpRequests } from '../services/helpRequestService'
import { getMyActions } from '../services/auditService'
import { searchUsers } from '../services/userService'
import { getBusinesses } from '../services/businessService'
import { PermitApplicationService } from '../services/permitApplicationService'

const EDIT_REQUESTS_POLL_INTERVAL_MS = 30 * 1000

const PENDING_APPLICATION_STATUSES = new Set([
  'submitted',
  'under_review',
  'resubmit',
  'pending',
  'pending_renewal',
  'renewal_submitted',
  'appeal_pending',
  'officer_draft',
])

const PENDING_APPEAL_STATUSES = new Set(['pending', 'submitted'])
const PENDING_RENEWAL_STATUSES = new Set(['pending_renewal', 'renewal_submitted'])

const normalizeEditRequestStatus = (status) => {
  if (!status || status === 'submitted') return 'pending'
  return status
}

const resolveReviewerId = (reviewedBy) => {
  if (!reviewedBy) return null
  if (typeof reviewedBy === 'object') return reviewedBy._id || reviewedBy.id || null
  return reviewedBy
}

const isClaimedByOfficer = (item, officerId) => {
  const reviewerId = resolveReviewerId(item?.reviewedBy)
  return Boolean(reviewerId && officerId && String(reviewerId) === String(officerId))
}

const resolveApplicationItemType = (application) => {
  const rawStatus = application?.status || application?.applicationStatus || ''
  const status = String(rawStatus).toLowerCase()
  const applicationType = String(application?.applicationType || '').toLowerCase()
  const permitType = String(application?.permitType || '').toLowerCase()

  if (status.includes('renewal') || applicationType.includes('renewal') || permitType === 'renewal') {
    return 'renewals'
  }

  return 'applications'
}

// Priority scoring helpers for To Review tab
const getHoursInStatus = (item) => {
  if (!item) return 0
  const statusChangedAt = item.statusChangedAt || item.createdAt || item.updatedAt || item.submittedAt
  if (!statusChangedAt) return 0
  const hours = (new Date() - new Date(statusChangedAt)) / (1000 * 60 * 60)
  return Math.max(0, hours)
}

// Stale detection helpers for Part 5
const STALE_THRESHOLD_HOURS = 48

const ACTIVE_APPLICATION_STATUSES = new Set(['submitted', 'under_review', 'resubmit'])
const TERMINAL_APPLICATION_STATUSES = new Set(['approved', 'rejected', 'returned', 'cancelled'])
const ACTIVE_HELP_REQUEST_STATUSES = new Set(['open', 'in_progress'])
const TERMINAL_HELP_REQUEST_STATUSES = new Set(['resolved', 'closed'])

const isStale = (item) => {
  if (!item) return false

  const itemType = item._itemType
  const status = String(item.status || item.applicationStatus || '').toLowerCase()

  // Applications: check if claimed and in active status with stale reviewedAt
  if (itemType === 'applications' || itemType === 'renewals' || item.applicationId) {
    if (!item.reviewedBy) return false
    if (ACTIVE_APPLICATION_STATUSES.has(status) || !TERMINAL_APPLICATION_STATUSES.has(status)) {
      const reviewedAt = item.reviewedAt
      if (!reviewedAt) return false
      const hoursSinceReview = (new Date() - new Date(reviewedAt)) / (1000 * 60 * 60)
      return hoursSinceReview > STALE_THRESHOLD_HOURS
    }
  }

  // Help requests: check if claimed and in active status with stale claimedAt
  if (itemType === 'helpRequests' || item.requestId) {
    if (!item.claimedBy) return false
    if (ACTIVE_HELP_REQUEST_STATUSES.has(status) || !TERMINAL_HELP_REQUEST_STATUSES.has(status)) {
      const claimedAt = item.claimedAt
      if (!claimedAt) return false
      const hoursSinceClaim = (new Date() - new Date(claimedAt)) / (1000 * 60 * 60)
      return hoursSinceClaim > STALE_THRESHOLD_HOURS
    }
  }

  return false
}

const getStaleDuration = (item) => {
  if (!item) return null

  const timestamp = item.reviewedAt || item.claimedAt
  if (!timestamp) return null

  const hoursSince = (new Date() - new Date(timestamp)) / (1000 * 60 * 60)
  if (hoursSince <= 0) return null

  const days = Math.floor(hoursSince / 24)
  const hours = Math.floor(hoursSince % 24)

  if (days > 0 && hours > 0) {
    return `${days} days ${hours} hours`
  } else if (days > 0) {
    return `${days} days`
  } else {
    return `${hours} hours`
  }
}

export const calculatePriorityScore = (card) => {
  let score = 0

  // Base priority by item type
  const primaryItem = card._requests?.application
  const itemType = primaryItem?._itemType || card._itemType

  if (itemType === 'help_request' || itemType === 'helpRequests') {
    score += 100
  } else if (itemType === 'renewals') {
    score += 20
  } else if (itemType === 'application' || itemType === 'applications') {
    // Status-based priority tier (determines the tier, time determines position within tier)
    const status = String(primaryItem?.status || primaryItem?.applicationStatus || '').toLowerCase()
    if (status === 'appeal_pending') {
      score += 100  // Highest tier
    } else if (status === 'resubmit') {
      score += 90   // Next tier
    } else if (status === 'submitted') {
      score += 85   // New submissions
    } else if (status === 'under_review') {
      score += 80   // In progress
    } else if (status === 'returned') {
      score += 60   // Lowest tier (user's turn)
    } else {
      score += 50   // Default/other statuses
    }
  }

  // Claim status bonus (only for unclaimed items in Applications tab)
  const isUnclaimed = !primaryItem?.reviewedBy && !primaryItem?.claimedBy
  if (isUnclaimed) {
    score += 50
  }

  // Stale multiplier (1.5x for items claimed >48 hours ago - boosts within tier)
  if (isStale(primaryItem)) {
    score = Math.floor(score * 1.5)
  }

  // Time in status bonus (tiebreaker within tier, capped at +20)
  const hoursInStatus = getHoursInStatus(primaryItem)
  const timeBonus = Math.min(hoursInStatus * 0.5, 20)
  score += timeBonus

  return score
}

export default function useOfficerData(activeTab, refreshTrigger) {
  const { currentUser } = useAuthSession()

  // Data states per tab
  const [toReview, setToReview] = useState([])
  // Claimed items by type for To Review sub-tabs
  const [toReviewByType, setToReviewByType] = useState({
    applications: [],
    renewals: [],
    appeals: [],
    editRequests: [],
  })
  const [applications, setApplications] = useState([])
  const [appeals, setAppeals] = useState([])
  const [editRequests, setEditRequests] = useState([])
  const [renewals, setRenewals] = useState([])
  const [owners, setOwners] = useState([])
  const [drafts, setDrafts] = useState([])
  const [logs, setLogs] = useState([])
  const [businesses, setBusinesses] = useState([])
  const [helpRequests, setHelpRequests] = useState([])

  // Loading states
  const [loadingMap, setLoadingMap] = useState({})
  // Counts for badges
  const [counts, setCounts] = useState({})
  // Search for owners
  const [ownerSearch, setOwnerSearch] = useState('')

  const setTabLoading = (tab, loading) => {
    setLoadingMap(prev => ({ ...prev, [tab]: loading }))
  }

  // ── Fetch functions ──────────────────────────────────────────

  /** Resolve a stable businessId from any item shape.
   *  Prefer _businessSubdocId (subdoc _id) since permit-applications uses that as businessId.
   *  This ensures edit requests, appeals, cessations group under the same consolidated card. */
  const resolveBusinessId = (item) => {
    return item?._businessSubdocId || item?.businessId || item?.applicationId || item?._id || ''
  }

  const fetchToReview = useCallback(async () => {
    const officerId = currentUser?.id || currentUser?._id
    if (!officerId) return
    setTabLoading('toReview', true)
    try {
      const permitApplicationService = new PermitApplicationService()

      const [applicationsRes, editRequestsRes, appealsRes] = await Promise.allSettled([
        permitApplicationService.getApplications({
          filters: { reviewedBy: officerId },
          pagination: { limit: 200 }
        }),
        getEditRequests({ role: 'staff', limit: 200 }),
        getAppealsForReview({ limit: 200 }),
      ])

      const claimedApplications = applicationsRes.status === 'fulfilled'
        ? (applicationsRes.value?.data?.applications || applicationsRes.value?.applications || [])
          .map((application) => ({
            ...application,
            _itemType: resolveApplicationItemType(application),
          }))
        : []

      const allEditRequestsRaw = editRequestsRes.status === 'fulfilled'
        ? (Array.isArray(editRequestsRes.value?.data) ? editRequestsRes.value.data : [])
          .map((request) => ({
            ...request,
            status: normalizeEditRequestStatus(request?.status),
            _itemType: 'editRequests',
          }))
        : []
      // Include ALL edit requests for claimed businesses (pending + approved + rejected) for history
      const claimedEditRequests = allEditRequestsRaw
        .filter((request) => isClaimedByOfficer(request, officerId))
      // Keep unclaimed pending edit requests to merge later if their business is already claimed
      const unclaimedEditRequests = allEditRequestsRaw
        .filter((request) => !isClaimedByOfficer(request, officerId) && request.status === 'pending')

      const ACTIVE_APPEAL_STATUSES = ['submitted', 'pending', 'under_review']
      const allAppealsRaw = appealsRes.status === 'fulfilled'
        ? (Array.isArray(appealsRes.value?.data) ? appealsRes.value.data : [])
        : []
      // Include ALL appeals for claimed businesses (active + resolved) for history
      const claimedAppeals = allAppealsRaw
        .filter((appeal) => isClaimedByOfficer(appeal, officerId))
        .map((appeal) => ({ ...appeal, _itemType: 'appeals' }))
      // Keep unclaimed pending appeals to merge later if their business is already claimed
      const unclaimedAppeals = allAppealsRaw
        .filter((appeal) => !isClaimedByOfficer(appeal, officerId) && ACTIVE_APPEAL_STATUSES.includes(appeal.status))
        .map((appeal) => ({ ...appeal, _itemType: 'appeals' }))

      const claimedCessations = []

      // Build a businessId alias map from applications so that all items for the same
      // business (which may use different ID formats — subdoc _id vs businessId) resolve
      // to the same canonical ID. Applications are the source of truth since their
      // businessId is always the subdoc _id.
      const bizAliasMap = new Map() // maps any known alias → canonical ID
      for (const app of claimedApplications) {
        const canonicalId = String(app.businessId || app._id || '')
        if (!canonicalId) continue
        // The canonical ID is what the application uses (subdoc _id)
        bizAliasMap.set(canonicalId, canonicalId)
        // Also map the applicationId if different
        if (app.applicationId && String(app.applicationId) !== canonicalId) {
          bizAliasMap.set(String(app.applicationId), canonicalId)
        }
      }
      // Also learn aliases from appeals/edit-requests/cessations that carry _businessSubdocId
      const allItemsForAlias = [...claimedAppeals, ...unclaimedAppeals, ...claimedEditRequests, ...unclaimedEditRequests, ...claimedCessations]
      for (const item of allItemsForAlias) {
        const subdocId = item._businessSubdocId ? String(item._businessSubdocId) : null
        const rawBizId = item.businessId ? String(item.businessId) : null
        const canonical = item._canonicalBusinessId ? String(item._canonicalBusinessId) : null
        // If we have a subdocId, use it as canonical; map all variants to it
        const best = subdocId || bizAliasMap.get(rawBizId) || bizAliasMap.get(subdocId) || null
        if (best) {
          if (subdocId) bizAliasMap.set(subdocId, best)
          if (rawBizId) bizAliasMap.set(rawBizId, best)
          if (canonical) bizAliasMap.set(canonical, best)
        }
      }

      /** Resolve businessId using alias map, falling back to resolveBusinessId */
      const resolveWithAliases = (item) => {
        const rawId = resolveBusinessId(item)
        return bizAliasMap.get(String(rawId)) || rawId
      }

      // Build claimed-by-type object (will be updated with merged appeals below before calling setToReviewByType)
      const claimedByType = {
        applications: claimedApplications.filter(a => a._itemType === 'applications'),
        renewals: claimedApplications.filter(a => a._itemType === 'renewals'),
        appeals: claimedAppeals,
        editRequests: claimedEditRequests,
        cessation: claimedCessations,
      }

      // Group all claimed items by businessId into consolidated business cards
      const allItems = [
        ...claimedApplications,
        ...claimedEditRequests,
        ...claimedAppeals,
        ...claimedCessations,
      ]

      const businessMap = new Map()
      for (const item of allItems) {
        const bizId = String(resolveWithAliases(item))
        if (!bizId) continue
        if (!businessMap.has(bizId)) {
          businessMap.set(bizId, {
            businessId: bizId,
            businessName: item.businessName || item.registeredBusinessName || 'Unknown Business',
            _itemType: 'business',
            _requests: { application: null, editRequests: [], appeals: [] },
            createdAt: item.createdAt || item.updatedAt || item.submittedAt || new Date().toISOString(),
          })
        }
        const group = businessMap.get(bizId)
        // Update business name if we find a better one
        if (item.businessName && group.businessName === 'Unknown Business') {
          group.businessName = item.businessName
        }
        if (item.registeredBusinessName && group.businessName === 'Unknown Business') {
          group.businessName = item.registeredBusinessName
        }
        // Track earliest date
        const itemDate = new Date(item.createdAt || item.updatedAt || item.submittedAt || 0).getTime()
        const groupDate = new Date(group.createdAt || 0).getTime()
        if (itemDate > groupDate) group.createdAt = item.createdAt || item.updatedAt || item.submittedAt

        // Sort into categories
        switch (item._itemType) {
          case 'applications':
          case 'renewals':
            group._requests.application = item
            break
          case 'editRequests':
            group._requests.editRequests.push(item)
            break
          case 'appeals':
            group._requests.appeals.push(item)
            break
        }
      }

      // Merge unclaimed items into business cards that are already claimed via other items.
      // This handles the case where an appeal/edit request is submitted after the application was already claimed.
      const mergeUnclaimedIntoCards = (unclaimedItems, requestKey) => {
        for (const item of unclaimedItems) {
          const bizId = String(resolveWithAliases(item))
          if (!bizId || !businessMap.has(bizId)) continue
          const group = businessMap.get(bizId)
          const target = Array.isArray(group._requests[requestKey]) ? group._requests[requestKey] : []
          const isDuplicate = target.some(existing => String(existing._id) === String(item._id))
          if (!isDuplicate) target.push(item)
          if (!Array.isArray(group._requests[requestKey])) group._requests[requestKey] = target
        }
      }

      mergeUnclaimedIntoCards(unclaimedEditRequests, 'editRequests')
      mergeUnclaimedIntoCards(unclaimedAppeals, 'appeals')

      // Also include unclaimed items in claimedByType for sub-tab rendering
      const mergeUnclaimedIntoByType = (claimed, unclaimed) => {
        const merged = [...claimed]
        for (const item of unclaimed) {
          const bizId = String(resolveWithAliases(item))
          if (bizId && businessMap.has(bizId)) {
            const isDuplicate = merged.some(existing => String(existing._id) === String(item._id))
            if (!isDuplicate) merged.push(item)
          }
        }
        return merged
      }

      claimedByType.editRequests = mergeUnclaimedIntoByType(claimedEditRequests, unclaimedEditRequests)
      claimedByType.appeals = mergeUnclaimedIntoByType(claimedAppeals, unclaimedAppeals)
      setToReviewByType(claimedByType)

      const consolidatedItems = Array.from(businessMap.values())
        .map(card => {
          const primaryItem = card._requests?.application
          return {
            ...card,
            _priorityScore: calculatePriorityScore(card),
            _isStale: isStale(primaryItem),
            _staleDuration: getStaleDuration(primaryItem),
          }
        })
        .sort((a, b) => {
          // Primary: priority score (descending)
          if (a._priorityScore !== b._priorityScore) {
            return b._priorityScore - a._priorityScore
          }
          // Secondary: business name (alphabetical)
          return a.businessName.localeCompare(b.businessName)
        })

      setToReview(consolidatedItems)
      setCounts(prev => ({ ...prev, toReview: consolidatedItems.length }))
    } catch (err) { 
      console.error('[useOfficerData] fetchToReview error:', err)
      setToReview([]) 
      setCounts(prev => ({ ...prev, toReview: 0 }))
    }
    finally { setTabLoading('toReview', false) }
  }, [currentUser?.id, currentUser?._id])

  const fetchApplications = useCallback(async () => {
    setTabLoading('applications', true)
    try {
      const permitApplicationService = new PermitApplicationService()
      const res = await permitApplicationService.getApplications({
        filters: {},
        pagination: { limit: 200 },
        options: { skipAutoLogout: true }
      })
      const apps = res?.data?.applications || res?.applications || []
      const pendingCount = apps.filter(app =>
        PENDING_APPLICATION_STATUSES.has(app.status || app.applicationStatus)
      ).length
      setApplications(apps)
      setCounts(prev => ({ ...prev, applications: pendingCount }))
    } catch {
      setApplications([])
      setCounts(prev => ({ ...prev, applications: 0 }))
    }
    finally { setTabLoading('applications', false) }
  }, [])

  const fetchAppeals = useCallback(async () => {
    setTabLoading('appeals', true)
    try {
      const res = await getAppealsForReview({ role: 'staff' })
      const list = res?.data || res?.appeals || []
      const pending = list.filter(a => PENDING_APPEAL_STATUSES.has(a.status))
      setAppeals(pending)
      setCounts(prev => ({ ...prev, appeals: pending.length }))
    } catch {
      setAppeals([])
      setCounts(prev => ({ ...prev, appeals: 0 }))
    }
    finally { setTabLoading('appeals', false) }
  }, [])

  const fetchEditRequests = useCallback(async () => {
    setTabLoading('editRequests', true)
    try {
      const res = await getEditRequests({ role: 'staff', options: { skipAutoLogout: true } })
      const list = Array.isArray(res?.data) ? res.data : []
      const normalized = list.map((request) => {
        return { ...request, status: normalizeEditRequestStatus(request?.status) }
      })
      const pendingCount = normalized.filter(request => request.status === 'pending').length

      setEditRequests(normalized)
      setCounts(prev => ({ ...prev, editRequests: pendingCount }))
    } catch {
      setEditRequests([])
      setCounts(prev => ({ ...prev, editRequests: 0 }))
    }
    finally { setTabLoading('editRequests', false) }
  }, [])

  const fetchRenewals = useCallback(async () => {
    setTabLoading('renewals', true)
    try {
      const permitApplicationService = new PermitApplicationService()
      const res = await permitApplicationService.getApplications({
        filters: { status: 'pending_renewal,renewal_submitted' },
        pagination: { limit: 100 },
        options: { skipAutoLogout: true }
      })
      const apps = res?.data?.applications || res?.applications || []
      const pendingCount = apps.filter(app =>
        PENDING_RENEWAL_STATUSES.has(app.status || app.applicationStatus)
      ).length
      setRenewals(apps)
      setCounts(prev => ({ ...prev, renewals: pendingCount }))
    } catch {
      setRenewals([])
      setCounts(prev => ({ ...prev, renewals: 0 }))
    }
    finally { setTabLoading('renewals', false) }
  }, [])

  const fetchOwners = useCallback(async (q = '') => {
    setTabLoading('owners', true)
    try {
      const query = q.trim()
      const res = await searchUsers({ 
        q: query || undefined, 
        role: 'business_owner', 
        options: { skipAutoLogout: true } 
      })
      const list = Array.isArray(res) ? res : res?.data || []
      setOwners(list)
    } catch { setOwners([]) }
    finally { setTabLoading('owners', false) }
  }, [])

  const fetchDrafts = useCallback(async () => {
    setTabLoading('drafts', true)
    try {
      const permitApplicationService = new PermitApplicationService()
      const res = await permitApplicationService.getApplications({
        filters: { status: 'draft' },
        pagination: { limit: 100 },
        options: { skipAutoLogout: true }
      })
      const apps = res?.data?.applications || res?.applications || []
      const draftCount = apps.filter(app => (app.status || app.applicationStatus) === 'draft').length
      setDrafts(apps)
      setCounts(prev => ({ ...prev, drafts: draftCount }))
    } catch {
      setDrafts([])
      setCounts(prev => ({ ...prev, drafts: 0 }))
    }
    finally { setTabLoading('drafts', false) }
  }, [])


  const fetchLogs = useCallback(async () => {
    setTabLoading('logs', true)
    try {
      // Fetch personal action history (own userId OR metadata.officerId matches current user)
      const res = await getMyActions({ limit: 200, options: { skipAutoLogout: true } })
      const logs = res?.logs || res?.data || []
      setLogs(logs)
    } catch { setLogs([]) }
    finally { setTabLoading('logs', false) }
  }, [])

  const fetchBusinesses = useCallback(async () => {
    setTabLoading('businesses', true)
    try {
      const res = await getBusinesses({ limit: 200, options: { skipAutoLogout: true } })
      const list = res?.businesses || []
      setBusinesses(list)
    } catch {
      setBusinesses([])
    }
    finally { setTabLoading('businesses', false) }
  }, [])

  const fetchHelpRequests = useCallback(async () => {
    setTabLoading('helpRequests', true)
    try {
      const res = await getHelpRequests({ limit: 200, options: { skipAutoLogout: true } })
      const list = res?.data || res?.helpRequests || []
      setHelpRequests(list)
    } catch {
      setHelpRequests([])
    }
    finally { setTabLoading('helpRequests', false) }
  }, [])

  // Fetch active tab data
  const fetchActiveTabData = useCallback(() => {
    switch (activeTab) {
      case 'toReview': return fetchToReview()
      case 'applications': return fetchApplications()
      case 'appeals': return fetchAppeals()
      case 'editRequests': return fetchEditRequests()
      case 'renewals': return fetchRenewals()
      case 'owners': return fetchOwners(ownerSearch)
      case 'drafts': return fetchDrafts()
      case 'logs': return fetchLogs()
      case 'businesses': return fetchBusinesses()
      case 'helpRequests': return fetchHelpRequests()
    }
  }, [activeTab, fetchToReview, fetchApplications, fetchAppeals, fetchEditRequests, fetchRenewals, fetchOwners, fetchDrafts, fetchLogs, fetchBusinesses, fetchHelpRequests, ownerSearch])


  // Fetch on tab change
  useEffect(() => {
    fetchActiveTabData()
  }, [activeTab, refreshTrigger])

  // Fetch all counts on mount and when currentUser becomes available
  useEffect(() => {
    fetchToReview()
    fetchApplications()
    fetchAppeals()
    fetchEditRequests()
    fetchRenewals()
    fetchDrafts()
    fetchBusinesses()
  }, [currentUser?.id])

  // Owner search with debounce
  useEffect(() => {
    if (activeTab !== 'owners') return
    const t = setTimeout(() => fetchOwners(ownerSearch), 300)
    return () => clearTimeout(t)
  }, [ownerSearch, activeTab])

  // Poll edit requests while edits tab is active so officer list stays fresh
  useEffect(() => {
    if (activeTab !== 'editRequests') return
    const intervalId = setInterval(() => {
      fetchEditRequests()
    }, EDIT_REQUESTS_POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [activeTab, fetchEditRequests])

  // Poll toReview while tab is active so officer list stays fresh
  useEffect(() => {
    if (activeTab !== 'toReview') return
    const intervalId = setInterval(() => {
      fetchToReview()
    }, EDIT_REQUESTS_POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [activeTab, fetchToReview])

  // Get current list for active tab
  const getCurrentList = useCallback(() => {
    const lists = {
      toReview,
      applications,
      appeals,
      editRequests,
      renewals,
      owners,
      drafts,
      logs,
      businesses,
      helpRequests,
    }
    return lists[activeTab] || []
  }, [activeTab, toReview, applications, appeals, editRequests, renewals, owners, drafts, logs, businesses, helpRequests])

  // Refresh all application-related tabs (for claim/release/transfer)
  const refreshApplicationTabs = useCallback(() => {
    fetchToReview()
    fetchApplications()
  }, [fetchToReview, fetchApplications])

  return {
    // Data
    toReview,
    toReviewByType,
    applications,
    appeals,
    editRequests,
    renewals,
    owners,
    drafts,
    logs,
    businesses,
    helpRequests,
    // Counts
    counts,
    // Loading
    loadingMap,
    isLoading: loadingMap[activeTab],
    // Search
    ownerSearch,
    setOwnerSearch,
    // Methods
    getCurrentList,
    refresh: fetchActiveTabData,
    refreshToReview: fetchToReview,
    refreshApplicationTabs,
    refreshEditRequests: fetchEditRequests,
    refreshHelpRequests: fetchHelpRequests,
  }
}
