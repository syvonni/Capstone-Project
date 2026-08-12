# Business-Owner Applications Cleanup — Phase 2 Plan

> Follow-up to `megaplan-business-owner-applications-refactor.md`. Focuses on the remaining naming, duplication, and structural inconsistencies found after the first refactor pass.

## 0. Context

- A business record is only created when an application is **approved**.
- During the application lifecycle, the primary entity is an **Application**.
- The first refactor renamed the dashboard/selection state from `business*` to `application*` and removed direct HTTP calls.
- This plan addresses the remaining duplication, inconsistent hook naming, mixed file extensions, and stale `business` semantics.

## 1. Delete Flow Consolidation

### Problem
Delete behavior is split across three hooks:
- `hooks/useDelete.jsx` — generic confirmation modal that can also delete by `draftApplicationId`.
- `hooks/useApplicationActions.js` — `handleDeleteApplication` direct delete + side effects (currently unused by any component).
- `hooks/useApplicationFormHandlers.jsx` — `handleDeleteDraft` direct delete + page reload.

### Goal
One authoritative `useApplicationDelete` hook used by `ApplicationPermitForm`, `ApplicationDetailPanel`, and any list-level delete.

### Steps
1. Create `hooks/useApplicationDelete.js`:
   - Optional confirmation modal.
   - Optional `draftApplicationId` for inline draft deletion.
   - Optional `onDelete` callback for custom side effects.
   - Accepts `onAfterDelete` for refetch/navigation.
2. Replace `useDelete` imports in:
   - `ApplicationPermitForm.jsx`
   - `ApplicationDetailPanel.jsx`
3. Remove dead `handleDeleteApplication`/`handleDeleteClick` from `useApplicationActions.js`.
4. Remove `handleDeleteDraft` from `useApplicationFormHandlers.jsx` or delegate to the new hook.
5. Rename `useDelete.jsx` → `useApplicationDelete.js` and update `hooks/index.js`.

## 2. Payment Flow Consolidation

### Problem
Payment behavior is split across:
- `hooks/usePaymentModal.jsx` — header-level modal + receipt info builder.
- `hooks/useApplicationPaymentFlow.jsx` — form-level submit + payment record creation.
- `hooks/useApplicationPaymentHandlers.jsx` — detail-panel `onPaymentSuccess` + form ref submit + payment record.
- `hooks/useBusinessOwnerApplicationModals.js` — owns `showPaymentModal`, `showReceiptModal`, `receiptData`, etc.
- `components/ApplicationPermitForm.jsx` — local `showResubmitModal` state.

### Goal
A single `useApplicationPayment` hook that can be configured for the three contexts (header, form, detail panel) and uses shared receipt/payment-record helpers.

### Steps
1. Keep `useApplicationFees` and `useViewReceipt` as shared helpers.
2. Create `useApplicationPayment` (or rename `useApplicationPaymentFlow`):
   - Manages `showPaymentModal`, `showResubmitModal`.
   - Builds `receiptInfo` via a shared helper.
   - Accepts `onProcessPayment` callback:
     - Form context: validate fields, `handleSubmit`, create payment record, show receipt.
     - Header context: call the parent's `onPaymentSuccess`.
     - Detail-panel context: `formRef.submitApplication()`, create payment record, fetch applications, show receipt.
3. Replace `usePaymentModal` and `useApplicationPaymentFlow` usages.
4. Move all receipt/payment modal state into the main modals hook or a dedicated `useApplicationReceipt` hook.
5. Remove `usePaymentModal.jsx`.

## 3. Modal State Consolidation

### Problem
Modal state is scattered:
- `useBusinessOwnerApplicationModals` owns many modals but not all.
- `ApplicationOverview` and `ApplicationInfoCard` manage `manualVisible` / `permitModalOpen` locally.
- `ApplicationPermitForm` has local `showResubmitModal`.

### Goal
Centralize all application UI modal state in one hook.

### Steps
1. Decide on one owner: either `useBusinessOwnerApplicationModals` (rename to `useApplicationModals`) or a new `useApplicationModals`.
2. Move `manualVisible` / `permitModalOpen` from `useApplicationInfoCard` and local components into the central modals hook.
3. Remove local `showResubmitModal` from `ApplicationPermitForm`.
4. Rename `useBusinessOwnerApplicationModals.js` → `useApplicationModals.js`.
5. Resolve the naming collision with the LGU-officer `useApplicationModals` by renaming the LGU one to `useOfficerApplicationModals`.

## 4. Hook Naming Standardization

### Problem
Twelve hooks in `applications/hooks/` do not start with `useApplication`:
- `useDelete.jsx`
- `useFilters.js`
- `useFormContentState.js`
- `useFormDefinitionLoader.js`
- `useFormState.js`
- `useFormStepState.js`
- `useLobChangeHandler.js`
- `usePagination.js`
- `usePaymentModal.jsx`
- `useResubmitHandler.js`
- `useSectionCompletion.js`
- `useViewReceipt.js`

