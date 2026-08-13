import { describe, it, expect } from 'vitest'
import {
  buildProgressSteps,
  buildAuditSteps,
} from '../buildApplicationProgressSteps'

const baseApplication = {
  applicationId: 'APP-2024-001',
  businessName: 'Sample Business',
  createdByOfficer: false,
  hadAppealGranted: false,
}

const createdAt = '2024-01-10T08:00:00Z'
const submittedAt = '2024-01-11T09:00:00Z'
const claimedAt = '2024-01-12T10:00:00Z'
const reviewedAt = '2024-01-13T11:00:00Z'
const returnedAt = '2024-01-14T12:00:00Z'
const resubmittedAt = '2024-01-15T13:00:00Z'
const rejectedAt = '2024-01-14T12:00:00Z'
const appealFiledAt = '2024-01-16T14:00:00Z'
const appealResolvedAt = '2024-01-17T15:00:00Z'

function log(eventType, date, metadata = {}) {
  return { eventType, createdAt: date, metadata }
}

function titles(steps) {
  return steps.map((s) => s.title)
}

describe('buildAuditSteps', () => {
  it('creates a draft -> submitted -> under review timeline', () => {
    const steps = buildAuditSteps(
      [
        log('application_created', createdAt),
        log('application_submitted', submittedAt),
        log('application_claimed', claimedAt),
      ],
      baseApplication,
    )

    expect(titles(steps)).toEqual([
      'Draft in Progress',
      'Submitted',
      'Under Review',
    ])
    expect(steps[2].status).toBe('finish')
  })

  it('marks return and resubmission correctly', () => {
    const steps = buildAuditSteps(
      [
        log('application_submitted', submittedAt),
        log('application_claimed', claimedAt),
        log('field_reviewed', reviewedAt),
        log('application_returned', returnedAt),
        log('application_resubmitted', resubmittedAt),
      ],
      baseApplication,
    )

    expect(titles(steps)).toEqual([
      'Submitted',
      'Under Review',
      'Review in Progress',
      'Returned to Applicant',
      'Resubmitted',
    ])
    expect(steps[3].status).toBe('finish')
    expect(steps[4].status).toBe('finish')
  })

  it('creates an approved timeline', () => {
    const steps = buildAuditSteps(
      [
        log('application_submitted', submittedAt),
        log('application_claimed', claimedAt),
        log('application_approved', reviewedAt),
      ],
      baseApplication,
    )

    expect(titles(steps)).toEqual(['Submitted', 'Under Review', 'Approved'])
    expect(steps[2].status).toBe('finish')
  })

  it('creates a rejected timeline', () => {
    const steps = buildAuditSteps(
      [
        log('application_submitted', submittedAt),
        log('application_claimed', claimedAt),
        log('application_rejected', rejectedAt),
      ],
      baseApplication,
    )

    expect(titles(steps)).toEqual([
      'Submitted',
      'Under Review',
      'Application Rejected',
    ])
    expect(steps[2].status).toBe('error')
  })
})

