# Megaplan: Business-Owner Applications Feature Refactor

## 1. Executive Summary

The `web/src/features/business-owner/pages/applications` feature has grown into a large, flat module with **~50 files** across `components/`, `components/modals/`, `hooks/`, and `utils/`. It works, but it carries significant technical debt:

- **3 direct HTTP calls** are made from components/hooks instead of services.
- **26 hook files** exist, several with **unused exports**, **naming conflicts**, or **duplicated logic**.
- **Components are bloated** with logic that should live in hooks or utilities.
- **Cross-feature sharing** with `staffs/lgu-officer` is ad-hoc and uses same-named hooks.
- **Inconsistencies** with the admin feature’s cleaner service-first, page-organized pattern.

This megaplan proposes a staged refactor to align the applications feature with the rest of the codebase, reduce duplication, and make the feature maintainable at scale.

---

## 2. Current State

### 2.1 File Inventory

```
features/business-owner/pages/applications/
├── components/
│   ├── ApplicationDetailHeader.jsx
│   ├── ApplicationDetailPanel.jsx
│   ├── ApplicationFaqTab.jsx
│   ├── ApplicationInfoCard.jsx
│   ├── ApplicationOverview.jsx
│   ├── ApplicationPanelCard.jsx
│   ├── ApplicationPermitForm.jsx
│   ├── ApplicationTypeSelector.jsx
│   ├── ApplicationsList.jsx
│   ├── ApplicationInfoCard.stories.jsx
│   └── modals/ (9 files)
├── hooks/ (26 files)
├── utils/ (3 files)
```

Full hook inventory:

| Hook | Export | Used By | Status |
|------|--------|---------|--------|
| `useApplicationAppealHandlers` | named | `ApplicationDetailPanel` | ✅ used |
| `useApplicationAutosave` | default | `ApplicationPermitForm` | ✅ used |
| `useApplicationAutosaveSectionChange` | named | `ApplicationPermitForm` | ✅ used |
| `useApplicationDraftCreation` | named | `ApplicationPermitForm` | ⚠️ `handleCategorySelect` unused |
| `useApplicationFormHandlers` | named | `ApplicationDetailPanel` | ✅ used |
| `useApplicationFormNavigation` | named | `ApplicationPermitForm` | ✅ used |
| `useApplicationFormValues` | named | `ApplicationPermitForm` | ✅ used |
| `useApplicationInfoCard` | named | `ApplicationInfoCard`, `ApplicationDetailPanel` | ✅ used |
| `useApplicationModals` | named | `ApplicationPermitForm`, `ApplicationDetailPanel` | ⚠️ name conflict with lgu-officer |
| `useApplicationPaymentFlow` | named | `ApplicationPermitForm` | ⚠️ duplicates payment logic |
| `useApplicationPaymentHandlers` | named | `ApplicationDetailPanel` | ⚠️ duplicates payment logic |
| `useApplicationTestData` | named | `ApplicationPermitForm`, lgu-officer `ApplicationDetailPanel` | ✅ cross-feature |
| `useApplicationsState` | named | `BusinessOwnerMasterView` | ✅ used |
| `useBusinessActions` | named | `BusinessOwnerMasterView` | ✅ used, generic name |
| `useBusinessDashboard` | named | `useApplicationsState` | ✅ used |
| `useBusinessFormSubmit` | default | `ApplicationPermitForm` | ✅ used, name could be clearer |
| `useBusinessOwnerApplicationStatus` | named | `ApplicationDetailPanel` | ✅ used |
| `useBusinessSelection` | named | `useApplicationsState` | ✅ used, trivial |
| `useDelete` | named | `ApplicationPermitForm`, `ApplicationDetailPanel`, `useBusinessActions` | ✅ used |
| `useFilters` | named | `useApplicationsState` | ✅ used, trivial |
| `useFormContentState` | named | `ApplicationPermitForm` | ✅ used |
| `useFormDefinitionLoader` | named | `ApplicationPermitForm` | ✅ used |
| `useFormState` | named | `useApplicationsState` | ✅ used |
| `useFormStepState` | named | `ApplicationPermitForm` | ✅ used |
| `usePagination` | named | `useApplicationsState` | ✅ used, trivial |
| `usePaymentModal` | named | `ApplicationDetailHeader` | ⚠️ overlaps `useApplicationModals` |
| `useSectionCompletion` | named | `ApplicationPermitForm` | ✅ used |

