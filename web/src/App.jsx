import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { ProtectedRoute, PublicRoute } from "@/features/authentication"
import { useNavigationNotifications, useSessionActivity, useAuthSync, useSessionTimeout, useAuthSession } from "@/features/authentication/hooks"
import PageSlide from "@/shared/components/PageTransition.jsx"
import StaffLayout from "@/shared/components/StaffLayout"

// Eager-load only the homepage (LCP) and auth shell - everything else is lazy
import Home from "@/features/public/pages/Home"
import { Login, SignUp, SignUpMfaSetup, ForgotPassword, DeletionPendingScreen } from "@/features/authentication"

// Lazy load routes - chunks load on navigation
const TermsOfService = lazy(() => import("@/features/public").then(m => ({ default: m.TermsOfService })))
const PrivacyPolicy = lazy(() => import("@/features/public").then(m => ({ default: m.PrivacyPolicy })))
const BizClearManual = lazy(() => import("@/features/public").then(m => ({ default: m.BizClearManual })))
const Maintenance = lazy(() => import("@/features/public").then(m => ({ default: m.Maintenance })))
const ApplicationTracker = lazy(() => import("@/features/public/pages/ApplicationTracker.jsx"))
const HelpPage = lazy(() => import("@/features/public/pages/HelpPage.jsx"))
const BusinessSearch = lazy(() => import("@/features/public/pages/BusinessSearch.jsx"))
const PasskeyMobileAuth = lazy(() => import("@/features/authentication/pages/PasskeyMobileAuth.jsx"))
const MfaSetup = lazy(() => import("@/features/authentication/mfa/components/MfaSetup.jsx"))
const ProfileSettings = lazy(() => import("@/features/user/views/ProfileSettings"))
const NotificationHistoryPage = lazy(() => import("@/features/user/views/NotificationHistoryPage.jsx"))
const AdminOnboarding = lazy(() => import("@/features/admin/pages/AdminOnboarding.jsx"))
const AdminDashboard = lazy(() => import("@/features/admin/pages/dashboard/index.jsx"))
const AdminContentManagement = lazy(() => import("@/features/admin/pages/content-management").then(m => ({ default: m.ContentManagementView })))
const AdminRequests = lazy(() => import("@/features/admin/pages/requests").then(m => ({ default: m.RequestsView })))
const AdminMaintenance = lazy(() => import("@/features/admin/pages/maintenance").then(m => ({ default: m.MaintenancePage })))
// Phase 2 admin pages
const AdminFees = lazy(() => import("@/features/admin/pages/fees").then(m => ({ default: m.AdminFeesView })))
const AdminDocuments = lazy(() => import("@/features/admin/pages/documents").then(m => ({ default: m.DocumentsView })))
const AdminLob = lazy(() => import("@/features/admin/pages/lob").then(m => ({ default: m.AdminLobView })))
const AdminForms = lazy(() => import("@/features/admin/pages/forms/views/AdminFormsView"))
const AdminUnifiedBusinessPermit = lazy(() => import("@/features/admin/pages/forms/views/UnifiedBusinessPermitView"))
const AdminTemporaryPermits = lazy(() => import("@/features/admin/pages/forms/views/TemporaryPermitsView"))
const AdminPostRequirements = lazy(() => import("@/features/admin/pages/post-requirements").then(m => ({ default: m.PostRequirementsView })))
const AdminVariables = lazy(() => import("@/features/admin/pages/variables").then(m => ({ default: m.VariablesView })))
const AdminViolations = lazy(() => import("@/features/admin/pages/violations").then(m => ({ default: m.ViolationsView })))
const AdminInspections = lazy(() => import("@/features/admin/pages/inspections").then(m => ({ default: m.InspectionsView })))
const BusinessOwnerDashboard = lazy(() => import("@/features/business-owner/pages/BusinessOwnerMasterView.jsx"))
const BusinessOwnerOnboarding = lazy(() => import("@/features/business-owner/pages/BusinessOwnerOnboarding.jsx"))
const BusinessOwnerBusinesses = lazy(() => import("@/features/business-owner/pages/businesses/index.jsx"))

