import { http, HttpResponse } from 'msw'

export const violationsHandlers = [
  // GET /api/business/admin/violations
  http.get('/api/business/admin/violations', () => {
    return HttpResponse.json([
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
    ])
  }),

  // GET /api/business/admin/violations/:id
  http.get('/api/business/admin/violations/:id', ({ params }) => {
    const { id } = params
    if (id === '1') {
      return HttpResponse.json({
        _id: '1',
        name: 'Building Height Violation',
        description: 'Building exceeds maximum allowed height',
        severity: 'major',
        isActive: true,
        feeId: { _id: 'fee1', amount: 5000 },
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-05T00:00:00Z',
        version: 1,
      })
    }
    return HttpResponse.json({ error: 'Violation not found' }, { status: 404 })
  }),

  // POST /api/business/admin/violations
  http.post('/api/business/admin/violations', async ({ request }) => {
    const newViolation = await request.json()
    return HttpResponse.json({
      _id: 'new',
      ...newViolation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    })
  }),

  // PUT /api/business/admin/violations/:id
  http.put('/api/business/admin/violations/:id', async ({ params, request }) => {
    const { id } = params
    const updates = await request.json()
    return HttpResponse.json({
      _id: id,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: 2,
    })
  }),

  // DELETE /api/business/admin/violations/:id
  http.delete('/api/business/admin/violations/:id', ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      _id: id,
      isActive: false,
      updatedAt: new Date().toISOString(),
    })
  }),

  // GET /api/business/admin/violations/:id/audit
  http.get('/api/business/admin/violations/:id/audit', ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      logs: [
        {
          _id: 'audit1',
          eventType: 'violation_created',
          createdAt: '2026-08-07T10:00:00Z',
          metadata: {
            userName: 'Test User',
            name: 'Test Violation',
          },
        },
        {
          _id: 'audit2',
          eventType: 'violation_updated',
          createdAt: '2026-08-07T11:00:00Z',
          metadata: {
            userName: 'Test User',
            name: 'Test Violation',
          },
        },
      ],
    })
  }),

  // GET /api/audit/violations
  http.get('/api/audit/violations', () => {
    return HttpResponse.json({
      logs: [
        {
          _id: 'audit1',
          eventType: 'violation_created',
          createdAt: '2026-08-07T10:00:00Z',
          metadata: {
            userName: 'Test User',
            name: 'Test Violation',
          },
        },
      ],
    })
  }),

  // GET /api/business/admin/violations/data-quality
  http.get('/api/business/admin/violations/data-quality', () => {
    return HttpResponse.json({
      issues: [
        {
          type: 'missing_name',
          count: 1,
          entityIds: [{ id: '2', name: 'Setback Violation' }],
        },
      ],
    })
  }),

  // GET /api/business/admin/violations/performance
  http.get('/api/business/admin/violations/performance', () => {
    return HttpResponse.json({
      totalViolations: 3,
      activeViolations: 2,
      disabledViolations: 1,
      averageResolutionTime: 24,
      lastActivity: '2026-08-07T10:00:00Z',
    })
  }),
]
