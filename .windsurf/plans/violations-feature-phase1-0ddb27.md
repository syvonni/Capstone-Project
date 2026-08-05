# Violations Feature Implementation Plan

This plan implements a complete violations feature as an independent admin feature, following the same patterns as Post Requirements and Variables, with database model, admin API routes, admin UI components, and seed data.

## Overview

The violations feature provides a centralized catalog of violation definitions that can be referenced by future inspection items. This follows the same pattern as Fees, Documents, Post Requirements, and Variables - master data that gets referenced by other entities.

### Phase 1.1: Create Violation Database Model

**File**: `backend/services/business-service/src/models/Violation.js`

**Schema**:
```javascript
{
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  severity: {
    type: String,
    required: true,
    enum: ['minor', 'major', 'critical']
  },
  penalty: {
    type: Number,
    min: 0,
    default: null
  },
  legalBasis: [{
    _id: false,
    url: { type: String, trim: true },
    title: { type: String, trim: true },
    description: { type: String, trim: true }
  }],
  correctiveAction: {
    type: String,
    trim: true
  },
  gracePeriodDays: {
    type: Number,
    min: 0,
    default: 30
  },
  feeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fee',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: Number,
    default: 1
  },
  effectiveDate: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}
```

**Indexes**: `code`, `category`, `severity`, `isActive`

**Encryption**: Apply to `name`, `description`, `legalBasis[].title`, `legalBasis[].description`, `correctiveAction` (deterministic for name)

### Phase 1.2: Create Admin API Routes

**File**: `backend/services/business-service/src/routes/adminViolations.js`

**Imports**:
```javascript
const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const Violation = require("../models/Violation");
const Fee = require("../models/Fee");
const User = require("../models/User");
const { requireJwt, requireRole, requireAdminStepUp } = require("../middleware/auth");
const { logAuditEvent } = require("../lib/auditClient");
```

**Helper Function** (matching adminVariables.js pattern):
```javascript
async function getUserName(userId) {
  try {
    const user = await User.findById(userId).select('name email').lean();
    return user?.name || user?.email || userId;
  } catch (err) {
    console.error('Failed to fetch user name for audit:', err);
    return userId;
  }
}
```

**Endpoints**:

**GET /api/business/admin/violations** - list with filters
- Query params: `category`, `severity`, `isActive`
- Filter logic: if provided, add to filter object
- Sort by name ascending
- Populate `feeId` to include linked penalty fee details
- Return: `{ data: violations, total: violations.length }`
- Error handling: 500 with "Failed to fetch violations"

**GET /api/business/admin/violations/:id** - get single violation
- Validate ObjectId with `mongoose.Types.ObjectId.isValid(id)`
- Return 400 if invalid ID
- Return 404 if not found
- Populate `feeId` to include linked penalty fee details
- Return: `{ data: violation }`
- Error handling: 500 with "Failed to fetch violation"

**POST /api/business/admin/violations** - create violation
- Middleware: `requireJwt`, `requireRole(["admin"])`, `requireAdminStepUp`
- Request body: `code`, `name`, `description`, `category`, `severity`, `penalty`, `legalBasis`, `correctiveAction`, `gracePeriodDays`
- Validation: `name` and `code` required
- Create Violation with `createdBy` and `updatedBy` set to `req._userId`
- If `penalty` is provided, create Fee and link it (matching adminVariables.js pattern):
  ```javascript
  if (penalty) {
    const fee = await Fee.create({
      name: `${name} Penalty`,
      amount: penalty,
      category: 'penalty',
      isActive: true,
    });
    violation.feeId = fee._id;
    await violation.save();
  }
  ```
- Audit logging (matching adminVariables.js pattern):
  ```javascript
  const userName = await getUserName(req._userId);
  logAuditEvent("violation_created", req._userId, "violation", String(violation._id), {
    role: "admin",
    fieldChanged: "violation",
    oldValue: "",
    newValue: String(violation._id),
    violationId: String(violation._id),
    code: violation.code,
    name: violation.name,
    category: violation.category,
    severity: violation.severity,
    isActive: violation.isActive,
    version: violation.version,
    userName,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  }).catch((err) => console.error("Failed to log audit event for violation create", err));
  ```