### 2.2 Direct HTTP Calls

Three calls bypass the service layer:

1. `ApplicationOverview.jsx:11,38` — `get('/api/business/application-fees/by-permit-form/${business.formType}')`
   - No service function exists.
   - **Fix:** Add `getApplicationFeesByFormType(formType)` to `paymentService.js` or `applicationService.js`.

2. `useApplicationFormHandlers.jsx:101` — `fetchJsonWithFallback('/api/auth/welcome-complete', { method: 'PATCH' })`
   - Same call is also in `BusinessOwnerMasterView.jsx`.
   - **Fix:** Add `markWelcomeComplete()` to `authentication/services/authService.js`.

3. `ApplicationsList.jsx:38` — `fetchJsonWithFallback('/api/business/debug/clear-applications', { method: 'POST' })`
   - Debug-only endpoint.
   - **Fix:** Add `clearAllApplications()` to `applicationService.js` or a new `debugService.js`.

### 2.3 Dead / Unused Code

- `useApplicationDraftCreation.jsx` exports `handleCategorySelect` (lines 140–190) which is never imported.
- `useApplicationTestData.jsx` exports `ALAMINOS_TEST_ADDRESS` which is never imported.
- `ApplicationFaqTab.jsx` re-implements status flag logic instead of using `useBusinessOwnerApplicationStatus`.

### 2.4 Duplication & Conflicts

- **Payment flow is split across 3 hooks:** `useApplicationPaymentFlow`, `useApplicationPaymentHandlers`, `usePaymentModal`. Each has its own `handlePaymentSuccess`, `handleSubmitAndPay`, etc.
- **Delete logic is split:** `useDelete`, `useApplicationFormHandlers`, `useBusinessActions`.
- **Draft creation is scattered:** `useApplicationDraftCreation`, `useBusinessActions`, `useApplicationTestData`.
- **Naming conflict:** `useApplicationModals.js` exists in both `business-owner` and `lgu-officer` features with different implementations.
- **Service import inconsistency:** `deleteApplication` is imported from both `applicationService.js` and `businessProfileService.js` (same endpoint, duplicated service function).

### 2.5 Component Bloat

- `ApplicationPermitForm.jsx` (~628 lines) still contains inline handlers (`handleResubmitConfirm`, `handleLobChange`) and payment flow pieces that could move to hooks.
- `ApplicationOverview.jsx` fetches fees inline and builds card config inline.
- `ApplicationInfoCard.jsx` has large status-specific conditional rendering blocks.
- `ApplicationDetailPanel.jsx` computes `allSectionsComplete` and `lockedFields` inline.

---

## 3. Target Architecture

Mirror the admin feature conventions:

- **Service-first HTTP access:** Components/hooks only call `services/*`, never `fetchJsonWithFallback` directly.
- **Page-level organization:** Group related hooks, utils, and constants by page concern.
- **Thin components:** Components render UI; hooks own state, effects, and handlers.
- **Shared generic hooks:** Reuse `/shared/hooks/` where applicable (`useUndoRedo`, `useFormChangeTracking`).
- **Feature-scoped naming:** Hook names clearly indicate domain (`useApplicationX`, not `useBusinessX` where it means application).

---

## 4. Phased Plan

### Phase 1 — Service Layer Cleanup (low risk, quick wins)

**Goal:** Eliminate all direct HTTP calls in the applications feature.

