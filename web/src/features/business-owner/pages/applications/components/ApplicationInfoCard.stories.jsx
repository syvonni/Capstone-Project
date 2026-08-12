import ApplicationInfoCard from './ApplicationInfoCard'

export default {
  title: 'Business Owner/ApplicationInfoCard',
  component: ApplicationInfoCard,
  tags: ['autodocs'],
  argTypes: {
    onProgressClick: { action: 'progress clicked' },
    onViewReceipt: { action: 'receipt viewed' },
    onViewAppealReceipt: { action: 'appeal receipt viewed' },
    onViewAppealDetails: { action: 'appeal details viewed' },
    onAppealClick: { action: 'appeal clicked' },
    onShowAppRejectionModal: { action: 'app rejection modal shown' },
    onShowAppealRejectionModal: { action: 'appeal rejection modal shown' },
    onShowApprovalCommentModal: { action: 'approval comment modal shown' },
  },
}

const mockApplication = {
  _id: 'app-1234567890',
  applicationId: 'app-1234567890',
  businessId: 'biz-1234567890',
  businessName: 'Sample Business Name',
  applicationReferenceNumber: 'APP-2024-001',
  status: 'submitted',
  applicationStatus: 'submitted',
  formType: 'unified_business_permit',
  category: 'retail',
  registrationType: 'regular',
  formData: {
    businessName: 'Sample Business',
  },
  createdAt: '2024-01-10T08:00:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
  submittedAt: '2024-01-15T10:30:00Z',
  reviewedAt: '2024-01-16T14:00:00Z',
  reviewedBy: 'officer-123',
  reviewedByName: 'John Doe',
  rejectionReason: null,
  reviewComments: null,
  hasActiveAppeal: false,
  appealExhausted: false,
}

const mockAppealDetails = {
  _id: 'appeal-123',
  status: 'rejected',
  resolution: 'The appeal was reviewed and the original rejection stands. The application did not meet the required documentation standards.',
  createdAt: '2024-01-20T10:00:00Z',
}

export const Submitted = {
  args: {
    application: {
      ...mockApplication,
      status: 'submitted',
      applicationStatus: 'submitted',
      reviewedAt: null,
    },
  },
}

export const UnderReview = {
  args: {
    application: {
      ...mockApplication,
      status: 'under_review',
      applicationStatus: 'under_review',
    },
  },
}

export const NeedsRevision = {
  args: {
    application: {
      ...mockApplication,
      status: 'needs_revision',
      applicationStatus: 'needs_revision',
      reviewComments: 'Please update your business address to include a street number.',
    },
  },
}

export const Resubmitted = {
  args: {
    application: {
      ...mockApplication,
      status: 'resubmit',
      applicationStatus: 'resubmit',
    },
  },
}

export const Approved = {
  args: {
    application: {
      ...mockApplication,
      status: 'approved',
      applicationStatus: 'approved',
      reviewComments: 'Application approved. All requirements met.',
    },
    onShowApprovalCommentModal: () => {},
  },
}

export const ApprovedWithoutComment = {
  args: {
    application: {
      ...mockApplication,
      status: 'approved',
      applicationStatus: 'approved',
    },
  },
}

export const Rejected = {
  args: {
    application: {
      ...mockApplication,
      status: 'rejected',
      applicationStatus: 'rejected',
      rejectionReason: 'Application rejected due to incomplete documentation.',
    },
  },
}

export const AppealPending = {
  args: {
    application: {
      ...mockApplication,
      status: 'appeal_pending',
      applicationStatus: 'appeal_pending',
      rejectionReason: 'Application rejected due to incomplete documentation.',
      hasActiveAppeal: true,
      appealId: 'appeal-123',
    },
  },
}

export const AppealRejected = {
  args: {
    application: {
      ...mockApplication,
      status: 'appeal_rejected',
      applicationStatus: 'appeal_rejected',
      rejectionReason: 'Application rejected due to incomplete documentation.',
      hasActiveAppeal: false,
      appealExhausted: true,
      appealId: 'appeal-123',
    },
    appealDetails: mockAppealDetails,
  },
}