- Return: 201 with `{ data: violation }`
- Error handling: 500 with "Failed to create violation"

**PUT /api/business/admin/violations/:id** - update violation
- Middleware: `requireJwt`, `requireRole(["admin"])`, `requireAdminStepUp`
- Validate ObjectId
- Return 404 if not found
- Request body: `code`, `name`, `description`, `category`, `severity`, `penalty`, `legalBasis`, `correctiveAction`, `gracePeriodDays`, `isActive`
- Store oldValues for audit: `{ code, name, description, category, severity, penalty, legalBasis, correctiveAction, gracePeriodDays, isActive, feeId }`
- Build updates object with conditional spread
- If `penalty` is provided and different from current fee amount, update linked Fee or create new Fee:
  ```javascript
  if (penalty !== undefined && penalty !== null) {
    if (violation.feeId) {
      // Update existing fee
      await Fee.findByIdAndUpdate(violation.feeId, { amount: penalty, name: `${name} Penalty` });
    } else {
      // Create new fee
      const fee = await Fee.create({
        name: `${name} Penalty`,
        amount: penalty,
        category: 'penalty',
        isActive: true,
      });
      updates.feeId = fee._id;
    }
  }
  ```
- Increment version if status changed, update effectiveDate
- Set `updatedBy` to `req._userId`
- Audit logging (matching adminVariables.js pattern):
  ```javascript
  const updatedValues = { /* same fields as oldValues */ };
  const changes = Object.keys(updates).filter(key => key !== 'updatedBy' && key !== 'version' && key !== 'effectiveDate');
  const userName = await getUserName(req._userId);
  logAuditEvent("violation_updated", req._userId, "violation", String(violation._id), {
    role: "admin",
    fieldChanged: "violation",
    oldValue: JSON.stringify(oldValues),
    newValue: JSON.stringify(updatedValues),
    violationId: String(violation._id),
    code: violation.code,
    name: violation.name,
    category: violation.category,
    severity: violation.severity,
    isActive: violation.isActive,
    version: violation.version,
    changes,
    userName,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  }).catch((err) => console.error("Failed to log audit event for violation update", err));
  ```
- Return: `{ data: updated }`
- Error handling: 500 with "Failed to update violation"

**DELETE /api/business/admin/violations/:id** - soft delete
- Middleware: `requireJwt`, `requireRole(["admin"])`, `requireAdminStepUp`
- Validate ObjectId
- Return 404 if not found
- Store oldValues: `{ isActive, version }`
- Soft-disable: set `isActive: false`, increment version, update effectiveDate, set `updatedBy`
- Audit logging (matching adminVariables.js pattern):
  ```javascript
  const userName = await getUserName(req._userId);
  logAuditEvent("violation_disabled", req._userId, "violation", id, {
    role: "admin",
    fieldChanged: "violation_status",
    oldValue: JSON.stringify(oldValues),
    newValue: JSON.stringify({ isActive: false, version: updated.version }),
    violationId: id,
    code: violation.code,
    name: violation.name,
    category: violation.category,
    severity: violation.severity,
    isActive: false,
    version: updated.version,
    userName,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  }).catch((err) => console.error("Failed to log audit event for violation disable", err));
  ```
- Return: `{ data: updated }`
- Error handling: 500 with "Failed to disable violation"

**GET /api/business/admin/violations/:id/audit** - proxy to audit service
- Middleware: `requireJwt`
- Get audit service URL from `process.env.AUDIT_SERVICE_URL` (default: "http://localhost:3004")
- Proxy to: `${auditServiceUrl}/api/audit/violation/${req.params.id}` with query params
- Return audit service response
- Error handling: 500 with "Failed to fetch audit history"

**Update index.js**:
- Add route import: `const adminViolationsRouter = require("./routes/adminViolations")`
- Mount route: `app.use("/api/business/admin/violations", adminViolationsRouter)`

### Phase 1.3: Create Frontend Service

**File**: `web/src/features/admin/services/violationService.js`

**Pattern**: Follow postRequirementService.js pattern

