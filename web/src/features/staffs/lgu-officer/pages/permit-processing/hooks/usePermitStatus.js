import { useAuthSession } from '@/features/authentication'

/**
 * usePermitStatus
 * 
 * Provides status-based logic and helpers for permit processing.
 * Determines what actions are available based on current status and user role.
 * 
 * Workflow states:
 * - pending: Auto-created when business is created, waiting for officer claim
 * - in_progress: Officer claimed, preparing to print
 * - printing: Currently printing permits
 * - ready_for_claim: Printed, business owner notified
 * - claimed_by_owner: Business owner picked up from office (manual verification)
 * - completed: Officer marked as finished
 */
export function usePermitStatus(permit) {
  const { currentUser } = useAuthSession()
  const status = permit?.status || 'pending'
  const reviewedBy = permit?.reviewedBy
  const currentUserId = currentUser?.id || currentUser?._id

  const isClaimed = Boolean(reviewedBy)
  const isClaimedByMe = isClaimed && String(reviewedBy?._id || reviewedBy) === String(currentUserId)

  // Terminal states - no further actions allowed
  const isTerminal = ['claimed_by_owner', 'completed'].includes(status)

  // Can claim: unclaimed and not in terminal state
  const canClaim = !isClaimed && !isTerminal

  // Can release: claimed by me and not in terminal state
  const canRelease = isClaimedByMe && !isTerminal

  // Can print: claimed by me and in in_progress state
  const canPrint = isClaimedByMe && status === 'in_progress'

  // Can notify owner: claimed by me and in printing state
  const canNotifyOwner = isClaimedByMe && status === 'printing'

  // Can mark owner claimed: claimed by me and in ready_for_claim state
  const canMarkOwnerClaimed = isClaimedByMe && status === 'ready_for_claim'

  // Can complete: claimed by me and in claimed_by_owner state
  const canComplete = isClaimedByMe && status === 'claimed_by_owner'

  return {
    status,
    isClaimed,
    isClaimedByMe,
    isTerminal,
    canClaim,
    canRelease,
    canPrint,
    canNotifyOwner,
    canMarkOwnerClaimed,
    canComplete,
  }
}
