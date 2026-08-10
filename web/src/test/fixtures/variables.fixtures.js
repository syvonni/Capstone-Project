/**
 * Test fixtures for Variables feature
 * Provides mock data for testing
 */

export const mockVariables = [
  {
    _id: '507f1f77bcf86cd799439011',
    name: 'Building Height Fee',
    description: 'Fee based on building height',
    question: 'What is the building height?',
    calculationMethod: 'bracketed',
    unit: 'meter',
    unitSingular: 'meter',
    unitPlural: 'meters',
    unitContextSingular: 'per meter',
    unitContextPlural: 'per meters',
    brackets: [
      { minValue: 0, maxValue: 10, fixedAmount: 100 },
      { minValue: 10, maxValue: 20, fixedAmount: 200 },
      { minValue: 20, maxValue: null, fixedAmount: 300 }
    ],
    isActive: true,
    version: 1,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    customId: 'VAR-BLD-001',
    categories: ['CON']
  },
  {
    _id: '507f1f77bcf86cd799439012',
    name: 'Business Tax',
    description: 'Annual business tax',
    question: 'What is the business type?',
    calculationMethod: 'classification',
    unit: 'per classification',
    unitSingular: 'classification',
    unitPlural: 'classifications',
    unitContextSingular: 'per classification',
    unitContextPlural: 'per classifications',
    classifications: [
      { name: 'Retail', fee: 500 },
      { name: 'Wholesale', fee: 750 }
    ],
    isActive: true,
    version: 2,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z',
    customId: 'VAR-BUS-001',
    categories: ['RET', 'WHL']
  },
  {
    _id: '507f1f77bcf86cd799439013',
    name: 'Signage Fee',
    description: 'Fee for business signage',
    question: 'What is the signage area?',
    calculationMethod: 'per_unit',
    unit: 'sqm',
    unitSingular: 'sqm',
    unitPlural: 'sqm',
    unitContextSingular: 'per sqm',
    unitContextPlural: 'per sqm',
    baseRate: 50,
    isActive: false,
    version: 1,
    createdAt: '2024-01-05T10:00:00Z',
    updatedAt: '2024-01-05T10:00:00Z',
    customId: 'VAR-SIG-001',
    categories: ['ALL']
  },
  {
    _id: '507f1f77bcf86cd799439014',
    name: 'Percentage Fee',
    description: 'Percentage-based fee',
    question: 'What is the value?',
    calculationMethod: 'percentage',
    unit: 'of capitalization',
    unitSingular: 'of capitalization',
    unitPlural: 'of capitalization',
    unitContextSingular: 'of capitalization',
    unitContextPlural: 'of capitalization',
    baseRate: 5,
    isActive: true,
    version: 1,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    customId: 'VAR-PCT-001',
    categories: ['ALL']
  },
  {
    _id: '507f1f77bcf86cd799439015',
    name: 'Yes/No Fee',
    description: 'Simple yes/no fee',
    question: 'Do you require this service?',
    calculationMethod: 'yes_no',
    unit: 'per item',
    unitSingular: 'item',
    unitPlural: 'items',
    unitContextSingular: 'per item',
    unitContextPlural: 'per items',
    fixedAmount: 100,
    isActive: true,
    version: 1,
    createdAt: '2024-01-02T10:00:00Z',
    updatedAt: '2024-01-02T10:00:00Z',
    customId: 'VAR-YES-001',
    categories: ['ALL']
  }
]

export const mockVariable = mockVariables[0]

export const mockActiveVariables = mockVariables.filter(v => v.isActive)
export const mockDisabledVariables = mockVariables.filter(v => !v.isActive)

export const mockNewVariable = {
  name: 'New Variable',
  description: 'A new test variable',
  question: 'Test question?',
  calculationMethod: 'per_unit',
  unit: 'per unit',
  unitSingular: 'unit',
  unitPlural: 'units',
  unitContextSingular: 'per unit',
  unitContextPlural: 'per units',
  baseRate: 100,
  categories: ['ALL']
}

