/**
 * Mock data and fixtures for inspection items feature testing
 */

export const mockInspectionItems = [
  {
    _id: '1',
    name: 'Fire Extinguisher Inspection',
    question: 'Is there a fire extinguisher present on the premises?',
    description: 'Check for presence of fire extinguisher',
    violationId: { _id: '1', name: 'Missing Fire Extinguisher' },
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-05T00:00:00Z',
    version: 1,
    legalBasis: [
      {
        url: 'https://nfpa.org/codes-and-standards/',
        title: 'NFPA 10 - Portable Fire Extinguishers',
        description: 'Fire extinguisher requirements'
      }
    ]
  },
  {
    _id: '2',
    name: 'Emergency Exit Inspection',
    question: 'Are emergency exits clearly marked and unobstructed?',
    description: 'Check emergency exit signage and accessibility',
    violationId: { _id: '2', name: 'Blocked Emergency Exit' },
    isActive: true,
    createdAt: '2026-08-02T00:00:00Z',
    updatedAt: '2026-08-06T00:00:00Z',
    version: 1,
    legalBasis: []
  },
  {
    _id: '3',
    name: 'Electrical Wiring Inspection',
    question: 'Is the electrical wiring up to code?',
    description: 'Check electrical compliance',
    violationId: null,
    isActive: false,
    createdAt: '2026-08-03T00:00:00Z',
    updatedAt: '2026-08-07T00:00:00Z',
    version: 2,
    legalBasis: [
      {
        url: 'https://officialgazette.gov.ph/',
        title: 'Philippine Electrical Code',
        description: 'Electrical wiring standards'
      }
    ]
  },
  {
    _id: '4',
    name: 'Sanitation Inspection',
    question: 'Is the area properly sanitized?',
    description: 'Check sanitation compliance',
    violationId: { _id: '3', name: 'Sanitation Violation' },
    isActive: true,
    createdAt: '2026-08-04T00:00:00Z',
    updatedAt: '2026-08-08T00:00:00Z',
    version: 1,
    legalBasis: []
  },
  {
    _id: '5',
    name: 'Ventilation Inspection',
    question: 'Is there proper ventilation in the area?',
    description: 'Check ventilation system',
    violationId: null,
    isActive: false,
    createdAt: '2026-08-05T00:00:00:00Z',
    updatedAt: '2026-08-09T00:00:00Z',
    version: 1,
    legalBasis: []
  },
]

export const mockInspectionItem = {
  _id: '1',
  name: 'Fire Extinguisher Inspection',
  question: 'Is there a fire extinguisher present on the premises?',
  description: 'Check for presence of fire extinguisher',
  violationId: { _id: '1', name: 'Missing Fire Extinguisher' },
  isActive: true,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-05T00:00:00:00Z',
  version: 1,
  legalBasis: [
    {
      url: 'https://nfpa.org/codes-and-standards/',
      title: 'NFPA 10 - Portable Fire Extinguishers',
      description: 'Fire extinguisher requirements'
    }
  ]
}

export const mockNewInspectionItem = {
  name: 'New Inspection Item',
  question: 'Is this a new inspection item?',
  description: 'This is a new inspection item',
  violationId: null,
  isActive: true,
  legalBasis: [],
}

export const mockUpdatedInspectionItem = {
  _id: '1',
  name: 'Fire Extinguisher Inspection (Updated)',
  question: 'Is there a fire extinguisher present on the premises? (Updated)',
  description: 'Check for presence of fire extinguisher - updated',
  violationId: { _id: '1', name: 'Missing Fire Extinguisher' },
  isActive: false,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-10T00:00:00Z',
  version: 2,
  legalBasis: [
    {
      url: 'https://nfpa.org/codes-and-standards/',
      title: 'NFPA 10 - Portable Fire Extinguishers',
      description: 'Fire extinguisher requirements'
    }
  ]
}

export const mockAuditLogs = [
  {
    _id: 'audit1',
    eventType: 'inspection_item_created',
    createdAt: '2026-08-07T10:00:00Z',
    metadata: {
      userName: 'Test User',
      name: 'Fire Extinguisher Inspection',
    },
  },
  {
    _id: 'audit2',
    eventType: 'inspection_item_updated',
    createdAt: '2026-08-07T11:00:00Z',
    metadata: {
      userName: 'Test User',
      name: 'Fire Extinguisher Inspection',
    },
  },
  {
    _id: 'audit3',
    eventType: 'inspection_item_disabled',
    createdAt: '2026-08-07T12:00:00Z',
    metadata: {
      userName: 'Test User',
      name: 'Electrical Wiring Inspection',
    },
  },
]

export const mockDataQualityIssues = [
  {
    type: 'missing_question',
    count: 1,
    entityIds: [{ id: '2', name: 'Emergency Exit Inspection' }],
  },
  {
    type: 'missing_description',
    count: 2,
    entityIds: [
      { id: '3', name: 'Electrical Wiring Inspection' },
      { id: '5', name: 'Ventilation Inspection' },
    ],
  },
]

export const mockPerformanceData = {
  totalInspectionItems: 5,
  activeInspectionItems: 3,
  inactiveInspectionItems: 2,
  averageResolutionTime: 24,
  lastActivity: '2026-08-07T10:00:00Z',
}

export const mockChecklists = [
  {
    _id: 'checklist1',
    name: 'Fire Safety Checklist',
    inspectionItems: ['1', '2'],
  },
  {
    _id: 'checklist2',
    name: 'Building Safety Checklist',
    inspectionItems: ['1', '3'],
  },
]
