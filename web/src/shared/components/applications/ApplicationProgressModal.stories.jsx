import { Steps, theme } from 'antd'
import buildProgressSteps from './buildApplicationProgressSteps'

export default {
  title: 'Applications/ApplicationProgressModal',
  component: Steps,
  tags: ['autodocs'],
}

const baseApplication = {
  applicationId: 'APP-2024-001',
  businessName: 'Sample Business',
  createdByOfficer: false,
  hadAppealGranted: false,
}

const dates = {
  created: '2024-01-10T08:00:00Z',
  submitted: '2024-01-11T09:00:00Z',
  claimed: '2024-01-12T10:00:00Z',
  reviewed: '2024-01-13T11:00:00Z',
  returned: '2024-01-14T12:00:00Z',
  resubmitted: '2024-01-15T13:00:00Z',
  rejected: '2024-01-14T12:00:00Z',
  appealFiled: '2024-01-16T14:00:00Z',
  appealResolved: '2024-01-17T15:00:00Z',
  approvedAfterAppeal: '2024-01-18T16:00:00Z',
}

function log(eventType, date, metadata = {}) {
  return { eventType, createdAt: date, metadata }
}

function Timeline({ auditLogs, application, status, latestAppeal }) {
  const { token } = theme.useToken()
  const { steps, current } = buildProgressSteps(
    auditLogs,
    application,
    status,
    latestAppeal,
    token,
  )
  return (
    <Steps
      orientation="vertical"
      current={current}
      items={steps}
      size="small"
    />
  )
}

function renderTimeline(auditLogs, application, status, latestAppeal) {
  return (
    <Timeline
      auditLogs={auditLogs}
      application={application}
      status={status}
      latestAppeal={latestAppeal}
    />
  )
}

export const Submitted = {
  render: () =>
    renderTimeline(
      [log('application_created', dates.created), log('application_submitted', dates.submitted)],
      baseApplication,
      'submitted',
    ),
}

export const UnderReview = {
  render: () =>
    renderTimeline(
      [log('application_submitted', dates.submitted), log('application_claimed', dates.claimed)],
      baseApplication,
      'under_review',
    ),
}

export const Returned = {
  render: () =>
    renderTimeline(
      [
        log('application_submitted', dates.submitted),
        log('application_claimed', dates.claimed),
        log('field_reviewed', dates.reviewed),
        log('application_returned', dates.returned),
      ],
      baseApplication,
      'returned',
    ),
}

export const Resubmitted = {
  render: () =>
    renderTimeline(
      [
        log('application_submitted', dates.submitted),
        log('application_claimed', dates.claimed),
        log('application_returned', dates.returned),
        log('application_resubmitted', dates.resubmitted),
      ],
      baseApplication,
      'resubmit',
    ),
}

export const Approved = {
  render: () =>
    renderTimeline(
      [
        log('application_submitted', dates.submitted),
        log('application_claimed', dates.claimed),
        log('application_approved', dates.reviewed),
      ],
      baseApplication,
      'approved',
    ),
}

export const Rejected = {
  render: () =>
    renderTimeline(
      [
        log('application_submitted', dates.submitted),
        log('application_claimed', dates.claimed),
        log('application_rejected', dates.rejected),
      ],
      baseApplication,
      'rejected',
    ),
}

export const AppealPending = {
  render: () =>
    renderTimeline(
      [
        log('application_submitted', dates.submitted),
        log('application_claimed', dates.claimed),
        log('application_rejected', dates.rejected),
        log('appeal_submitted', dates.appealFiled),
      ],
      baseApplication,
      'appeal_pending',
    ),
}

export const AppealGranted = {
  render: () =>
    renderTimeline(
      [
        log('application_submitted', dates.submitted),
        log('application_claimed', dates.claimed),
        log('application_rejected', dates.rejected),
        log('appeal_submitted', dates.appealFiled),
        log('appeal_resolved', dates.appealResolved, {
          outcome: 'approved',
          granted: true,
          status: 'approved',
        }),
      ],
      { ...baseApplication, hadAppealGranted: true },
      'under_review',
    ),
}

export const AppealRejected = {
  render: () =>
    renderTimeline(
      [
        log('application_submitted', dates.submitted),
        log('application_claimed', dates.claimed),
        log('application_rejected', dates.rejected),
        log('appeal_submitted', dates.appealFiled),
        log('appeal_resolved', dates.appealResolved, {
          outcome: 'rejected',
          granted: false,
          status: 'rejected',
        }),
      ],
      baseApplication,
      'appeal_rejected',
    ),
}

export const ApprovedAfterAppeal = {
  render: () =>
    renderTimeline(
      [
        log('application_submitted', dates.submitted),
        log('application_claimed', dates.claimed),
        log('application_rejected', dates.rejected),
        log('appeal_submitted', dates.appealFiled),
        log('appeal_resolved', dates.appealResolved, {
          outcome: 'approved',
          granted: true,
          status: 'approved',
        }),
        log('application_approved', dates.approvedAfterAppeal),
      ],
      { ...baseApplication, hadAppealGranted: true },
      'approved',
    ),
}

export const MultipleReturnCycles = {
  render: () =>
    renderTimeline(
      [
        log('application_submitted', dates.submitted),
        log('application_claimed', dates.claimed),
        log('application_returned', dates.returned),
        log('application_resubmitted', dates.resubmitted),
        log('application_claimed', '2024-01-17T15:00:00Z'),
        log('application_returned', '2024-01-18T16:00:00Z'),
        log('application_resubmitted', '2024-01-19T17:00:00Z'),
      ],
      baseApplication,
      'resubmit',
    ),
}

export const LegacyAppealFallback = {
  render: () =>
    renderTimeline(
      [
        log('application_submitted', dates.submitted),
        log('application_claimed', dates.claimed),
        log('application_rejected', dates.rejected),
      ],
      baseApplication,
      'appeal_rejected',
      {
        _id: 'appeal-1',
        createdAt: dates.appealFiled,
        updatedAt: dates.appealResolved,
        status: 'rejected',
        appealType: 'rejection_appeal',
      },
    ),
}
