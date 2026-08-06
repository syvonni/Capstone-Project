# Feature Testing Guide

AI reference guide for creating comprehensive tests for new features.

## Testing Strategy

**Modern Testing Pyramid:**
- 60% Integration tests (component interactions, user behavior) - highest ROI
- 30% Unit tests (pure functions, validators, utilities)
- 10% E2E tests (critical user flows only)

**Key Principles:**
- Test behavior, not implementation details
- Mock at boundaries (APIs, services), not within the app
- Use accessible queries (getByRole, getByLabelText, getByText)
- Structure tests with AAA (Arrange, Act, Assert)
- Target 80% meaningful coverage

## File Structure

### Backend Tests
```
backend/__tests__/features/{featureName}/
├── {featureName}Validators.test.js        # Unit tests for validators
├── {featureName}Helpers.test.js           # Unit tests for helpers
├── {featureName}API.test.js               # Integration tests for API endpoints
└── {featureName}.security.test.js         # Security tests
```

### Frontend Tests
```
web/src/features/{featureName}/
├── __tests__/
│   ├── {FeatureName}View.test.jsx         # Integration tests for main view
│   ├── {FeatureName}Form.test.jsx         # Integration tests for forms
│   └── hooks/__tests__/
│       └── use{FeatureName}.test.js       # Unit tests for hooks
└── components/__tests__/
    └── {ComponentName}.test.jsx            # Unit tests for components

web/src/shared/components/__tests__/
└── {ComponentName}.test.jsx                # Unit tests for shared components

web/src/shared/utils/__tests__/
└── {utilityName}.test.js                   # Unit tests for shared utilities
```

### E2E Tests
```
e2e/
└── {featureName}.spec.ts                  # E2E tests with Playwright
```

## Test Templates

### Backend Unit Test Template
```javascript
// backend/__tests__/features/{featureName}/{featureName}Validators.test.js
const { validatorFunction } = require('../../../services/{service}/src/lib/{featureName}Validators');

describe('{FeatureName} Validators', () => {
  describe('validatorFunction', () => {
    it('should validate valid input', () => {
      const result = validatorFunction(validInput);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid input', () => {
      const result = validatorFunction(invalidInput);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Expected error message');
    });

    it('should handle edge case', () => {
      const result = validatorFunction(edgeCaseInput);
      expect(result.valid).toBe(false);
    });
  });
});
```

### Backend API Integration Test Template
```javascript
// backend/__tests__/features/{featureName}/{featureName}API.test.js
const request = require('supertest');
const { setupMongoDB, teardownMongoDB, setupApp } = require('../../helpers/setup');
const { Model } = require('../../../services/{service}/src/models/{Model}');
const { generateAuthToken } = require('../../helpers/auth');

describe('{FeatureName} API', () => {
  let app;
  let mongoServer;
  let adminToken;

  beforeAll(async () => {
    mongoServer = await setupMongoDB();
    app = setupApp('{service}');
    const admin = await createTestUser({ role: 'admin' });
    adminToken = generateAuthToken(admin);
  });

  afterAll(async () => {
    await teardownMongoDB();
  });

  beforeEach(async () => {
    await Model.deleteMany({});
  });

  describe('GET /api/{service}/{endpoint}', () => {
    it('should return list with valid auth', async () => {
      const response = await request(app)
        .get('/api/{service}/{endpoint}')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should reject without auth', async () => {
      await request(app)
        .get('/api/{service}/{endpoint}')
        .expect(401);
    });
  });

  describe('POST /api/{service}/{endpoint}', () => {
    it('should create with valid data', async () => {
      const response = await request(app)
        .post('/api/{service}/{endpoint}')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validData)
        .expect(201);

      expect(response.body.data).toHaveProperty('_id');
    });

    it('should reject invalid data', async () => {
      await request(app)
        .post('/api/{service}/{endpoint}')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);
    });
  });
});
```

### Frontend Integration Test Template
```javascript
// web/src/features/{featureName}/__tests__/{FeatureName}View.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils/renderWithProviders';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { FeatureNameView } from '../{FeatureNameView}';

// Setup MSW server
const server = setupServer(
  rest.get('/api/{service}/{endpoint}', (req, res, ctx) => {
    return res(ctx.json({ data: mockData }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('{FeatureName} View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render component', () => {
    renderWithProviders(<{FeatureNameView} />);
    expect(screen.getByRole('heading', { name: /{feature name}/i })).toBeInTheDocument();
  });

  it('should display data from API', async () => {
    renderWithProviders(<{FeatureNameView} />);
    
    await waitFor(() => {
      expect(screen.getByText('Expected text')).toBeInTheDocument();
    });
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    renderWithProviders(<{FeatureNameView} />);
    
    const button = screen.getByRole('button', { name: /action/i });
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Expected result')).toBeInTheDocument();
    });
  });
});
```

