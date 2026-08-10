/**
 * Mock data and fixtures for violations feature testing
 */

export const mockViolations = [
  {
    _id: '1',
    name: 'Building Height Violation',
    description: 'Building exceeds maximum allowed height',
    severity: 'major',
    isActive: true,
    feeId: { _id: 'fee1', amount: 5000 },
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-05T00:00:00Z',
    version: 1,
  },
  {
    _id: '2',
    name: 'Setback Violation',
    description: 'Building does not meet setback requirements',
    severity: 'minor',
    isActive: true,
    feeId: null,
    createdAt: '2026-08-02T00:00:00Z',
    updatedAt: '2026-08-06T00:00:00Z',
    version: 1,
  },
  {
    _id: '3',
    name: 'Fire Safety Violation',
    description: 'Missing fire safety equipment',
    severity: 'critical',
    isActive: false,
    feeId: { _id: 'fee2', amount: 10000 },
    createdAt: '2026-08-03T00:00:00Z',
    updatedAt: '2026-08-07T00:00:00Z',
    version: 2,
  },
  {
    _id: '4',
    name: 'Zoning Violation',
    description: 'Building not in proper zone',
    severity: 'major',
    isActive: true,
    feeId: { _id: 'fee3', amount: 7500 },
    createdAt: '2026-08-04T00:00:00Z',
    updatedAt: '2026-08-08T00:00:00Z',
    version: 1,
  },
  {
    _id: '5',
    name: 'Parking Violation',
    description: 'Insufficient parking spaces',
    severity: 'minor',
    isActive: false,
    feeId: null,
    createdAt: '2026-08-05T00:00:00:00Z',
    updatedAt: '2026-08-09T00:00:00Z',
    version: 1,
  },
]

export const mockViolation = {
  _id: '1',
  name: 'Building Height Violation',
  description: 'Building exceeds maximum allowed height',
  severity: 'major',
  isActive: true,
  feeId: { _id: 'fee1', amount: 5000 },
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-05T00:00:00:00Z',
  version: 1,
}

export const mockNewViolation = {
  name: 'New Violation',
  description: 'This is a new violation',
  severity: 'minor',
  isActive: true,
  feeId: null,
}

export const mockUpdatedViolation = {
  _id: '1',
  name: 'Building Height Violation (Updated)',
  description: 'Building exceeds maximum allowed height - updated',
  severity: 'critical',
  isActive: false,
  feeId: { _id: 'fee1', amount: 5000 },
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-10T00:00:00Z',
  version: 2,
}

export const mockAuditLogs = [
  {
    _id: 'audit1',
    eventType: 'violation_created',
    createdAt: '2026-08-07T10:00:00Z',
    metadata: {
      userName: 'Test User',
      name: 'Building Height Violation',
    },
  },
  {
    _id: 'audit2',
    eventType: 'violation_updated',
    createdAt: '2026-08-07T11:00:00Z',
    metadata: {
      userName: 'Test User',
      name: 'Building Height Violation',
    },
  },
  {
    _id: 'audit3',
    eventType: 'violation_disabled',
    createdAt: '2026-08-07T12:00:00Z',
    metadata: {
      userName: 'Test User',
      name: 'Fire Safety Violation',
    },
  },
]

export const mockDataQualityIssues = [
  {
    type: 'missing_name',
    count: 1,
    entityIds: [{ id: '2', name: 'Setback Violation' }],
  },
  {
    type: 'missing_description',
    count: 2,
    entityIds: [
      { id: '3', name: 'Fire Safety Violation' },
      { id: '5', name: 'Parking Violation' },
    ],
  },
]

export const mockPerformanceData = {
  totalViolations: 5,
  activeViolations: 3,
  disabledViolations: 2,
  averageResolutionTime: 24,
  lastActivity: '2026-08-07T10:00:00Z',
}

export const mockFees = [
  { _id: 'fee1', amount: 5000, name: 'Height Violation Fee' },
  { _id: 'fee2', amount: 10000, name: 'Fire Safety Fee' },
  { _id: 'fee3', amount: 7500, name: 'Zoning Violation Fee' },
]