// const ClearanceTracker = lazy(() => import("@/features/business-owner/components/clearance/ClearanceTracker.jsx"))

const StaffDashboard = lazy(() => import("@/features/staffs").then(m => ({ default: m.StaffDashboard })))
const StaffOnboarding = lazy(() => import("@/features/staffs").then(m => ({ default: m.StaffOnboarding })))
const OfficerDashboard = lazy(() => import("@/features/staffs/lgu-officer/pages/OfficerDashboard.jsx"))
const OfficerDashboardPage = lazy(() => import("@/features/staffs/lgu-officer/pages/OfficerDashboardPage.jsx"))
const OfficerApplications = lazy(() => import("@/features/staffs/lgu-officer/pages/applications/index.jsx"))
const OfficerPermitProcessing = lazy(() => import("@/features/staffs/lgu-officer/pages/permit-processing/index.jsx"))
const OfficerHelpRequests = lazy(() => import("@/features/staffs/lgu-officer/pages/help-requests/index.jsx"))
const OfficerLedger = lazy(() => import("@/features/staffs/lgu-officer/pages/OfficerLedger.jsx"))
const OfficerBookmarks = lazy(() => import("@/features/staffs/lgu-officer/pages/bookmarks/index.jsx"))
const OfficerToReview = lazy(() => import("@/features/staffs/lgu-officer/pages/to-review/index.jsx"))
const OfficerBusinesses = lazy(() => import("@/features/staffs/lgu-officer/pages/businesses/index.jsx"))
const OfficerBusinessOwners = lazy(() => import("@/features/staffs/lgu-officer/pages/business-owners/index.jsx"))
const PlaceholderPage = lazy(() => import("@/shared/pages/PlaceholderPage"))

function PageFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }} aria-hidden="true">
      <span style={{ fontSize: '14px', color: '#999' }}>Loading…</span>
    </div>
  )
}

