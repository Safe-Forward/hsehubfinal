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
import Employees from "./pages/Employees";
import EmployeeProfile from "./pages/EmployeeProfile";
import ActivityGroups from "./pages/ActivityGroups";
import RiskAssessments from "./pages/RiskAssessments";
import Measures from "./pages/Measures";
import Audits from "./pages/Audits";
import AuditDetails from "./pages/AuditDetails";
import Tasks from "./pages/Tasks";
import Training from "./pages/Training";
import LessonEditor from "./pages/LessonEditor";
import LessonViewer from "./pages/LessonViewer";
import Incidents from "./pages/Incidents";
import Investigations from "./pages/Investigations";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Invoices from "./pages/Invoices";
import SetupCompany from "./pages/SetupCompany";
import Messages from "./pages/Messages";
import Documents from "./pages/Documents";
import Reports from "./pages/Reports";
import CompanyRegistration from "./pages/CompanyRegistration";
import SuperAdminDashboard from "./pages/SuperAdmin/Dashboard";
import SuperAdminCompanies from "./pages/SuperAdmin/Companies";
import SuperAdminSubscriptions from "./pages/SuperAdmin/Subscriptions";
import SuperAdminInvoices from "./pages/SuperAdmin/Invoices";
import SuperAdminAddons from "./pages/SuperAdmin/Addons";
import SuperAdminAnalytics from "./pages/SuperAdmin/Analytics";
import SuperAdminPinVerification from "./pages/SuperAdmin/PinVerification";
import SuperAdminCompanyDetail from "./pages/SuperAdmin/CompanyDetail";
import SuperAdminUsers from "./pages/SuperAdmin/Users";
import SuperAdminSystemLogs from "./pages/SuperAdmin/SystemLogs";
import SuperAdminSecurity from "./pages/SuperAdmin/Security";
import SuperAdminAdminActions from "./pages/SuperAdmin/AdminActions";
import SuperAdminSupport from "./pages/SuperAdmin/Support";
import AuthDebug from "./pages/AuthDebug";
import NotFound from "./pages/NotFound";
import PublicNotes from "./pages/PublicNotes";
import Notifications from "./pages/Notifications";
import AcceptInvitation from "./pages/AcceptInvitation";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import MainLayout from "./components/MainLayout";
import SuperAdminRoute from "./components/SuperAdminRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
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
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