**Functions**:
```javascript
- getViolations(params) - GET request to /api/business/admin/violations with query params (category, severity, isActive)
- getViolation(id) - GET request to /api/business/admin/violations/:id
- createViolation(data) - POST request to /api/business/admin/violations with stepUpToken in headers
- updateViolation(id, data) - PUT request to /api/business/admin/violations/:id with stepUpToken in headers
- disableViolation(id) - DELETE request to /api/business/admin/violations/:id with stepUpToken in headers
- getViolationAudit(id) - GET request to /api/business/admin/violations/:id/audit
```

**Error Handling**: Try-catch with proper error messages, throw errors for 4xx/5xx responses

### Phase 1.4: Create Constants

**File**: `web/src/features/admin/pages/violations/constants/violations.constants.js`

**Constants**:
```javascript
export const SEVERITY_LEVELS = [
  { value: 'minor', label: 'Minor', color: 'green' },
  { value: 'major', label: 'Major', color: 'orange' },
  { value: 'critical', label: 'Critical', color: 'red' }
]

export const VIOLATION_CATEGORIES = [
  'Fire Safety',
  'Sanitation',
  'Structural',
  'Zoning',
  'Signage',
  'Electrical',
  'Plumbing',
  'Documentation'
]

export const DEFAULT_FILTERS = {
  isActive: true,
  category: null,
  severity: null
}
```

**Note**: Fee category 'penalty' will be added to Fees feature constants to support violation penalties. A "Penalties" tab should be added to the Fees feature to filter and display fees with category 'penalty', similar to how Variables have their own tab in Fees.

### Phase 1.5: Create Violation Card Component

**File**: `web/src/features/admin/pages/violations/components/ViolationCard.jsx`

**Pattern**: Follow LobCard.jsx pattern using shared components

**Props**: `item` (Violation object), `selected` (boolean), `onClick` (function)

**Implementation**:
- Use PanelCard from shared components
- Display `code` in small text
- Display `name` as title
- Show `severity` as badge (use SEVERITY_LEVELS constant for color)
- Show `category` as tag
- Show `isActive` status with green/gray indicator
- Show `penalty` if exists (formatted as currency)
- Highlight card if selected
- Call onClick when card is clicked

### Phase 1.6: Create Add Violation Modal

**File**: `web/src/features/admin/pages/violations/components/modals/AddViolationModal.jsx`

**Pattern**: Follow AddPostRequirementModal.jsx pattern

**Props**: `open` (boolean), `onClose` (function), `onSuccess` (function)

**Implementation**:
- Use Ant Design Modal with Form
- Import and use `useStepUp` hook for admin verification
- Import `createViolation` from violationService
- Import `currencyFormatter`, `currencyParser` from @/shared/utils/currency.utils
- Form fields in order:
  1. Code (Input, required, unique validation)
  2. Name (Input, required)
  3. Description (TextArea, optional)
  4. Category (Select, required, options from VIOLATION_CATEGORIES)
  5. Severity (Select, required, options from SEVERITY_LEVELS)
  6. Penalty Amount (InputNumber, optional, use currencyFormatter/parser)
     - Label: "Penalty Amount (₱)"
     - Info message: "A penalty fee will be automatically created for this violation. You can edit the fee details in the Fees feature under the Penalties tab after creation."
  7. Legal Basis (Form.List with url, title, description - matching PostRequirement pattern)
  8. Corrective Action (TextArea, optional)
  9. Grace Period Days (InputNumber, default: 30)
- Add "Debug Fill" button for testing
- Add "Add Violation" button (primary, loading state)
- Add "Cancel" button
- Validation: required fields marked with asterisk
- On submit: call `runWithStepUp` with `createViolation`, show success message, reset form, call onSuccess, close modal
- On cancel: reset form, call onClose
- Error handling: show error message if creation fails (unless step-up cancelled)

### Phase 1.7: Create Violation Detail Panel

**File**: `web/src/features/admin/pages/violations/components/ViolationDetailPanel.jsx`

**Pattern**: Follow LobDetailPanel.jsx pattern using shared components

**Props**: `violation` (Violation object), `onUpdate` (function), `onDelete` (function), `loading` (boolean)