function App() {
  useNavigationNotifications()
  useSessionActivity()
  useAuthSync()
  
  const { logout } = useAuthSession()
  
  useSessionTimeout({
    timeoutMs: (Number(import.meta.env.VITE_SESSION_TIMEOUT_HOURS) || 4) * 60 * 60 * 1000, // Configurable via env var, default 4 hours
    warningMs: 5 * 60 * 1000, // 5 minutes
    onTimeout: () => logout(),
    onWarning: () => {
      // Warning message shown by the hook
    }
  })

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<PublicRoute><Home /></PublicRoute>} />
      <Route path="/terms" element={<PublicRoute><TermsOfService /></PublicRoute>} />
      <Route path="/privacy" element={<PublicRoute><PrivacyPolicy /></PublicRoute>} />
      <Route path="/manual" element={<PublicRoute><BizClearManual /></PublicRoute>} />
      <Route path="/maintenance" element={<PublicRoute><Maintenance /></PublicRoute>} />
      <Route path="/application-tracker" element={<PublicRoute><ApplicationTracker /></PublicRoute>} />
      <Route path="/help" element={<PublicRoute><HelpPage /></PublicRoute>} />
      <Route path="/business-search" element={<PublicRoute><BusinessSearch /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><PageSlide><Login /></PageSlide></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><PageSlide><ForgotPassword /></PageSlide></PublicRoute>} />
      <Route path="/sign-up" element={<PublicRoute><PageSlide><SignUp /></PageSlide></PublicRoute>} />
      <Route path="/signup/mfa-setup" element={<SignUpMfaSetup />} />
      <Route path="/auth/passkey-mobile" element={<PublicRoute><PasskeyMobileAuth /></PublicRoute>} />
      <Route path="/deletion-pending" element={<ProtectedRoute><DeletionPendingScreen /></ProtectedRoute>} />
      <Route path="/admin/onboarding" element={<ProtectedRoute allowedRoles={['admin']}><AdminOnboarding /></ProtectedRoute>} />
      <Route path="/staff/onboarding" element={<ProtectedRoute allowedRoles={['staff', 'lgu_officer', 'inspector']}><StaffOnboarding /></ProtectedRoute>} />
      <Route path="/business-owner/onboarding" element={<ProtectedRoute allowedRoles={['business_owner']}><BusinessOwnerOnboarding /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><StaffLayout><Outlet /></StaffLayout></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="requests" element={<AdminRequests />} />
        <Route path="content-management" element={<AdminContentManagement />} />
        <Route path="maintenance" element={<AdminMaintenance />} />
        <Route path="fees" element={<AdminFees />} />
        <Route path="variables" element={<AdminVariables />} />
        <Route path="documents" element={<AdminDocuments />} />
        <Route path="post-requirements" element={<AdminPostRequirements />} />
        <Route path="violations" element={<AdminViolations />} />
        <Route path="inspections" element={<AdminInspections />} />
        <Route path="lob" element={<AdminLob />} />
        <Route path="forms" element={<Navigate to="business-permit" replace />} />
        <Route path="forms/business-permit" element={<AdminUnifiedBusinessPermit />} />
        <Route path="forms/temporary-permits" element={<AdminTemporaryPermits />} />
      </Route>

      {/* Admin Onboarding - separate route with hideSidebar */}
      <Route path="/admin/onboarding" element={<ProtectedRoute allowedRoles={['admin']}><AdminOnboarding /></ProtectedRoute>} />

      {/* Business Owner Routes */}
      <Route path="/owner" element={<ProtectedRoute allowedRoles={['business_owner']}><BusinessOwnerDashboard showBrandLogo={true} hideProfileSettings={true} /></ProtectedRoute>} />
      <Route path="/business-owner" element={<ProtectedRoute allowedRoles={['business_owner']}><BusinessOwnerDashboard showBrandLogo={true} hideProfileSettings={true} /></ProtectedRoute>} />
      <Route path="/business-owner/applications" element={<ProtectedRoute allowedRoles={['business_owner']}><BusinessOwnerDashboard showBrandLogo={true} hideProfileSettings={true} /></ProtectedRoute>} />
      <Route path="/business-owner/businesses" element={<ProtectedRoute allowedRoles={['business_owner']}><BusinessOwnerBusinesses /></ProtectedRoute>} />
      <Route path="/owner/notifications" element={<Navigate to="/notifications" replace />} />
      
      <Route path="/application/new" element={<ProtectedRoute allowedRoles={['business_owner']}><Navigate to="/business-owner/applications" replace /></ProtectedRoute>} />
      <Route path="/applications" element={<ProtectedRoute allowedRoles={['business_owner']}><Navigate to="/owner" replace /></ProtectedRoute>} />
      {/* <Route path="/clearance" element={<ProtectedRoute allowedRoles={['business_owner']}><ClearanceTracker /></ProtectedRoute>} /> */}
      
      {/* Staff Routes */}
      <Route path="/staff" element={<ProtectedRoute allowedRoles={['staff', 'lgu_officer', 'inspector']}><OfficerDashboard /></ProtectedRoute>}>
        <Route index element={<OfficerDashboardPage />} />
        <Route path="to-review" element={<OfficerToReview />} />
        <Route path="applications" element={<OfficerApplications />} />
        <Route path="permit-processing" element={<OfficerPermitProcessing />} />
        <Route path="businesses" element={<OfficerBusinesses />} />
        <Route path="businesses/:businessId" element={<OfficerBusinesses />} />
        <Route path="business-owners" element={<OfficerBusinessOwners />} />
        <Route path="help-requests" element={<OfficerHelpRequests />} />
        <Route path="ledger" element={<OfficerLedger />} />
        <Route path="bookmarks" element={<OfficerBookmarks />} />
      </Route>

      {/* Generic/Public Routes */}
      <Route path="/settings-profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationHistoryPage /></ProtectedRoute>} />
      
      {/* Catch-all for 404 */}
      <Route path="*" element={<PlaceholderPage title="Page Not Found" />} />
    </Routes>
    </Suspense>
  )
}

export default App