### Goal
All feature-specific hooks use the `useApplication` prefix. Generic utilities move to `shared/hooks` if truly reusable.

### Steps
1. Rename each hook to `useApplicationXxx`.
2. Update all imports in components and in `hooks/index.js`.
3. Move `usePagination`, `useFilters` to `shared/hooks` only if they are not application-specific.

## 5. Export & File Extension Standardization

### Problem
- `useApplicationFormSubmit.js` and `useApplicationAutosave.js` use `export default`; all others use named exports.
- Mix of `.js` and `.jsx` in hooks. Components are consistently `.jsx`.

### Goal
Named exports only; consistent file extensions.

### Steps
1. Convert `useApplicationFormSubmit` and `useApplicationAutosave` to named exports.
2. Decide on one convention for hooks:
   - Option A: `.js` for non-JSX hooks, `.jsx` for hooks returning JSX.
   - Option B: `.jsx` for all React hooks.
3. Apply the chosen convention across the directory.
4. Either use the `hooks/index.js` barrel consistently or remove it.

## 6. Semantics Rename: `business` → `application`

### Problem
The application object is still named `business` in many places:
- Components: `ApplicationDetailHeader`, `ApplicationDetailPanel`, `ApplicationOverview`, `ApplicationInfoCard`, `ApplicationFaqTab`.
- Hooks: `useApplicationStatus`, `useApplicationCompletionStatus`, `useApplicationPaymentHandlers`, `useApplicationAppealHandlers`, `useViewReceipt`, `useApplicationInfoCard`, `usePaymentModal`.
- State: `showBusinessTypeSelector` is actually permit-type selection.
- Comments and JSDoc still say “business” in many hooks.

### Goal
The application entity is consistently called `application` everywhere except where it genuinely refers to a `Business` record (post-approval).

### Steps
1. Rename prop `business` → `application` in the components listed above.
2. Rename hook parameters `business` → `application` and update JSDoc.
3. Rename `showBusinessTypeSelector` → `showApplicationTypeSelector` or `showPermitTypeSelector` and update call sites.
4. Update stale comments.
5. Update utility names like `getBusinessDisplayName` → `getApplicationDisplayName`, `getBusinessId` → `getApplicationId` only if they actually operate on applications.

## 7. Property Access Fix: `businessId` → `applicationId`

### Problem
Several hooks read `business.businessId || business._id` on an application object, but applications have `applicationId`. The `businessId` field is only relevant after a business is created on approval.

### Affected Locations
- `hooks/useApplicationAppealHandlers.jsx` (lines 45, 69, 128)
- `hooks/useApplicationPaymentHandlers.jsx` (line 57)
- `hooks/useApplicationPaymentFlow.jsx` (line 63)
- `hooks/useViewReceipt.js` (line 67)
- `components/ApplicationDetailPanel.jsx` (line 79)
- `components/ApplicationPermitForm.jsx` (line 294)

### Steps
1. Change `businessId || _id` to `applicationId || _id` in these locations.
2. Check service endpoints that still expect `businessId` as a request key; keep the key name if the backend contract requires it, but rename the local variable to `applicationId`.

## 8. Single-Use Hook Cleanup

### Problem
Several hooks are used by only one component and could be inlined or moved:
- `useApplicationSelection` — used only in `useApplicationsState`.
- `useApplicationFees` — used only in `ApplicationOverview`.
- `usePaymentModal` — used only in `ApplicationDetailHeader`.
- `useApplicationDraftCreation`, `useApplicationFormValues`, `useApplicationAutosaveSectionChange`, `useApplicationTestData`, `useLobChangeHandler`, `useResubmitHandler` — used only in `ApplicationPermitForm`.

### Goal
Keep the directory lean; either inline small single-use logic or keep it as a hook only when it meaningfully isolates complexity.

### Steps
1. For each single-use hook, decide: keep, inline, or merge into a broader hook.
2. Remove dead `hooks/index.js` re-exports if the barrel is not adopted.

## 9. Verification

- `npm run build`
- `npx eslint src/features/business-owner/pages/applications`
- Search for remaining `fetchJsonWithFallback` or `@/lib/http` direct imports.
- Search for remaining `business` variable/prop names in `applications/`.
- Smoke-test: create draft, delete draft, submit, pay, appeal, clear all.

## 10. Order of Execution (Recommended)

1. **Delete consolidation** — low risk, removes dead code.
2. **`businessId` → `applicationId` property fix** — small, high correctness value.
3. **Payment flow consolidation** — medium risk, high value.
4. **Modal state consolidation** — medium risk.
5. **Hook naming + exports + extensions** — high churn, low risk.
6. **`business` → `application` semantics rename** — high churn, medium risk.
7. **Single-use hook cleanup** — low risk.
8. **Verification**.