**Imports**:
- `DetailHeader`, `FormNavigation`, `InfoGrid` from shared components
- `AuditHistoryModal` from shared components
- `useStepUp` from `@/shared/hooks/useStepUp`
- `useFormChangeTracking` from `@/shared/hooks/useFormChangeTracking`
- `useAudit` from `@/shared/hooks/useAudit`
- `updateViolation`, `disableViolation` from violationService
- SEVERITY_LEVELS, VIOLATION_CATEGORIES from constants

**Implementation**:
- Use `useStepUp` for admin verification on save/delete
- Use `useFormChangeTracking` to detect unsaved changes
- Use `useAudit` to fetch and display audit history
- State: `activeTab` ('overview' | 'configuration'), `showAuditModal` (boolean)
- `DetailHeader`: show violation name, code, severity badge, category badge, edit/delete buttons
- `FormNavigation`: Overview and Configuration tabs
- **Overview Tab (InfoGrid)**:
  - Code
  - Name
  - Description
  - Category
  - Severity (badge with color from SEVERITY_LEVELS)
  - Penalty (formatted as currency if feeId exists, with link to Fees feature under Penalties tab - matching Variable pattern)
  - Legal Basis (display as cards with url link, title, description - matching PostRequirement pattern)
  - Corrective Action
  - Grace Period Days
  - Status (Active/Inactive with display, toggle in Configuration tab)
  - Version
  - Effective Date
  - Created At, Updated At (formatRelativeTime)
  - **Dependencies Section**: Will show Inspection Items that reference this violation (for Phase 4)
- **Configuration Tab (Form)**:
  - Form with initialValues from violation data
  - Editable fields: Code, Name, Description, Category, Severity, Penalty Amount, Legal Basis (Form.List), Corrective Action, Grace Period Days, Active (Switch)
  - Penalty Amount (InputNumber with currencyFormatter/parser, updates linked fee)
  - Info message: "Penalty amount updates the linked fee in the Fees feature under the Penalties tab."
  - Save button (calls `runWithStepUp` with `updateViolation`)
  - Cancel button (resets form to initialValues)
- **Delete button**: calls `runWithStepUp` with `disableViolation`, shows confirmation modal
- **Audit button**: opens AuditHistoryModal with violation's audit history

### Phase 1.8: Create Violation Audit Detail Panel

**File**: `web/src/features/admin/pages/violations/components/ViolationAuditDetailPanel.jsx`

**Pattern**: Follow LobAuditDetailPanel.jsx pattern

**Implementation**:
- Display audit event details for violations
- Show field changes (oldValue vs newValue)
- Format violation-specific fields (severity, category, penalty)

### Phase 1.9: Create Hooks

**File**: `web/src/features/admin/pages/violations/hooks/useViolations.js`

**Pattern**: Follow useLobs.js and usePostRequirements.js pattern

**Implementation**:
- State: `selectedItemId` (string | null), `violations` (array), `loading` (boolean), `error` (object | null)
- `fetchViolations(filters)`: calls `getViolations(filters)` from service, sets violations state, sets loading true/false
- `fetchViolation(id)`: calls `getViolation(id)` from service, returns single violation
- `createViolation(data)`: calls `createViolation(data)` from service, calls `fetchViolations()` to refresh list
- `updateViolation(id, data)`: calls `updateViolation(id, data)` from service, calls `fetchViolations()` to refresh list
- `disableViolation(id)`: calls `disableViolation(id)` from service, calls `fetchViolations()` to refresh list
- `refresh()`: calls `fetchViolations()` with current filters
- `selectedItem`: computed from violations array using selectedItemId
- `onSelectItem(item)`: sets selectedItemId to item._id
- `onAddNew()`: sets selectedItemId to 'new'
- **Alphabetical sorting**: `items = violations.sort((a, b) => a.name.localeCompare(b.name))`
- Return: { selectedItemId, setSelectedItemId, items, selectedItem, onSelectItem, onAddNew, refresh, loading, error, create, update, disable }

**File**: `web/src/features/admin/pages/violations/hooks/useViolationsFilters.js`

**Pattern**: Follow useLobFilters.js pattern

