# Variable Fees — Full-Stack Implementation Plan

Implement admin CRUD for variable fee rules mirroring the conditional fees pattern, with form UI fixes, reference seeder sync to 28 rules, LOB tax code category mapping, and FormNavigation/InfoGrid integration in the detail panel.

**STATUS: APPROVED - PROCEEDING WITH IMPLEMENTATION**

## Immediate UI Fixes (Part 0)

### 0A. AddVariableFeeModal.jsx
- Change "Fee Name" label to "Variable Fee Name"
- Change "Notes" label to "Admin Notes"
- Change "Category" label to "Applicable Categories"
- Change single category select to multi-select (categories array) using existing CATEGORIES array
- Remove Status field entirely (defaults to active)
- Set initial form value: `isActive: true` (no UI field)
- **Sync CALCULATION_METHODS to match VariableFeeRuleDetailPanel** (add capitalization, gross_sales, custom options)

### 0B. VariableFeeRuleDetailPanel.jsx
- Change "Name" label to "Variable Fee Name"
- Change "Notes" label to "Admin Notes"
- Add missing "Applicable Categories" field (multi-select)
- Keep Status field in DetailHeader select (for existing rules)
- Add FormNavigation and InfoGrid components (like ConditionalFeeDetailPanel)
- **Fix AuditHistoryModal**: Add `eventDescriptions={AUDIT_EVENT_INFO.filter(e => e.event.startsWith('variable_fee_rule_'))}`
- **Fix AuditHistoryModal**: Add `DetailPanelComponent={FeeAuditDetailPanel}` prop
- **Fix AuditHistoryModal**: Use `useAudit` hook instead of `entityType/entityId` props (like Universal/Conditional panels)

---

## Part A — Backend: Variable Fee Rule CRUD

### A1. Model — `backend/services/business-service/src/models/VariableFeeRule.js` (new)
Fields:
- `name` (String, required, encrypted)
- `notes` (String, optional, encrypted)
- `question` (String, required, encrypted) — user-facing question
- `calculationMethod` (String, required) — floor_area, percentage, per_unit
- `baseRate` (Number, required, min 0)
- `unit` (String, required) — e.g., "per sqm", "per unit"
- `categories` ([String], default []) — LOB tax codes (multi-category support)
- `isActive` (Boolean, default true)
- `version` (Number, default 1)
- `effectiveDate` (Date, default now)
- `timestamps: true`
- Apply `encryptionPlugin` on `["name", "notes", "question"]`

### A2. Routes — `backend/services/business-service/src/routes/adminVariableFeeRules.js` (new)
Mirror `adminConditionalFees.js`:
- `GET /` — list (filter by `isActive`, optional `category` → `{ categories: code }`)
- `GET /:id` — single
- `GET /:id/audit` — proxy to audit-service `/api/audit/variable-fee-rule/:id`
- `POST /` — `requireJwt` + `requireRole(['admin'])` + `requireAdminStepUp`; validate all fields; create; audit `variable_fee_rule_created` (full snapshot)
- `PUT /:id` — update fields, bump `version`, audit `variable_fee_rule_updated` (full snapshot + diff)
- `DELETE /:id` — soft-disable (`isActive=false`, bump version), step-up, audit `variable_fee_rule_disabled`

Register in `index.js`: `app.use("/api/business/admin/variable-fee-rules", adminVariableFeeRulesRouter)`

### A3. Audit route — `backend/services/audit-service/src/routes/audit/fees.js`
Add `GET /variable-fee-rule/:variableFeeRuleId` handler with event types:
`variable_fee_rule_created`, `variable_fee_rule_updated`, `variable_fee_rule_disabled`.

### A4. Seed — `backend/services/business-service/src/seed/seedVariableFeeRules.js` (new)
- Source data from `comprehensiveFeeSeederReference.js` → `variableFeeRules` array
- **IMPORTANT**: First update `comprehensiveFeeSeederReference.js` to only include the 28 rules from `variableFeeRules.constants.js`
- Category mapping (reference → LOB tax codes):
  - `building` → `['CON']`
  - `transportation` → `['TRN']`
  - `food_service` → `['FDS']`
  - `warehouse` → `['WHL']`
  - `mining` → `['MIN']`
  - `real_estate` → `['RES']`
  - `education` → `['SVC']` (Education under Services)
  - `tourism` → `['ENT']` (Tourism under Entertainment)
