// Admin root barrel — prefer importing from here for cross-feature components

// Pages
export { default as AdminDashboard } from './pages/dashboard/index.jsx'
export { default as AdminForms } from './pages/AdminForms'
export { default as AdminUnifiedBusinessPermit } from './pages/AdminUnifiedBusinessPermit'
export { default as AdminTemporaryPermits } from './pages/AdminTemporaryPermits'
export { default as AdminRequests } from './pages/AdminRequests'

// Notes:
// - Prefer importing from '@/features/admin' or sub-barrels to avoid deep paths.