**Implementation**:
- State: `searchTerm` (string), `categoryFilter` (string | null), `severityFilter` (string | null), `statusFilter` (boolean | null)
- `setSearchTerm(value)`: updates searchTerm state
- `setCategoryFilter(value)`: updates categoryFilter state
- `setSeverityFilter(value)`: updates severityFilter state
- `setStatusFilter(value)`: updates statusFilter state
- `resetFilters()`: resets all filters to DEFAULT_FILTERS values
- Return: { searchTerm, categoryFilter, severityFilter, statusFilter, setSearchTerm, setCategoryFilter, setSeverityFilter, setStatusFilter, resetFilters }

### Phase 1.10: Create Utils

**File**: `web/src/features/admin/pages/violations/utils/violations.utils.js`

**Pattern**: Follow lob.utils.js pattern

**Implementation**:
- `filterItemsBySearch(items, searchTerm)`: filters items by searching name, code, description fields (case-insensitive)
- `filterItemsByCategory(items, category)`: filters items where category matches category
- `filterItemsBySeverity(items, severity)`: filters items where severity matches severity
- `filterItemsByStatus(items, status)`: filters items where isActive matches status (true/false)
- `getSeverityLabel(severity)`: returns label from SEVERITY_LEVELS constant for given severity value
- `getSeverityColor(severity)`: returns color from SEVERITY_LEVELS constant for given severity value
- Export all functions

### Phase 1.11: Create Admin Violations Wrapper

**File**: `web/src/features/admin/pages/violations/AdminViolations.jsx`

**Pattern**: Follow AdminLob.jsx pattern

**Implementation**:
- Import AdminLayout from shared components
- Import ViolationsView from views/ViolationsView
- Import WarningOutlined or ExclamationCircleOutlined from @ant-design/icons
- Export default function AdminViolations()
- Return AdminLayout with:
  - title: "Violations"
  - icon: WarningOutlined or ExclamationCircleOutlined
  - children: <ViolationsView />
- Export ViolationsView as named export for testing

### Phase 1.12: Create Violations View

**File**: `web/src/features/admin/pages/violations/views/ViolationsView.jsx`

**Pattern**: Follow AdminLobView.jsx and PostRequirementsView.jsx structure

**Imports**:
- ResponsiveSplitLayout from shared components
- ListPanel from shared components
- ViolationCard from components/ViolationCard
- ViolationDetailPanel from components/ViolationDetailPanel
- AddViolationModal from components/modals/AddViolationModal
- useViolations from hooks/useViolations
- useViolationsFilters from hooks/useViolationsFilters
- SEVERITY_LEVELS, VIOLATION_CATEGORIES from constants

**Implementation**:
- Call useViolations() hook to get items, selectedItem, onSelectItem, onAddNew, refresh, loading
- Call useViolationsFilters() hook to get filter states and setters
- State: `showAddModal` (boolean)
- filterConfig for ListPanel:
  - category: { key: 'category', label: 'Category', options: VIOLATION_CATEGORIES.map(c => ({ value: c, label: c })) }
  - severity: { key: 'severity', label: 'Severity', options: SEVERITY_LEVELS }
  - status: { key: 'isActive', label: 'Status', options: [{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }] }
- ListPanel props:
  - items: from useViolations hook
  - renderCard: (item, selected, onClick) => <ViolationCard item={item} selected={selected} onClick={onClick} />
  - selectedId: selectedItemId
  - onSelectItem: onSelectItem
  - filterConfig: filterConfig
  - customFilter: true (use custom filtering logic with utils)
  - showRefresh: true
  - onRefresh: refresh
  - primaryButton: { icon: PlusOutlined, onClick: () => setShowAddModal(true), label: 'Add Violation' }
- ResponsiveSplitLayout props:
  - list: <ListPanel ... />
  - detail: selectedItem ? <ViolationDetailPanel violation={selectedItem} onUpdate={refresh} onDelete={refresh} loading={loading} /> : null
- AddViolationModal props:
  - open: showAddModal
  - onClose: () => setShowAddModal(false)
  - onSuccess: () => { refresh(); setShowAddModal(false) }
