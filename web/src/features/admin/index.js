// Admin root barrel — prefer importing from here for cross-feature components

// Pages
export { default as AdminDashboard } from './pages/dashboard/index.jsx'
export { AdminFormsView as AdminForms, AdminUnifiedBusinessPermit, AdminTemporaryPermits } from './pages/forms'
export { RequestsView as AdminRequests } from './pages/requests'

// Notes:
// - Prefer importing from '@/features/admin' or sub-barrels to avoid deep paths.