- Idempotent upsert keyed on `name`
- Export `seed()` + `seedIfEmpty()`; wire into startup

### A5. Update Reference Seeder
Edit `comprehensiveFeeSeederReference.js`:
- Replace entire `variableFeeRules` array with only the 28 rules from `variableFeeRules.constants.js`
- Keep same structure (name, notes, question, calculationMethod, baseRate, unit, category, isActive)
- Ensure `_id` values match constants file

---

## Part B — Frontend: Variable Fee Rule wiring

### B1. Service — `web/src/features/admin/services/feeService.js`
Add (mirroring conditional fee functions):
- `getVariableFeeRules(params)` → `GET /api/business/admin/variable-fee-rules`
- `getVariableFeeRule(id)`
- `createVariableFeeRule(data, {stepUpToken})`
- `updateVariableFeeRule(id, data, {stepUpToken})`
- `disableVariableFeeRule(id, {stepUpToken})`
- `getVariableFeeRuleAuditHistory(id, params)`

### B2. Hook — `web/src/features/admin/pages/fees/hooks/useFees.js`
- Fetch variable fee rules from backend in `loadData()` (add to `Promise.all`)
- `items` `case 'variable_fee_rules'` → return fetched list (remove `VARIABLE_FEE_RULES` import/usage)

### B3. Add modal — `AddVariableFeeModal.jsx`
- Replace mock `console.log` with `createVariableFeeRule(values, { stepUpToken })` wrapped in `runWithStepUp`
- Submit `categories` array (multi-select)
- Remove status field (defaults to active)

### B4. Detail panel — `VariableFeeRuleDetailPanel.jsx`
- Accept `rule` prop from backend list instead of looking up `VARIABLE_FEE_RULES` constant
- Add FormNavigation component (tabs: Overview, Calculation Preview)
- Add InfoGrid component for overview display
- `handleSave`: call `createVariableFeeRule` (new) or `updateVariableFeeRule` (edit) with step-up
- Status select → call `disableVariableFeeRule` / reactivate via `updateVariableFeeRule`
- Add categories multi-select field
- Wire real audit history modal via `getVariableFeeRuleAuditHistory`

### B5. View — `AdminFeesView.jsx`
- Pass backend `selectedItem` as `rule` to `VariableFeeRuleDetailPanel`
- Ensure `refresh` re-fetches variable fee rules after add/edit/disable

### B6. Audit event info — `web/src/shared/config/auditEventTypes.js`
Add to `EVENT_TYPE_LABELS` and `AUDIT_EVENT_INFO`:
- `variable_fee_rule_created` — "Variable Fee Rule Created"
- `variable_fee_rule_updated` — "Variable Fee Rule Updated"
- `variable_fee_rule_disabled` — "Variable Fee Rule Disabled"

---

## Part C — Cleanup / deletions
- **Delete** `web/src/features/admin/pages/fees/constants/variableFeeRules.constants.js` after B2/B4 no longer import it
- Grep for remaining `VARIABLE_FEE_RULES` importers (e.g., `LobDetailPanel.jsx`, `LobSection.jsx`) — update to fetch from API
- **Remove all mock console.log calls** from AddVariableFeeModal and VariableFeeRuleDetailPanel after API wiring

---

## Part D — Final Verification
- Run `seedVariableFeeRules.js` to populate database with 28 rules
- Verify no mock data is used in frontend (all data fetched from API)
- Test add/edit/disable operations in UI

---

## Suggested execution order
1. 0A + 0B (UI fixes)
2. A5 (update reference seeder)
3. A1 model → A2 routes → register → A3 audit route → A4 seed
4. B1 service → B2 hook → B3 modal → B4 panel → B5 view → B6 audit labels
5. C cleanup

## Verification
- Backend: run `seedVariableFeeRules.js`, then `curl` list/create/update/delete with admin JWT + step-up; confirm audit rows
- Frontend: add/edit/disable a variable fee rule; confirm list refresh, category names render, FormNavigation/InfoGrid work
- Run ESLint on all touched `web/` files