- Return ResponsiveSplitLayout with ListPanel and AddViolationModal

### Phase 1.13: Create Index Export

**File**: `web/src/features/admin/pages/violations/index.js`

**Pattern**: Follow lob/index.js pattern

**Implementation**:
```javascript
export { default as ViolationsView } from './views/ViolationsView'
export { default as AdminViolations } from './AdminViolations'
```

### Phase 1.14: Add Navigation

**File**: `web/src/features/admin/components/AdminSidebar.jsx`

**Implementation**:
- Import AdminViolations from pages/violations
- Add menu item object: { key: 'violations', label: 'Violations', icon: WarningOutlined, path: '/admin/violations' }
- Insert menu item after PostRequirements in the menu array
- Ensure route exists in App.jsx or router configuration for '/admin/violations' path

### Phase 1.15: Seed Initial Data

**File**: `backend/services/business-service/src/seed/seedViolationsClean.js`

**Sample Violations**:
- Fire Safety: Missing extinguisher (FIRE-001), blocked exits (FIRE-002), expired extinguisher (FIRE-003)
- Sanitation: No sanitary permit (SAN-001), improper waste disposal (SAN-002), pest infestation (SAN-003)
- Structural: Cracked walls (STR-001), water damage (STR-002), roof leaks (STR-003)
- Zoning: Unauthorized structure (ZON-001), improper land use (ZON-002)
- Signage: Missing permit (SIG-001), oversized sign (SIG-002), prohibited location (SIG-003)

**Seeder Logic**:
1. Check if Violation collection is empty (to avoid reseeding)
2. If empty, create sample Violation documents with:
   - code, name, description, category, severity
   - legalBasis array with sample ordinance references
   - correctiveAction text
   - gracePeriodDays (default: 30)
   - isActive: true
3. Log seeding results (count created)
4. Return seeding status for monitoring

**Update index.js**:
- Add seeder call on startup: `const { seedIfEmpty: seedViolations } = require("./seed/seedViolationsClean")`

### Phase 1.16: Implementation Order

1. **Database Model** - Create Violation model with encryption and indexes
2. **API Routes** - Create adminViolations.js with all endpoints and audit logging
3. **Frontend Service** - Create violationService.js with proper error handling
4. **Frontend Constants** - Create violations.constants.js with enums
5. **Violation Card** - Create ViolationCard.jsx component
6. **Add Modal** - Create AddViolationModal.jsx with step-up verification
7. **Detail Panel** - Create ViolationDetailPanel.jsx with Overview/Configuration tabs
8. **Audit Panel** - Create ViolationAuditDetailPanel.jsx
9. **Hooks** - Create useViolations.js and useViolationsFilters.js
10. **Utils** - Create violations.utils.js with filter functions
11. **Admin Wrapper** - Create AdminViolations.jsx wrapper
12. **View** - Create ViolationsView.jsx with ResponsiveSplitLayout
13. **Index Export** - Create violations/index.js
14. **Navigation** - Add to AdminSidebar.jsx
15. **Seed Data** - Create seedViolationsClean.js
16. **Integration** - Test full flow end-to-end

### Phase 1.17: Testing Strategy

**Unit Tests**:
- Model validation (code uniqueness, required fields, enum values)
- API endpoint responses
- Service function behavior
- Filter utility functions

**Integration Tests**:
- Create violation via API → appears in list
- Update violation → changes persist
- Soft delete → violation marked inactive
- Audit events logged correctly
- Filter functionality (category, severity, status)

**Manual Testing**:
- Navigate to Violations page
- Create new violation via modal
- Edit existing violation via detail panel
- View audit history
- Soft delete violation
- Verify filters work (category, severity, status)
- Test step-up verification on write operations

### Phase 1.18: Success Criteria

- Admins can create, edit, and soft delete violations
- Violations display with proper severity badges and categories
- Audit history tracks all violation changes
- Seed data populates on fresh database
- UI follows existing admin patterns (fees, documents, post-requirements, variables)
- Admin step-up verification works on all write operations
- No breaking changes to existing features
- ResponsiveSplitLayout and ListPanel patterns followed correctly
