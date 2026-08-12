# Capstone Project Notes

## Backend verification

Run the full backend feature test suite from `backend/`:

```bash
npx jest __tests__/features/unit __tests__/features/smoke __tests__/features/integration __tests__/smoke --runInBand
```

- Last passing run: 63 test suites, 602 tests (≈112 s).

Run the auth/security routes separately:

```bash
npx jest __tests__/routes/login.test.js __tests__/routes/login-simple.test.js __tests__/security/password-security.test.js __tests__/features/authentication/passkey.test.js --runInBand
```

- Last passing run: 4 test suites, 106 tests (≈17 s).

## Frontend verification

Build the production bundle from `web/`:

```bash
npm run build
```

- Last passing build succeeded with only the usual Vite/Rollup circular-dependency and chunk-size warnings (no build errors).

Run lint on the touched files from `web/`:

```bash
npx eslint src/shared/components/DetailHeader.jsx src/features/admin/pages/inspections/components/__tests__/ChecklistDetailPanel.state.test.jsx
```

- Both touched files pass.

Run lint on the form-preview refactor from `web/`:

```bash
npx eslint src/shared/components/formPreview/ src/features/business-owner/pages/applications/components/ApplicationPermitForm.jsx src/features/staffs/lgu-officer/pages/applications/components/ApplicationSectionContent.jsx src/features/admin/pages/forms/components/FormPreviewContent.jsx
```

- Passes with only the usual React version setting warning.

Run all unit tests from `web/`:

```bash
npx vitest run --no-file-parallelism
```

- Latest run: 70 suites passed, 887 tests passed (≈132 s).
- `CompactListCard` test deletion no longer prevents the full suite from running.

## Backend notes

- The documented feature verification command passes.
- Auth route, security, and passkey suites pass after updating stale assertions to the direct response contract.
- `__tests__/helpers/rateLimit.js` is a test-only helper to reset auth login rate-limit state.

## Active architectural notes

- `BusinessProfile` does not contain an embedded `businesses` array. Standalone `Business` records are created after application approval.
- The frontend `http.js` layer returns the parsed JSON body directly. Backend no longer wraps successful responses in `{ ok: true, data }`. Frontend MSW handlers and service tests should return direct data.
- IPFS/document uploads remain active; do not remove as part of blockchain/tamper cleanup.

## Known follow-ups

- `DetailHeader` callers pass `title`/`subtitle`, but the component still does not render them. Re-enabling the title block caused Vitest to load a stale module and the `ChecklistDetailPanel` new-checklist tests to fail, so the component was kept in its original state for now.
- `ChecklistConfiguration` has a `Form.Item name="items"` with both a `Select` and a listing `div`, which triggers an Ant Design warning.
- `ChecklistDetailPanel` destructure `auditLoading` from `useAudit`, but the hook returns `loading`, leaving `auditLoading` undefined.
- The real `useChecklistForm` form instance is created in view-only mode and is not attached to a `<Form>` until edit mode, producing an Ant Design "Instance created by useForm is not connected" warning.
- `src/shared/components/ChangesSummaryModal.jsx` was deleted in the working tree but is still imported by `src/features/admin/pages/documents/components/ClaimableDocumentDetailPanel.jsx`; it was restored via `git checkout` so the build could pass. The deletion needs to be coordinated with that import if it is intentional.
- `src/shared/components/__tests__/CompactListCard.test.jsx` is deleted in the working tree, breaking one Vitest suite.
- Form-preview refactor: `DynamicFormRenderer.jsx`, `PreviewField.jsx`, `PreviewSection.jsx`, and `RepeatableGroupField.jsx` were deleted; `.backup` copies are preserved. `ApplicationPermitForm.jsx`, `ApplicationSectionContent.jsx`, and `FormPreviewContent.jsx` now use the new `FormRenderer`. `FormPreviewContent` still renders the LOB section with the legacy `LobSection` component.

## Admin edit step-up flow

All admin configuration edit saves now use the shared `useStepUpSummary` hook (`web/src/shared/hooks/useStepUpSummary.jsx`).

- Clicking **Save** on an existing record opens `ChangesSummaryModal` with the changed fields.
- Confirming runs `runWithStepUp(saveOperation, { directPasskey: true })`.
- Passkey users see the browser passkey prompt directly; TOTP users still see the `StepUpModal`.
- Add/creation flows keep the original `runWithStepUp(saveOperation)` behavior without the summary.
- Status changes and delete/remove actions keep the original `StepUpModal`.

This covers variables, LOBs, post requirements, violations, inspection items, checklists, claimable documents, unified/temporary permit forms, and all fees tabs (general fees, variable fee rules, tax brackets).
