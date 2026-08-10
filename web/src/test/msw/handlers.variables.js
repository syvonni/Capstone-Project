import { http, HttpResponse, delay } from 'msw'

/**
 * MSW handlers for Variables API endpoints
 * Used for mocking API responses in frontend tests
 */

export const variablesHandlers = [
  // GET /api/business/admin/variables - List variables
  http.get('/api/business/admin/variables', async ({ request }) => {
    await delay(100)
    const url = new URL(request.url)
    const calculationMethod = url.searchParams.get('calculationMethod')
    const isActive = url.searchParams.get('isActive')
    const categories = url.searchParams.get('categories')

    // Mock response data
    let mockVariables = [
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
      }
    ]

    // Apply filters
    if (calculationMethod) {
      mockVariables = mockVariables.filter(v => v.calculationMethod === calculationMethod)
    }
    if (isActive === 'true') {
      mockVariables = mockVariables.filter(v => v.isActive === true)
    }
    if (isActive === 'false') {
      mockVariables = mockVariables.filter(v => v.isActive === false)
    }
    if (categories) {
      const categoryArray = categories.split(',')
      mockVariables = mockVariables.filter(v => 
        v.categories && v.categories.some(cat => categoryArray.includes(cat))
      )
    }

    return HttpResponse.json({
      ok: true,
      data: mockVariables
    })
  }),

  // GET /api/business/admin/variables/:id - Get single variable
  http.get('/api/business/admin/variables/:id', async ({ params }) => {
    await delay(50)
    const { id } = params

    if (id === '507f1f77bcf86cd799439011') {
      return HttpResponse.json({
        ok: true,
        data: {
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
        }
      })
    }

    if (id === 'not-found') {
      return HttpResponse.json({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Variable not found'
        }
      }, { status: 404 })
    }

    return HttpResponse.json({
      ok: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid variable ID'
      }
    }, { status: 400 })
  }),

  // POST /api/business/admin/variables - Create variable
  http.post('/api/business/admin/variables', async ({ request }) => {
    await delay(150)
    const body = await request.json()

    // Validation errors
    if (!body.name || body.name.trim() === '') {
      return HttpResponse.json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name is required'
        }
      }, { status: 400 })
    }

    if (!body.question || body.question.trim() === '') {
      return HttpResponse.json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Question is required'
        }
      }, { status: 400 })
    }

    if (!body.calculationMethod) {
      return HttpResponse.json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Calculation method is required'
        }
      }, { status: 400 })
    }

    // Duplicate name error
    if (body.name === 'Duplicate Variable') {
      return HttpResponse.json({
        ok: false,
        error: {
          code: 'DUPLICATE',
          message: 'Variable with this name already exists'
        }
      }, { status: 409 })
    }

    // Success response
    const newVariable = {
      _id: '507f1f77bcf86cd799439014',
      ...body,
      version: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return HttpResponse.json({
      ok: true,
      data: newVariable
    }, { status: 201 })
  }),

  // PUT /api/business/admin/variables/:id - Update variable
  http.put('/api/business/admin/variables/:id', async ({ params, request }) => {
    await delay(150)
    const { id } = params
    const body = await request.json()

    if (id === 'not-found') {
      return HttpResponse.json({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Variable not found'
        }
      }, { status: 404 })
    }

    // Version conflict error
    if (id === 'version-conflict') {
      return HttpResponse.json({
        ok: false,
        error: {
          code: 'VERSION_CONFLICT',
          message: 'Variable was modified by another user'
        }
      }, { status: 409 })
    }

    // Success response
    const updatedVariable = {
      _id: id,
      ...body,
      version: (body.version || 0) + 1,
      updatedAt: new Date().toISOString()
    }

    return HttpResponse.json({
      ok: true,
      data: updatedVariable
    })
  }),

  // DELETE /api/business/admin/variables/:id - Delete variable
  http.delete('/api/business/admin/variables/:id', async ({ params }) => {
    await delay(100)
    const { id } = params

    if (id === 'not-found') {
      return HttpResponse.json({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Variable not found'
        }
      }, { status: 404 })
    }

    return HttpResponse.json({
      ok: true,
      data: {
        _id: id,
        isActive: false,
        updatedAt: new Date().toISOString()
      }
    })
  }),

  // GET /api/business/admin/variables/:id/audit - Get audit history
  http.get('/api/business/admin/variables/:id/audit', async ({ params }) => {
    await delay(100)
    const { id } = params

    return HttpResponse.json({
      ok: true,
      data: [
        {
          _id: 'audit1',
          eventType: 'variable_created',
          entityType: 'variable',
          entityId: id,
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
          entityId: id,
          metadata: {
            name: 'Building Height Fee',
            updatedByName: 'Admin User'
          },
          createdAt: '2024-01-20T10:00:00Z'
        }
      ]
    })
  }),

  // GET /api/audit/variables - Get all variable audit logs
  http.get('/api/audit/variables', async ({ request }) => {
    await delay(100)
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page')) || 1
    const limit = parseInt(url.searchParams.get('limit')) || 20

    return HttpResponse.json({
      logs: [
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
      ],
      total: 3,
      page,
      limit,
      totalPages: 1
    })
  }),

  // GET /api/business/admin/variables/data-quality - Get data quality issues
  http.get('/api/business/admin/variables/data-quality', async () => {
    await delay(100)
    return HttpResponse.json({
      issues: [
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
      ],
      totalEntities: 3,
      totalIssues: 2
    })
  }),

  // GET /api/business/admin/variables/performance - Get performance metrics
  http.get('/api/business/admin/variables/performance', async ({ request }) => {
    await delay(100)
    const url = new URL(request.url)
    const timeRange = url.searchParams.get('timeRange') || '24h'

    return HttpResponse.json({
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
      timeRange
    })
  }),

  // GET /api/business/admin/variables/:id/performance - Get single variable performance
  http.get('/api/business/admin/variables/:id/performance', async ({ params, request }) => {
    await delay(100)
    const { id } = params
    const url = new URL(request.url)
    const timeRange = url.searchParams.get('timeRange') || '24h'

    return HttpResponse.json({
      avgResponseTime: 120,
      errorRate: 0.01,
      errorCount: 1,
      requestCount: 50,
      status: 'healthy',
      timeRange,
      variableId: id
    })
  }),

  // GET /api/business/admin/checklists - Get checklists for variable modal
  http.get('/api/business/admin/checklists', async ({ request }) => {
    await delay(50)
    const url = new URL(request.url)
    const isActive = url.searchParams.get('isActive')

    const mockChecklists = [
      {
        _id: 'checklist1',
        name: 'Building Permit Checklist',
        isActive: true
      },
      {
        _id: 'checklist2',
        name: 'Business Permit Checklist',
        isActive: true
      },
      {
        _id: 'checklist3',
        name: 'Disabled Checklist',
        isActive: false
      }
    ]

    let filteredChecklists = mockChecklists
    if (isActive === 'true') {
      filteredChecklists = mockChecklists.filter(c => c.isActive === true)
    }

    return HttpResponse.json({
      ok: true,
      data: filteredChecklists
    })
  }),

  // GET /api/business/admin/validate-name - Validate variable name uniqueness
  http.get('/api/business/admin/validate-name', async ({ request }) => {
    await delay(50)
    const url = new URL(request.url)
    const name = url.searchParams.get('name')
    const entityType = url.searchParams.get('entityType')

    // Return valid for all names except duplicates
    if (entityType === 'Variable' && (name === 'Duplicate Variable' || name === 'Existing Variable')) {
      return HttpResponse.json({
        ok: false,
        error: 'Name already exists'
      }, { status: 400 })
    }

    return HttpResponse.json({
      ok: true,
      valid: true
    })
  })
]