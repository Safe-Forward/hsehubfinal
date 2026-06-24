import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CompanyRegistration from "./pages/CompanyRegistration";
import AuthDebug from "./pages/AuthDebug";
import NotFound from "./pages/NotFound";
import AcceptInvitation from "./pages/AcceptInvitation";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import MainLayout from "./components/MainLayout";
import SuperAdminRoute from "./components/SuperAdminRoute";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { CookieConsentProvider } from "./contexts/CookieConsentContext";
import { CookieConsentBanner } from "./components/CookieConsentBanner";

// Lazily loaded routes: less-frequently visited / heavier pages.
// Keeping these out of the main bundle shrinks the critical first-load path.
const Employees = lazy(() => import("./pages/Employees"));
const EmployeeProfile = lazy(() => import("./pages/EmployeeProfile"));
const ActivityGroups = lazy(() => import("./pages/ActivityGroups"));
const RiskAssessments = lazy(() => import("./pages/RiskAssessments"));
const Measures = lazy(() => import("./pages/Measures"));
const Audits = lazy(() => import("./pages/Audits"));
const AuditDetails = lazy(() => import("./pages/AuditDetails"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Training = lazy(() => import("./pages/Training"));
const LessonEditor = lazy(() => import("./pages/LessonEditor"));
const LessonViewer = lazy(() => import("./pages/LessonViewer"));
const Incidents = lazy(() => import("./pages/Incidents"));
const Investigations = lazy(() => import("./pages/Investigations"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const Invoices = lazy(() => import("./pages/Invoices"));
const SetupCompany = lazy(() => import("./pages/SetupCompany"));
const Messages = lazy(() => import("./pages/Messages"));
const Documents = lazy(() => import("./pages/Documents"));
const Reports = lazy(() => import("./pages/Reports"));
const PublicNotes = lazy(() => import("./pages/PublicNotes"));
const Notifications = lazy(() => import("./pages/Notifications"));

const SuperAdminDashboard = lazy(() => import("./pages/SuperAdmin/Dashboard"));
const SuperAdminCompanies = lazy(() => import("./pages/SuperAdmin/Companies"));
const SuperAdminSubscriptions = lazy(() => import("./pages/SuperAdmin/Subscriptions"));
const SuperAdminInvoices = lazy(() => import("./pages/SuperAdmin/Invoices"));
const SuperAdminAddons = lazy(() => import("./pages/SuperAdmin/Addons"));
const SuperAdminAnalytics = lazy(() => import("./pages/SuperAdmin/Analytics"));
const SuperAdminPinVerification = lazy(() => import("./pages/SuperAdmin/PinVerification"));
const SuperAdminCompanyDetail = lazy(() => import("./pages/SuperAdmin/CompanyDetail"));
const SuperAdminUsers = lazy(() => import("./pages/SuperAdmin/Users"));
const SuperAdminSystemLogs = lazy(() => import("./pages/SuperAdmin/SystemLogs"));
const SuperAdminSecurity = lazy(() => import("./pages/SuperAdmin/Security"));
const SuperAdminAdminActions = lazy(() => import("./pages/SuperAdmin/AdminActions"));
const SuperAdminSupport = lazy(() => import("./pages/SuperAdmin/Support"));

const PageLoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CookieConsentProvider>
          <CookieConsentBanner />
          <LanguageProvider>
          <AuthProvider>
            <GlobalErrorBoundary>
            <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/register" element={<CompanyRegistration />} />
              <Route path="/impressum" element={<Impressum />} />
              <Route path="/datenschutz" element={<Datenschutz />} />
              <Route path="/auth-debug" element={<AuthDebug />} />

              {/* Super Admin PIN Verification */}
              <Route
                path="/super-admin/verify"
                element={
                  <ProtectedRoute requiredRole="super_admin">
                    <SuperAdminPinVerification />
                  </ProtectedRoute>
                }
              />

              {/* Super Admin Pages - Protected with PIN */}
              <Route
                path="/super-admin/dashboard"
                element={
                  <SuperAdminRoute>
                    <MainLayout>
                      <SuperAdminDashboard />
                    </MainLayout>
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/super-admin/companies"
                element={
                  <SuperAdminRoute>
                    <MainLayout>
                      <SuperAdminCompanies />
                    </MainLayout>
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/super-admin/subscriptions"
                element={
                  <SuperAdminRoute>
                    <MainLayout>
                      <SuperAdminSubscriptions />
                    </MainLayout>
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/super-admin/invoices"
                element={
                  <SuperAdminRoute>
                    <MainLayout>
                      <SuperAdminInvoices />
                    </MainLayout>
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/super-admin/addons"
                element={
                  <SuperAdminRoute>
                    <MainLayout>
                      <SuperAdminAddons />
                    </MainLayout>
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/super-admin/analytics"
                element={
                  <SuperAdminRoute>
                    <MainLayout>
                      <SuperAdminAnalytics />
                    </MainLayout>
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/super-admin/companies/:id"
                element={
                  <SuperAdminRoute>
                    <MainLayout>
                      <SuperAdminCompanyDetail />
                    </MainLayout>
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/super-admin/users"
                element={
                  <SuperAdminRoute>
                    <MainLayout>
                      <SuperAdminUsers />
                    </MainLayout>
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/super-admin/system-logs"
                element={
                  <SuperAdminRoute>
                    <MainLayout>
                      <SuperAdminSystemLogs />
                    </MainLayout>
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/super-admin/security"
                element={
                  <SuperAdminRoute>
                    <MainLayout>
                      <SuperAdminSecurity />
                    </MainLayout>
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/super-admin/admin-actions"
                element={
                  <SuperAdminRoute>
                    <MainLayout>
                      <SuperAdminAdminActions />
                    </MainLayout>
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/super-admin/support"
                element={
                  <SuperAdminRoute>
                    <MainLayout>
                      <SuperAdminSupport />
                    </MainLayout>
                  </SuperAdminRoute>
                }
              />

              {/* Authenticated pages wrapped with shared MainLayout (sidebar) */}
              <Route
                path="/dashboard"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="dashboard">
                      <Dashboard />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/setup-company"
                element={
                  <MainLayout>
                    <ProtectedRoute>
                      <SetupCompany />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/employees"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="employees">
                      <Employees />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/employees/:id"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="employees">
                      <EmployeeProfile />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/activity-groups"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="riskAssessments">
                      <ActivityGroups />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/risk-assessments"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="riskAssessments">
                      <RiskAssessments />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/measures"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="riskAssessments">
                      <Measures />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/audits"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="audits">
                      <Audits />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/audits/:id"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="audits">
                      <AuditDetails />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/tasks"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="dashboard">
                      <Tasks />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/training"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="trainings">
                      <Training />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/training/:courseId"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="trainings">
                      <Training />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/training/:courseId/lesson/:lessonId"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="trainings">
                      <LessonEditor />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/training/:courseId/lesson/:lessonId/view"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="trainings">
                      <LessonViewer />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/incidents"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="incidents">
                      <Incidents />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/investigations"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="investigations">
                      <Investigations />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/messages"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="dashboard">
                      <Messages />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/documents"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="documents">
                      <Documents />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/reports"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="reports">
                      <Reports />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/settings"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="settings">
                      <Settings />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/profile"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="dashboard">
                      <Profile />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/invoices"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="dashboard">
                      <Invoices />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />
              <Route
                path="/notifications"
                element={
                  <MainLayout>
                    <ProtectedRoute requiredPermission="dashboard">
                      <Notifications />
                    </ProtectedRoute>
                  </MainLayout>
                }
              />

              {/* Public Routes (no authentication required) */}
              <Route path="/notes/:token" element={<PublicNotes />} />
              <Route path="/invite/:token" element={<AcceptInvitation />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </GlobalErrorBoundary>
          </AuthProvider>
          </LanguageProvider>
        </CookieConsentProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
