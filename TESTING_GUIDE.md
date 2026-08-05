# Testing Guide

This guide provides comprehensive instructions for writing and running tests for both backend and frontend features in the Capstone project.

## Table of Contents

- [Overview](#overview)
- [Backend Testing](#backend-testing)
  - [Test Structure](#test-structure)
  - [Frameworks & Tools](#frameworks--tools)
  - [Running Tests](#running-tests)
  - [Writing Unit Tests](#writing-unit-tests)
  - [Writing Integration Tests](#writing-integration-tests)
  - [Writing Security Tests](#writing-security-tests)
  - [Test Helpers](#test-helpers)
- [Frontend Testing](#frontend-testing)
  - [Test Structure](#test-structure-1)
  - [Frameworks & Tools](#frameworks--tools-1)
  - [Running Tests](#running-tests-1)
  - [Writing Unit Tests](#writing-unit-tests-1)
  - [Writing Integration Tests](#writing-integration-tests-1)
  - [Writing E2E Tests](#writing-e2e-tests)
  - [Writing Accessibility Tests](#writing-accessibility-tests)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)

---

## Overview

This project uses a multi-layered testing approach:

- **Unit Tests**: Test individual functions, components, or modules in isolation
- **Integration Tests**: Test how multiple units work together
- **End-to-End (E2E) Tests**: Test complete user flows in a browser
- **Security Tests**: Verify security vulnerabilities and protections
- **Accessibility Tests**: Ensure UI is accessible to all users

---

## Backend Testing

### Test Structure

Backend tests are organized in the `backend/__tests__` directory:

```
backend/__tests__/
├── features/           # Feature-level integration tests
│   ├── authentication/
│   ├── admin/
│   └── business/
├── services/           # Service-specific tests
│   ├── auth-service/
│   ├── business-service/
│   └── admin-service/
├── routes/             # API endpoint tests
├── security/           # Security-focused tests
├── helpers/            # Test utilities and fixtures
└── integration/        # Cross-service integration tests
```

### Frameworks & Tools

- **Jest**: Test runner and assertion library
- **Supertest**: HTTP assertion library for testing Express endpoints
- **MongoDB Memory Server**: In-memory MongoDB for testing
- **mongodb-memory-server**: Provides MongoDB instance for tests

### Running Tests

```bash
# Run all tests
cd backend
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="login"
```

### Writing Unit Tests

Unit tests test individual functions or classes in isolation, mocking external dependencies.

**Example: Testing a utility function**

```javascript
// backend/services/auth-service/src/lib/passwordValidator.js
function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }
  
  const errors = [];
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = { validatePasswordStrength };
```

```javascript
// backend/__tests__/services/auth-service/passwordValidator.test.js
const { validatePasswordStrength } = require('../../../services/auth-service/src/lib/passwordValidator');

describe('Password Validator', () => {
  describe('validatePasswordStrength', () => {
    it('should validate a strong password', () => {
      const result = validatePasswordStrength('StrongP@ssw0rd123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 12 characters', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters long');
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePasswordStrength('NOLOWERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePasswordStrength('nouppercase123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('NoNumberPassword!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = validatePasswordStrength('NoSpecialCharacter123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject empty password', () => {
      const result = validatePasswordStrength('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should reject null password', () => {
      const result = validatePasswordStrength(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should return multiple errors for weak password', () => {
      const result = validatePasswordStrength('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
```

### Writing Integration Tests

Integration tests test how multiple components work together, often involving database operations and API calls.

**Example: Testing an API endpoint**

```javascript
// backend/__tests__/routes/login.test.js
const request = require('supertest');
const { setupMongoDB, teardownMongoDB, setupApp } = require('../helpers/setup');
const User = require('../../services/auth-service/src/models/User');

describe('Login API', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await setupMongoDB();
    app = setupApp('auth');
  });

  afterAll(async () => {
    await teardownMongoDB();
  });

  beforeEach(async () => {
    // Clean database before each test
    await User.deleteMany({});
  });

  it('should login with valid credentials', async () => {
    // Create a test user
    const user = await User.create({
      email: 'test@example.com',
      password: '$2a$10$hashedpassword', // Pre-hashed password
      isVerified: true
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      })
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe('test@example.com');
  });

  it('should reject invalid credentials', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
      .expect(401);
  });

  it('should reject unverified user', async () => {
    await User.create({
      email: 'test@example.com',
      password: '$2a$10$hashedpassword',
      isVerified: false
    });

    await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      })
      .expect(403);
  });
});
```

### Writing Security Tests

Security tests verify that your application is protected against common vulnerabilities.

**Example: Testing rate limiting**

```javascript
// backend/__tests__/security/rate-limit.test.js
const request = require('supertest');
const { setupMongoDB, teardownMongoDB, setupApp } = require('../helpers/setup');

describe('Rate Limiting', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await setupMongoDB();
    app = setupApp('auth');
  });

  afterAll(async () => {
    await teardownMongoDB();
  });

  it('should allow requests within rate limit', async () => {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        request(app)
          .post('/api/auth/login')
          .send({ email: 'test@example.com', password: 'wrong' })
      );
    }
    
    const responses = await Promise.all(promises);
    responses.forEach(response => {
      expect([200, 401]).toContain(response.status);
    });
  });

  it('should block requests exceeding rate limit', async () => {
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(
        request(app)
          .post('/api/auth/login')
          .send({ email: 'test@example.com', password: 'wrong' })
      );
    }
    
    const responses = await Promise.all(promises);
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});
```

**Example: Testing SQL injection prevention**

```javascript
// backend/__tests__/security/sql-injection.test.js
const request = require('supertest');
const { setupMongoDB, teardownMongoDB, setupApp } = require('../helpers/setup');

describe('SQL Injection Protection', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await setupMongoDB();
    app = setupApp('auth');
  });

  afterAll(async () => {
    await teardownMongoDB();
  });

  it('should handle malicious input in email field', async () => {
    const maliciousInputs = [
      "test' OR '1'='1",
      "test'; DROP TABLE users;--",
      "<script>alert('xss')</script>",
      "${7*7}",
    ];

    for (const input of maliciousInputs) {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: input, password: 'password' });
      
      // Should not return 500 (server error)
      expect(response.status).not.toBe(500);
      // Should return authentication error
      expect([400, 401]).toContain(response.status);
    }
  });
});
```

### Test Helpers

Create reusable test utilities in `backend/__tests__/helpers/`:

```javascript
// backend/__tests__/helpers/fixtures.js
const bcrypt = require('bcryptjs');
const User = require('../../services/auth-service/src/models/User');

async function createTestUser(overrides = {}) {
  const defaults = {
    email: 'test@example.com',
    password: await bcrypt.hash('Password123!', 10),
    isVerified: true,
    firstName: 'Test',
    lastName: 'User'
  };

  return await User.create({ ...defaults, ...overrides });
}

async function createAdminUser(overrides = {}) {
  return await createTestUser({
    ...overrides,
    role: 'admin',
    email: 'admin@example.com'
  });
}

module.exports = { createTestUser, createAdminUser };
```

```javascript
// backend/__tests__/helpers/auth.js
const jwt = require('jsonwebtoken');

function generateAuthToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
}

module.exports = { generateAuthToken };
```

---

## Frontend Testing

### Test Structure

Frontend tests are co-located with the code they test:

```
web/src/
├── features/
│   ├── authentication/
│   │   ├── __tests__/
│   │   │   ├── LoginFlow.test.jsx
│   │   │   ├── LoginFlow.integration.test.jsx
│   │   │   └── LoginFlow.security.test.jsx
│   │   ├── components/
│   │   │   └── __tests__/
│   │   │       └── LoginForm.test.jsx
│   │   └── hooks/
│   │       └── __tests__/
│   │           └── useLogin.test.jsx
├── shared/
│   ├── components/
│   │   └── __tests__/
│   └── utils/
│       └── __tests__/
└── test/
    ├── fixtures/
    ├── utils/
    └── setup.js
```

### Frameworks & Tools

- **Vitest**: Test runner (compatible with Jest)
- **React Testing Library**: Component testing utilities
- **Playwright**: E2E testing framework
- **MSW (Mock Service Worker)**: API mocking
- **@axe-core/playwright**: Accessibility testing

### Running Tests

```bash
# Run all unit tests
cd web
npm test

# Run tests with coverage
npm run test:unit

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- LoginForm.test.jsx

# Run E2E tests
npm run test:e2e

# Run all tests (lint + unit + e2e)
npm run test:ci
```

### Writing Unit Tests

Unit tests test React components and hooks in isolation, mocking external dependencies.

**Example: Testing a React component**

```jsx
// web/src/features/authentication/components/LoginForm.jsx
import { Form, Input, Button } from 'antd';
import { useLoginFlow } from '../hooks';

const LoginForm = () => {
  const { form, handleFinish, isSubmitting } = useLoginFlow();

  return (
    <Form form={form} onFinish={handleFinish} layout="vertical">
      <Form.Item
        name="email"
        label="Email"
        rules={[{ required: true, type: 'email' }]}
        data-testid="login-email"
      >
        <Input placeholder="Enter your email" />
      </Form.Item>
      
      <Form.Item
        name="password"
        label="Password"
        rules={[{ required: true }]}
        data-testid="login-password"
      >
        <Input.Password placeholder="Enter your password" />
      </Form.Item>
      
      <Button
        type="primary"
        htmlType="submit"
        loading={isSubmitting}
        data-testid="login-submit"
      >
        Login
      </Button>
    </Form>
  );
};

export default LoginForm;
```

```jsx
// web/src/features/authentication/components/__tests__/LoginForm.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LoginForm from '../LoginForm';

// Mock the custom hook
const mockHandleFinish = vi.fn();
vi.mock('../hooks', () => ({
  useLoginFlow: () => ({
    form: { setFieldsValue: vi.fn(), getFieldsValue: vi.fn() },
    handleFinish: mockHandleFinish,
    isSubmitting: false
  })
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form with email and password inputs', () => {
    render(<LoginForm />);
    
    expect(screen.getByTestId('login-email')).toBeInTheDocument();
    expect(screen.getByTestId('login-password')).toBeInTheDocument();
    expect(screen.getByTestId('login-submit')).toBeInTheDocument();
  });

  it('should show email label', () => {
    render(<LoginForm />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('should show password label', () => {
    render(<LoginForm />);
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('should call handleFinish on form submit', () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByTestId('login-email').querySelector('input');
    const passwordInput = screen.getByTestId('login-password').querySelector('input');
    const submitButton = screen.getByTestId('login-submit');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    expect(mockHandleFinish).toHaveBeenCalled();
  });

  it('should disable submit button when submitting', () => {
    vi.mock('../hooks', () => ({
      useLoginFlow: () => ({
        form: { setFieldsValue: vi.fn() },
        handleFinish: mockHandleFinish,
        isSubmitting: true
      })
    }));
    
    render(<LoginForm />);
    
    const submitButton = screen.getByTestId('login-submit');
    expect(submitButton).toBeDisabled();
  });
});
```

**Example: Testing a custom hook**

```jsx
// web/src/features/authentication/hooks/useLogin.js
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/shared/utils/api';

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/auth/login', credentials);
      localStorage.setItem('token', response.data.token);
      navigate('/dashboard');
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
};
```

```jsx
// web/src/features/authentication/hooks/__tests__/useLogin.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLogin } from '../useLogin';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));

vi.mock('@/shared/utils/api', () => ({
  default: {
    post: vi.fn()
  }
}));

describe('useLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should login successfully', async () => {
    const mockResponse = { data: { token: 'test-token', user: { id: 1 } } };
    api.post.mockResolvedValue(mockResponse);
    
    const { result } = renderHook(() => useLogin());
    
    await result.current.login({ email: 'test@example.com', password: 'password' });
    
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(localStorage.getItem('token')).toBe('test-token');
  });

  it('should handle login error', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Invalid credentials' } } });
    
    const { result } = renderHook(() => useLogin());
    
    await expect(
      result.current.login({ email: 'test@example.com', password: 'wrong' })
    ).rejects.toThrow();
    
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Invalid credentials');
  });

  it('should set loading to true during login', async () => {
    api.post.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({ data: { token: 'test-token' } }), 100)
    ));
    
    const { result } = renderHook(() => useLogin());
    
    const loginPromise = result.current.login({ email: 'test@example.com', password: 'password' });
    
    expect(result.current.loading).toBe(true);
    await loginPromise;
    expect(result.current.loading).toBe(false);
  });
});
```

### Writing Integration Tests

Integration tests test how multiple components work together, often with mocked API calls.

**Example: Testing a complete login flow**

```jsx
// web/src/features/authentication/__tests__/LoginFlow.integration.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils/renderWithProviders';
import LoginForm from '../login/LoginForm';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Setup MSW server
const server = setupServer(
  rest.post('/api/auth/login', (req, res, ctx) => {
    const { email, password } = req.body;
    
    if (email === 'test@example.com' && password === 'Password123!') {
      return res(
        ctx.status(200),
        ctx.json({ token: 'test-token', user: { id: 1, email } })
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({ message: 'Invalid credentials' })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Login Flow Integration', () => {
  it('should complete successful login flow', async () => {
    renderWithProviders(<LoginForm />);
    
    const emailInput = screen.getByTestId('login-email').querySelector('input');
    const passwordInput = screen.getByTestId('login-password').querySelector('input');
    const submitButton = screen.getByTestId('login-submit');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('test-token');
    });
  });

  it('should show error on failed login', async () => {
    renderWithProviders(<LoginForm />);
    
    const emailInput = screen.getByTestId('login-email').querySelector('input');
    const passwordInput = screen.getByTestId('login-password').querySelector('input');
    const submitButton = screen.getByTestId('login-submit');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});
```

### Writing E2E Tests

E2E tests test complete user flows in a real browser.

**Example: Testing login flow with Playwright**

```javascript
// web/tests/e2e/login.spec.js
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.fill('[data-testid="login-email"] input', 'test@example.com');
    await page.fill('[data-testid="login-password"] input', 'Password123!');
    await page.click('[data-testid="login-submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    expect(page.url()).toContain('/dashboard');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('[data-testid="login-email"] input', 'test@example.com');
    await page.fill('[data-testid="login-password"] input', 'wrongpassword');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.click('[data-testid="login-submit"]');
    
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should navigate to forgot password', async ({ page }) => {
    await page.click('[data-testid="login-forgot"]');
    
    await page.waitForURL('**/forgot-password');
    expect(page.url()).toContain('/forgot-password');
  });
});
```

### Writing Accessibility Tests

Accessibility tests ensure your UI is usable by people with disabilities.

```javascript
// web/src/features/authentication/__tests__/LoginFlow.accessibility.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import LoginForm from '../login/LoginForm';

expect.extend(toHaveNoViolations);

describe('LoginForm Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<LoginForm />);
    const results = await axe(container);
    
    expect(results).toHaveNoViolations();
  });

  it('should have proper labels for form inputs', () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(<LoginForm />);
    
    const submitButton = screen.getByTestId('login-submit');
    expect(submitButton).toHaveAttribute('type', 'submit');
  });
});
```

---

## Best Practices

### General

- **Test behavior, not implementation**: Focus on what the code does, not how it does it
- **Arrange-Act-Assert pattern**: Structure tests with clear setup, execution, and verification
- **One assertion per test**: Keep tests focused and easy to understand
- **Descriptive test names**: Use names that clearly describe what is being tested
- **Avoid test interdependence**: Each test should be able to run independently

### Backend

- **Use in-memory database**: Don't use real databases in tests
- **Clean up after tests**: Use `afterEach` to clean database state
- **Mock external services**: Don't make real API calls to external services
- **Test error cases**: Don't just test happy paths
- **Use meaningful test data**: Use realistic data in tests

### Frontend

- **Test user interactions**: Simulate real user behavior (clicks, typing)
- **Avoid testing implementation details**: Don't test internal state or methods
- **Use data-testid attributes**: For elements that don't have accessible text
- **Mock API calls**: Use MSW to mock HTTP requests
- **Test loading and error states**: Don't just test successful scenarios

---

## Common Patterns

### Mocking Dependencies

**Backend - Mocking a service**

```javascript
// Mock email service
jest.mock('../../services/auth-service/src/lib/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true)
}));
```

**Frontend - Mocking a hook**

```javascript
vi.mock('../hooks/useLogin', () => ({
  useLogin: () => ({
    login: vi.fn(),
    loading: false,
    error: null
  })
}));
```

### Testing Async Code

**Backend**

```javascript
it('should handle async operation', async () => {
  const result = await someAsyncFunction();
  expect(result).toBe('expected value');
});
```

**Frontend**

```javascript
it('should handle async state update', async () => {
  render(<Component />);
  fireEvent.click(screen.getByText('Load'));
  
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

### Testing Error Boundaries

```javascript
it('should handle error', async () => {
  const mockError = new Error('Test error');
  api.get.mockRejectedValue(mockError);
  
  const { result } = renderHook(() => useData());
  
  await expect(result.current.fetch()).rejects.toThrow('Test error');
  expect(result.current.error).toBe('Test error');
});
```

### Testing with Fixtures

```javascript
// Create reusable test data
const validUser = {
  email: 'test@example.com',
  password: 'Password123!',
  firstName: 'Test',
  lastName: 'User'
};

it('should create user with valid data', async () => {
  const user = await createUser(validUser);
  expect(user.email).toBe(validUser.email);
});
```

---

## Quick Reference

### Backend Test Commands

```bash
cd backend
npm test                    # Run all tests
npm run test:coverage       # Run with coverage
npm test -- path/to/test    # Run specific file
```

### Frontend Test Commands

```bash
cd web
npm test                    # Run unit tests
npm run test:unit           # Run with coverage
npm run test:watch          # Watch mode
npm run test:e2e            # Run E2E tests
npm run test:ci             # Run all tests
```

### File Naming Conventions

- Backend: `*.test.js`
- Frontend: `*.test.jsx` or `*.test.js`
- Integration: `*.integration.test.js/jsx`
- Security: `*.security.test.js/jsx`
- E2E: `*.spec.js` (Playwright)

### Test Structure Template

```javascript
describe('Feature/Component Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```