describe('buildProgressSteps', () => {
  it('new draft application shows draft in progress as active, not finished', () => {
    const { steps, current } = buildProgressSteps(
      [log('application_created', createdAt)],
      baseApplication,
      'draft',
      null,
    )

    expect(titles(steps)).toEqual(['Draft in Progress'])
    expect(steps[0].status).toBe('process')
    expect(steps[0].content).toBe('Started on: Jan 10, 2024')
    expect(current).toBe(0)
  })

  it('officer draft shows the officer is completing the application', () => {
    const { steps, current } = buildProgressSteps(
      [log('walkin_application_created', createdAt)],
      { ...baseApplication, createdByOfficer: true },
      'officer_draft',
      null,
    )

    expect(titles(steps)).toEqual(['Created by Officer', 'Draft in Progress'])
    expect(steps[0].status).toBe('finish')
    expect(steps[1].status).toBe('process')
    expect(steps[1].content).toBe('Officer is completing the application')
    expect(current).toBe(1)
  })

  it('submitted application shows under review as pending', () => {
    const { steps, current } = buildProgressSteps(
      [log('application_created', createdAt), log('application_submitted', submittedAt)],
      baseApplication,
      'submitted',
      null,
    )

    expect(titles(steps)).toEqual([
      'Draft in Progress',
      'Submitted',
      'Under Review',
    ])
    expect(steps[0].status).toBe('finish')
    expect(steps[1].status).toBe('finish')
    expect(steps[2].status).toBe('process')
    expect(current).toBe(2)
  })

  it('under review status shows the review step as active', () => {
    const { steps, current } = buildProgressSteps(
      [
        log('application_submitted', submittedAt),
        log('application_claimed', claimedAt),
      ],
      baseApplication,
      'under_review',
      null,
    )

    expect(titles(steps)).toEqual(['Submitted', 'Under Review'])
    expect(steps[1].status).toBe('process')
    expect(current).toBe(1)
  })

  it('returned status shows resubmit as active', () => {
    const { steps, current } = buildProgressSteps(
      [
        log('application_submitted', submittedAt),
        log('application_claimed', claimedAt),
        log('field_reviewed', reviewedAt),
        log('application_returned', returnedAt),
      ],
      baseApplication,
      'returned',
      null,
    )

    expect(titles(steps)).toEqual([
      'Submitted',
      'Under Review',
      'Review in Progress',
      'Returned to Applicant',
      'Resubmit to Review',
    ])
    expect(steps[3].status).toBe('finish')
    expect(steps[4].status).toBe('process')
    expect(current).toBe(4)
  })

  it('resubmit status shows waiting for review as active', () => {
    const { steps, current } = buildProgressSteps(
      [
        log('application_submitted', submittedAt),
        log('application_claimed', claimedAt),
        log('application_returned', returnedAt),
        log('application_resubmitted', resubmittedAt),
      ],
      baseApplication,
      'resubmit',
      null,
    )

    expect(titles(steps)).toEqual([
      'Submitted',
      'Under Review',
      'Returned to Applicant',
      'Resubmitted',
      'Waiting for Review',
    ])
    expect(steps[3].status).toBe('finish')
    expect(steps[4].status).toBe('process')
    expect(current).toBe(4)
  })

  it('rejected -> appeal filed -> appeal under review', () => {
    const { steps, current } = buildProgressSteps(
      [
        log('application_submitted', submittedAt),
        log('application_claimed', claimedAt),
        log('application_rejected', rejectedAt),
        log('appeal_submitted', appealFiledAt),
      ],
      baseApplication,
      'appeal_pending',
      null,
    )

    expect(titles(steps)).toEqual([
      'Submitted',
      'Under Review',
      'Application Rejected',
      'Appeal Filed',
      'Appeal Under Review',
    ])
    expect(steps[2].status).toBe('error')
    expect(steps[3].status).toBe('finish')
    expect(steps[4].status).toBe('process')
    expect(current).toBe(4)
  })

  it('rejected -> appeal filed -> appeal granted -> under review', () => {
    const { steps, current } = buildProgressSteps(
      [
        log('application_submitted', submittedAt),
        log('application_claimed', claimedAt),
        log('application_rejected', rejectedAt),
        log('appeal_submitted', appealFiledAt),
        log('appeal_resolved', appealResolvedAt, {
          outcome: 'approved',
          granted: true,
          status: 'approved',
        }),
      ],
      { ...baseApplication, hadAppealGranted: true },
      'under_review',
      null,
    )

    expect(titles(steps)).toEqual([
      'Submitted',
      'Under Review',
      'Application Rejected',
      'Appeal Filed',
      'Appeal Granted',
      'Under Review',
    ])
    expect(steps[4].status).toBe('finish')
    expect(steps[5].status).toBe('process')
    expect(current).toBe(5)
  })

  it('rejected -> appeal filed -> appeal rejected', () => {
    const { steps, current } = buildProgressSteps(
      [
        log('application_submitted', submittedAt),
        log('application_claimed', claimedAt),
        log('application_rejected', rejectedAt),
        log('appeal_submitted', appealFiledAt),
        log('appeal_resolved', appealResolvedAt, {
          outcome: 'rejected',
          granted: false,
          status: 'rejected',
        }),
      ],
      baseApplication,
      'appeal_rejected',
      null,
    )

    expect(titles(steps)).toEqual([
      'Submitted',
      'Under Review',
      'Application Rejected',
      'Appeal Filed',
      'Appeal Rejected',
    ])
    expect(steps[4].status).toBe('error')
    expect(current).toBe(5)
  })

  it('approved after appeal shows Approved After Appeal', () => {
    const approvedAfter = '2024-01-18T16:00:00Z'
    const { steps, current } = buildProgressSteps(
      [
        log('application_submitted', submittedAt),
        log('application_claimed', claimedAt),
        log('application_rejected', rejectedAt),
        log('appeal_submitted', appealFiledAt),
        log('appeal_resolved', appealResolvedAt, {
          outcome: 'approved',
          granted: true,
          status: 'approved',
        }),
        log('application_approved', approvedAfter),
      ],
      { ...baseApplication, hadAppealGranted: true },
      'approved',
      null,
    )

    expect(titles(steps)).toEqual([
      'Submitted',
      'Under Review',
      'Application Rejected',
      'Appeal Filed',
      'Appeal Granted',
      'Approved After Appeal',
    ])
    expect(steps[5].status).toBe('finish')
    expect(current).toBe(6)
  })

  it('multiple return/resubmit cycles', () => {
    const secondClaimedAt = '2024-01-17T15:00:00Z'
    const secondReturnedAt = '2024-01-18T16:00:00Z'
    const secondResubmittedAt = '2024-01-19T17:00:00Z'
    const { steps, current } = buildProgressSteps(
      [
        log('application_submitted', submittedAt),
        log('application_claimed', claimedAt),
        log('application_returned', returnedAt),
        log('application_resubmitted', resubmittedAt),
        log('application_claimed', secondClaimedAt),
        log('application_returned', secondReturnedAt),
        log('application_resubmitted', secondResubmittedAt),
      ],
      baseApplication,
      'resubmit',
      null,
    )

    expect(titles(steps)).toEqual([
      'Submitted',
      'Under Review',
      'Returned to Applicant',
      'Resubmitted',
      'Under Review',
      'Returned to Applicant',
      'Resubmitted',
      'Waiting for Review',
    ])
    expect(steps[7].status).toBe('process')
    expect(current).toBe(7)
  })

  it('merges synthetic appeal logs when audit logs lack appeal events', () => {
    const { steps, current } = buildProgressSteps(
      [
        log('application_submitted', submittedAt),
        log('application_claimed', claimedAt),
        log('application_rejected', rejectedAt),
      ],
      baseApplication,
      'appeal_rejected',
      {
        _id: 'appeal-1',
        createdAt: appealFiledAt,
        updatedAt: appealResolvedAt,
        status: 'rejected',
        appealType: 'rejection_appeal',
      },
    )

    expect(titles(steps)).toEqual([
      'Submitted',
      'Under Review',
      'Application Rejected',
      'Appeal Filed',
      'Appeal Rejected',
    ])
    expect(steps[4].status).toBe('error')
    expect(current).toBe(5)
  })

  it('uses fallback steps when no audit logs exist', () => {
    const { steps, current } = buildProgressSteps(
      [],
      baseApplication,
      'under_review',
      null,
    )

    expect(titles(steps)).toEqual([
      'Draft in Progress',
      'Submitted',
      'Under Review',
      'Decision Pending',
    ])
    expect(steps[2].status).toBe('process')
    expect(current).toBe(2)
  })
})
