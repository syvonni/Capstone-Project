import { http, HttpResponse } from 'msw'

export const inspectionItemsHandlers = [
  // GET /api/business/admin/inspection-items
  http.get('/api/business/admin/inspection-items', () => {
    return HttpResponse.json([
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
    ])
  }),

  // GET /api/business/admin/inspection-items/:id
  http.get('/api/business/admin/inspection-items/:id', ({ params }) => {
    const { id } = params
    if (id === '1') {
      return HttpResponse.json({
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
      })
    }
    return HttpResponse.json({ error: 'Inspection item not found' }, { status: 404 })
  }),

  // POST /api/business/admin/inspection-items
  http.post('/api/business/admin/inspection-items', async ({ request }) => {
    const newInspectionItem = await request.json()
    return HttpResponse.json({
      _id: 'new',
      ...newInspectionItem,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    })
  }),

  // PUT /api/business/admin/inspection-items/:id
  http.put('/api/business/admin/inspection-items/:id', async ({ params, request }) => {
    const { id } = params
    const updates = await request.json()
    return HttpResponse.json({
      _id: id,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: 2,
    })
  }),

  // DELETE /api/business/admin/inspection-items/:id
  http.delete('/api/business/admin/inspection-items/:id', ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      _id: id,
      isActive: false,
      updatedAt: new Date().toISOString(),
    })
  }),

  // GET /api/business/admin/inspection-items/:id/audit
  http.get('/api/business/admin/inspection-items/:id/audit', ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      logs: [
        {
          _id: 'audit1',
          eventType: 'inspection_item_created',
          createdAt: '2026-08-07T10:00:00Z',
          metadata: {
            userName: 'Test User',
            name: 'Test Inspection Item',
          },
        },
        {
          _id: 'audit2',
          eventType: 'inspection_item_updated',
          createdAt: '2026-08-07T11:00:00Z',
          metadata: {
            userName: 'Test User',
            name: 'Test Inspection Item',
          },
        },
      ],
    })
  }),

  // GET /api/audit/inspection-items
  http.get('/api/audit/inspection-items', () => {
    return HttpResponse.json({
      logs: [
        {
          _id: 'audit1',
          eventType: 'inspection_item_created',
          createdAt: '2026-08-07T10:00:00Z',
          metadata: {
            userName: 'Test User',
            name: 'Test Inspection Item',
          },
        },
      ],
    })
  }),

  // GET /api/business/admin/inspection-items/data-quality
  http.get('/api/business/admin/inspection-items/data-quality', () => {
    return HttpResponse.json({
      issues: [
        {
          type: 'missing_question',
          count: 1,
          entityIds: [{ id: '2', name: 'Emergency Exit Inspection' }],
        },
      ],
    })
  }),

  // GET /api/business/admin/inspection-items/performance
  http.get('/api/business/admin/inspection-items/performance', () => {
    return HttpResponse.json({
      totalInspectionItems: 3,
      activeInspectionItems: 2,
      inactiveInspectionItems: 1,
      averageResolutionTime: 24,
      lastActivity: '2026-08-07T10:00:00Z',
    })
  }),
]