export const AllStates = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <h3>Submitted</h3>
      <ApplicationInfoCard
        application={{ ...mockApplication, status: 'submitted', applicationStatus: 'submitted', reviewedAt: null }}
        onProgressClick={() => {}}
        onViewReceipt={() => {}}
        onViewAppealReceipt={() => {}}
        onViewAppealDetails={() => {}}
        onAppealClick={() => {}}
        onShowAppRejectionModal={() => {}}
        onShowAppealRejectionModal={() => {}}
      />
      
      <h3>Under Review</h3>
      <ApplicationInfoCard
        application={{ ...mockApplication, status: 'under_review', applicationStatus: 'under_review' }}
        onProgressClick={() => {}}
        onViewReceipt={() => {}}
        onViewAppealReceipt={() => {}}
        onViewAppealDetails={() => {}}
        onAppealClick={() => {}}
        onShowAppRejectionModal={() => {}}
        onShowAppealRejectionModal={() => {}}
      />
      
      <h3>Needs Revision</h3>
      <ApplicationInfoCard
        application={{ ...mockApplication, status: 'needs_revision', applicationStatus: 'needs_revision', reviewComments: 'Please update your business address.' }}
        onProgressClick={() => {}}
        onViewReceipt={() => {}}
        onViewAppealReceipt={() => {}}
        onViewAppealDetails={() => {}}
        onAppealClick={() => {}}
        onShowAppRejectionModal={() => {}}
        onShowAppealRejectionModal={() => {}}
      />
      
      <h3>Resubmitted</h3>
      <ApplicationInfoCard
        application={{ ...mockApplication, status: 'resubmit', applicationStatus: 'resubmit' }}
        onProgressClick={() => {}}
        onViewReceipt={() => {}}
        onViewAppealReceipt={() => {}}
        onViewAppealDetails={() => {}}
        onAppealClick={() => {}}
        onShowAppRejectionModal={() => {}}
        onShowAppealRejectionModal={() => {}}
      />
      
      <h3>Approved</h3>
      <ApplicationInfoCard
        application={{ ...mockApplication, status: 'approved', applicationStatus: 'approved', reviewComments: 'Application approved.' }}
        onProgressClick={() => {}}
        onViewReceipt={() => {}}
        onViewAppealReceipt={() => {}}
        onViewAppealDetails={() => {}}
        onAppealClick={() => {}}
        onShowAppRejectionModal={() => {}}
        onShowAppealRejectionModal={() => {}}
      />
      
      <h3>Rejected</h3>
      <ApplicationInfoCard
        application={{ ...mockApplication, status: 'rejected', applicationStatus: 'rejected', rejectionReason: 'Application rejected due to incomplete documentation.' }}
        onProgressClick={() => {}}
        onViewReceipt={() => {}}
        onViewAppealReceipt={() => {}}
        onViewAppealDetails={() => {}}
        onAppealClick={() => {}}
        onShowAppRejectionModal={() => {}}
        onShowAppealRejectionModal={() => {}}
      />
      
      <h3>Appeal Pending</h3>
      <ApplicationInfoCard
        application={{ ...mockApplication, status: 'appeal_pending', applicationStatus: 'appeal_pending', rejectionReason: 'Application rejected due to incomplete documentation.', hasActiveAppeal: true, appealId: 'appeal-123' }}
        onProgressClick={() => {}}
        onViewReceipt={() => {}}
        onViewAppealReceipt={() => {}}
        onViewAppealDetails={() => {}}
        onAppealClick={() => {}}
        onShowAppRejectionModal={() => {}}
        onShowAppealRejectionModal={() => {}}
      />
      
      <h3>Appeal Rejected</h3>
      <ApplicationInfoCard
        application={{ ...mockApplication, status: 'appeal_rejected', applicationStatus: 'appeal_rejected', rejectionReason: 'Application rejected due to incomplete documentation.', hasActiveAppeal: false, appealExhausted: true, appealId: 'appeal-123' }}
        appealDetails={mockAppealDetails}
        onProgressClick={() => {}}
        onViewReceipt={() => {}}
        onViewAppealReceipt={() => {}}
        onViewAppealDetails={() => {}}
        onAppealClick={() => {}}
        onShowAppRejectionModal={() => {}}
        onShowAppealRejectionModal={() => {}}
      />
    </div>
  ),
}