export const mockVariableFormData = {
  name: 'Test Variable',
  description: 'Test description',
  question: 'Test question?',
  calculationMethod: 'per_unit',
  unit: 'per unit',
  unitSingular: 'unit',
  unitPlural: 'units',
  unitContextSingular: 'per unit',
  unitContextPlural: 'per units',
  baseRate: 100,
  categories: ['ALL'],
  feeUnit: 'per unit'
}

export const mockBracketedVariableData = {
  name: 'Bracketed Test',
  description: 'Test bracketed variable',
  question: 'Test bracketed question?',
  calculationMethod: 'bracketed',
  unit: 'sqm',
  unitSingular: 'sqm',
  unitPlural: 'sqm',
  unitContextSingular: 'per sqm',
  unitContextPlural: 'per sqm',
  brackets: [
    { minValue: 0, maxValue: 10, fixedAmount: 100 },
    { minValue: 10, maxValue: 20, fixedAmount: 200 }
  ],
  categories: ['CON'],
  feeUnit: 'sqm'
}

export const mockClassificationVariableData = {
  name: 'Classification Test',
  description: 'Test classification variable',
  question: 'Test classification question?',
  calculationMethod: 'classification',
  unit: 'per classification',
  unitSingular: 'classification',
  unitPlural: 'classifications',
  unitContextSingular: 'per classification',
  unitContextPlural: 'per classifications',
  classifications: [
    { name: 'Retail', fee: 500 },
    { name: 'Wholesale', fee: 750 }
  ],
  categories: ['RET', 'WHL'],
  feeUnit: 'per classification'
}

export const mockAuditLogs = [
  {
    _id: 'audit1',
    eventType: 'variable_created',
    entityType: 'variable',
    entityId: '507f1f77bcf86cd799439011',
    metadata: {
      name: 'Building Height Fee',
      userName: 'Admin User'
    },
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    _id: 'audit2',
    eventType: 'variable_updated',
    entityType: 'variable',
    entityId: '507f1f77bcf86cd799439011',
    metadata: {
      name: 'Building Height Fee',
      updatedByName: 'Admin User'
    },
    createdAt: '2024-01-20T10:00:00Z'
  },
  {
    _id: 'audit3',
    eventType: 'variable_disabled',
    entityType: 'variable',
    entityId: '507f1f77bcf86cd799439013',
    metadata: {
      name: 'Signage Fee',
      deletedByName: 'Admin User'
    },
    createdAt: '2024-01-25T10:00:00Z'
  }
]

export const mockDataQualityIssues = [
  {
    type: 'missing_description',
    count: 1,
    entityIds: [
      { id: '507f1f77bcf86cd799439013', name: 'Signage Fee' }
    ]
  },
  {
    type: 'unused_variable',
    count: 1,
    entityIds: [
      { id: '507f1f77bcf86cd799439013', name: 'Signage Fee' }
    ]
  }
]

export const mockPerformanceMetrics = {
  avgResponseTime: 145,
  errorRate: 0.02,
  errorCount: 2,
  requestCount: 100,
  operations: [
    { operation: 'GET', avgResponseTime: 120, count: 50 },
    { operation: 'POST', avgResponseTime: 180, count: 30 },
    { operation: 'PUT', avgResponseTime: 150, count: 15 },
    { operation: 'DELETE', avgResponseTime: 130, count: 5 }
  ],
  slowestOperations: [
    { operation: 'POST', duration: 250, endpoint: '/api/business/admin/variables' },
    { operation: 'PUT', duration: 200, endpoint: '/api/business/admin/variables/:id' }
  ],
  status: 'healthy',
  timeRange: '24h'
}

export const mockChecklists = [
  {
    _id: 'checklist1',
    name: 'Building Permit Checklist',
    isActive: true
  },
  {
    _id: 'checklist2',
    name: 'Business Permit Checklist',
    isActive: true
  }
]