1. Add `getApplicationFeesByFormType(formType)` to `features/business-owner/services/paymentService.js`.
2. Add `markWelcomeComplete()` to `features/authentication/services/authService.js`.
3. Add `clearAllApplications()` to `features/business-owner/services/applicationService.js` (or `debugService.js`).
4. Update call sites:
   - `ApplicationOverview.jsx`
   - `useApplicationFormHandlers.jsx`
   - `ApplicationsList.jsx`
   - `BusinessOwnerMasterView.jsx` (welcome-complete)
5. Run lint/build.

### Phase 2 — Dead Code & Naming (low risk)

**Goal:** Remove unused code and resolve naming conflicts.

1. Remove `handleCategorySelect` from `useApplicationDraftCreation.jsx` (or implement the missing category selection UI).
2. Remove `ALAMINOS_TEST_ADDRESS` export from `useApplicationTestData.jsx` (move to test utils if still needed).
3. Rename `useApplicationModals.js` → `useBusinessOwnerApplicationModals.js`.
4. Rename lgu-officer `useApplicationModals.js` → `useLguOfficerApplicationModals.js`.
5. Update all imports.
6. Rename `useBusinessFormSubmit.js` → `useApplicationFormSubmit.js`.
7. Rename `useBusinessActions.js` → `useApplicationActions.js`.
8. Rename `useBusinessOwnerApplicationStatus.js` → `useApplicationStatus.js` (optional, for consistency).

### Phase 3 — Consolidate Duplicated Logic (medium risk)

**Goal:** Merge overlapping hooks and move logic to the right layer.

1. **Payment consolidation**
   - Merge `useApplicationPaymentFlow`, `useApplicationPaymentHandlers`, and `usePaymentModal` into a single `useApplicationPayment.js`.
   - `ApplicationPermitForm` and `ApplicationDetailPanel` both consume the consolidated hook.
   - Extract receipt viewing into a shared `viewReceipt()` utility (also used by appeal handlers).

2. **Delete consolidation**
   - Keep `useDelete` as the single source of truth for delete confirmation.
   - Move `handleDeleteApplication` from `useApplicationFormHandlers.jsx` and `useBusinessActions.js` into `useApplicationActions.js`.
   - Components call `useDelete` or `useApplicationActions` consistently.

3. **Draft creation consolidation**
   - Create `createDraftApplication(payload)` in `applicationService.js`.
   - `useApplicationDraftCreation`, `useApplicationActions`, and `useApplicationTestData` all call this service.

4. **Status flags**
   - Update `ApplicationFaqTab.jsx` to use `useBusinessOwnerApplicationStatus` instead of inline status checks.

### Phase 4 — Component Logic Extraction (medium risk)

**Goal:** Move non-rendering logic out of components.

1. `ApplicationOverview.jsx`
   - Extract `useApplicationFees(formType)` hook.
   - Extract card configuration to `useOverviewCards()` or a utility.

2. `ApplicationDetailPanel.jsx`
   - Extract `useApplicationCompletionStatus({ business, formAllSectionsComplete, isReturned })`.
   - Extract `lockedFields` calculation into the same hook or `useApplicationStatus`.
   - Extract `autosaveStatus` state into a `useAutosaveStatus()` hook if it grows.

3. `ApplicationPermitForm.jsx`
   - Extract `useResubmitHandler({ form, handleSubmit, setShowResubmitModal })`.
   - Extract `useLobChangeHandler(form, setFormValues, ...)` or fold into `useApplicationFormValues`.

4. `ApplicationInfoCard.jsx`
   - Extract status message mapping to `features/business-owner/utils/applicationStatusMessages.js`.
   - Optionally create `ApplicationStatusMessage.jsx` and `ApplicationStatusActions.jsx` sub-components.

5. `ApplicationsList.jsx`
   - Move `handleClearApplications` into `useApplicationListActions()` hook.

### Phase 5 — Reorganization (medium risk, optional)

**Goal:** Improve directory structure as the module grows.