### Frontend Hook Unit Test Template
```javascript
// web/src/features/{featureName}/hooks/__tests__/use{FeatureName}.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { use{FeatureName} } from '../use{FeatureName}';

vi.mock('@/shared/utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  }
}));

describe('use{FeatureName}', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch data on mount', async () => {
    const mockData = { id: 1, name: 'Test' };
    api.get.mockResolvedValue({ data: mockData });
    
    const { result } = renderHook(() => use{FeatureName}());
    
    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });
  });

  it('should handle error', async () => {
    api.get.mockRejectedValue(new Error('API error'));
    
    const { result } = renderHook(() => use{FeatureName}());
    
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});
```

### E2E Test Template
```typescript
// e2e/{featureName}.spec.ts
import { test, expect } from '@playwright/test';

test.describe('{FeatureName} Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/{route}');
  });

  test('should complete primary action', async ({ page }) => {
    await page.fill('[data-testid="field"]', 'value');
    await page.click('[data-testid="submit"]');
    
    await page.waitForURL('**/success');
    expect(page.url()).toContain('/success');
  });

  test('should show validation errors', async ({ page }) => {
    await page.click('[data-testid="submit"]');
    
    await expect(page.locator('text=Required field')).toBeVisible();
  });
});
```

## Testing Checklist

### Backend Unit Tests
- [ ] Test all validator functions with valid inputs
- [ ] Test all validator functions with invalid inputs
- [ ] Test edge cases (null, undefined, empty strings, negative values)
- [ ] Test helper functions with various inputs
- [ ] Test error handling in helpers

### Backend Integration Tests
- [ ] Test GET endpoints with valid auth
- [ ] Test GET endpoints without auth (should fail)
- [ ] Test POST endpoints with valid data
- [ ] Test POST endpoints with invalid data
- [ ] Test PUT endpoints with valid updates
- [ ] Test PUT endpoints with invalid updates
- [ ] Test DELETE endpoints
- [ ] Test error responses (400, 401, 403, 404, 500)
- [ ] Test pagination, filtering, sorting if applicable

### Frontend Integration Tests
- [ ] Test component renders correctly
- [ ] Test loading states
- [ ] Test error states
- [ ] Test success states
- [ ] Test user interactions (clicks, typing, form submission)
- [ ] Test data display from API
- [ ] Test navigation between views
- [ ] Test form validation

### Frontend Unit Tests
- [ ] Test custom hooks with various states
- [ ] Test utility functions
- [ ] Test data transformation functions
- [ ] Test error handling in hooks

### E2E Tests
- [ ] Test critical user flow (create/read/update/delete)
- [ ] Test authentication flow
- [ ] Test navigation between main sections
- [ ] Test form submission with validation
- [ ] Test error handling in real browser

## Common Patterns

### Mocking API Responses (MSW)
```javascript
const server = setupServer(
  rest.get('/api/endpoint', (req, res, ctx) => {
    return res(ctx.json({ data: mockData }));
  }),
  rest.post('/api/endpoint', (req, res, ctx) => {
    return res(ctx.status(201), ctx.json({ data: createdData }));
  })
);
```

### Testing Async Operations
```javascript
it('should handle async operation', async () => {
  render(<Component />);
  fireEvent.click(screen.getByText('Load'));
  
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

### Testing Form Validation
```javascript
it('should show validation error', async () => {
  const user = userEvent.setup();
  render(<Form />);
  
  const submitButton = screen.getByRole('button', { name: /submit/i });
  await user.click(submitButton);
  
  await expect(screen.getByText('Field is required')).toBeVisible();
});
```

### Testing Error States
```javascript
it('should display error message', async () => {
  server.use(
    rest.get('/api/endpoint', (req, res, ctx) => {
      return res(ctx.status(500), ctx.json({ error: 'Server error' }));
    })
  );
  
  render(<Component />);
  
  await waitFor(() => {
    expect(screen.getByText('Server error')).toBeInTheDocument();
  });
});
```

## Running Tests

### Backend
```bash
cd backend
npm test                                    # Run all tests
npm test -- path/to/test.test.js            # Run specific file
npm run test:coverage                       # Run with coverage
```

### Frontend
```bash
cd web
npm test                                    # Run unit/integration tests
npm test -- path/to/test.test.jsx           # Run specific file
npm run test:coverage                       # Run with coverage
npm run test:e2e                            # Run E2E tests
```

## Tools

**Backend:**
- Jest/Vitest - Test runner
- Supertest - HTTP assertions
- MongoDB Memory Server - In-memory database

**Frontend:**
- Vitest - Test runner
- React Testing Library - Component testing
- @testing-library/user-event - User interactions
- MSW - API mocking

**E2E:**
- Playwright - Browser automation
- @axe-core/playwright - Accessibility testing

## Best Practices

1. **Test behavior, not implementation** - Use getByRole, getByLabelText instead of getByTestId
2. **Mock at boundaries** - Use MSW to mock APIs, not individual functions
3. **Use AAA pattern** - Arrange (setup), Act (execute), Assert (verify)
4. **Descriptive test names** - "should do X when Y" format
5. **One assertion per test** - Keep tests focused
6. **Test error paths** - Don't just test happy paths
7. **Clean up after tests** - Use afterEach to reset state
8. **Use realistic test data** - Match production data shapes