Consider grouping hooks by concern into subdirectories (re-exports via index files to avoid breaking imports):

```
hooks/
├── index.js
├── form/
│   ├── useFormContentState.js
│   ├── useFormDefinitionLoader.js
│   ├── useFormStepState.js
│   ├── useFormState.js
│   ├── useApplicationFormHandlers.jsx
│   ├── useApplicationFormNavigation.jsx
│   ├── useApplicationFormValues.jsx
│   ├── useApplicationFormSubmit.js
│   └── useSectionCompletion.js
├── autosave/
│   ├── useApplicationAutosave.js
│   └── useApplicationAutosaveSectionChange.jsx
├── dashboard/
│   ├── useApplicationsState.js
│   ├── useBusinessDashboard.js
│   ├── useApplicationActions.js
│   ├── useFilters.js
│   ├── usePagination.js
│   └── useBusinessSelection.js
├── payment/
│   ├── useApplicationPayment.js
│   └── useApplicationAppealHandlers.jsx
├── status/
│   ├── useApplicationStatus.js
│   └── useApplicationInfoCard.js
├── draft/
│   ├── useApplicationDraftCreation.jsx
│   └── useApplicationTestData.jsx
└── ui/
    ├── useApplicationModals.js
    ├── useDelete.jsx
    └── usePaymentModal.jsx
```

Also add per-page constants/utils folders:

```
applications/
├── components/
├── hooks/
├── services/   (or keep in feature-level services)
├── utils/
├── constants/
└── modals/
```

### Phase 6 — Shared/Generic Hook Adoption (longer term)

**Goal:** Reduce custom hook proliferation and reuse shared abstractions.

1. Evaluate if `useApplicationAutosave` and `useFeesAutosave` (admin) can share a generic `useAutosave(values, onSave, options)` in `/shared/hooks/`.
2. Use `/shared/hooks/useFormChangeTracking` for the permit form if it fits the current change-tracking needs.
3. Use `/shared/hooks/useUndoRedo` if undo/redo is ever added to the permit form.

### Phase 7 — Verification & Hardening

1. Run full `npm run build`.
2. Run `npx eslint` over the entire `features/business-owner/pages/applications` directory.
3. Run unit/integration tests if they exist.
4. Manually smoke-test: create draft, autosave, submit, pay, appeal, delete, clear all.

---

## 5. Recommended Implementation Order

For minimal risk and visible improvement, execute in this order:

1. **Phase 1** (service cleanup) — removes the 3 direct HTTP calls.
2. **Phase 2** (dead code & naming) — reduces confusion and lint errors.
3. **Phase 3** (payment consolidation) — biggest duplication reduction.
4. **Phase 4** (component extraction) — makes components testable and smaller.
5. **Phase 5** (reorganization) — only after the above are stable.
6. **Phase 6** (shared hooks) — only if needed for other features.

---

## 6. Risks & Notes

- **Renaming files with wide imports:** Use `git mv` and a global search/replace to avoid broken imports. Run build after each rename batch.
- **Cross-feature hook usage:** `useApplicationTestData` is used by lgu-officer. Coordinate renames/moves carefully.
- **Large component surgery:** `ApplicationPermitForm` is the riskiest; extract small pieces at a time and test.
- **Backend contracts:** Phase 1 does not change backend endpoints, only frontend service wrappers.
- **No behavior changes intended:** This is a structural refactor; preserve all current user-facing behavior.

---

## 7. Acceptance Criteria

- [ ] Zero direct `fetchJsonWithFallback` or `http.*` calls in `applications` components/hooks (except in service files).
- [ ] No unused exports in `applications/hooks/`.
- [ ] No duplicated `handlePaymentSuccess`, `handleSubmitAndPay`, or delete handlers.
- [ ] `ApplicationPermitForm.jsx` is under 400 lines.
- [ ] All `npm run build` and `npx eslint` checks pass.
- [ ] Smoke tests for draft → autosave → submit → payment → appeal pass.
