import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Shield,
  Users,
  FileCheck,
  AlertTriangle,
  LogOut,
  MessageSquare,
  CheckCircle,
  BarChart,
  User,
  Receipt,
  Moon,
  Sun,
  Settings,
  ChevronDown,
  Building2,
  Globe,
  Package,
  Puzzle,
  LayoutDashboard,
  BarChart3,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/usePermissions";
import NotificationBell from "@/components/NotificationBell";

type Props = {
  children: ReactNode;
};

export default function MainLayout({ children }: Props) {
  const { userRole, signOut, companyName } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { hasPermission, loading: permissionsLoading, roleName, permissions } = usePermissions();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);

  // Log permissions state in dev for debugging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("[MainLayout] Permissions loading:", permissionsLoading);
      console.log("[MainLayout] Role:", roleName);
      console.log("[MainLayout] Current permissions:", permissions);
    }
  }, [permissionsLoading, roleName, permissions]);

  useEffect(() => {
    const isDark = localStorage.getItem("darkMode") === "true";
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("darkMode", String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const getLinkClasses = (path: string) => {
    return isActive(path)
      ? "flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium transition-colors text-sm"
      : "flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm";
  };

  const shouldShowMeasuresSubmenu = () => {
    return userRole === "super_admin" || userRole === "company_admin";
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen sticky top-0">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <Link to={userRole === "super_admin" ? "/super-admin/dashboard" : "/dashboard"} className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-green-600 rounded-xl blur opacity-25"></div>
              <img
                src="/logo.png"
                alt="SafetyHub Logo"
                className="h-8 w-8 relative z-10"
              />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Safety hub
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto no-scrollbar">
          {/* Show loading skeleton while permissions load */}
          {permissionsLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-9 bg-gray-100 dark:bg-gray-800 rounded-lg" />
              ))}
            </div>
          ) : userRole === "super_admin" ? (
            /* Super Admin Only Menu - Complete Navigation */
            <div className="space-y-0.5">
              <p className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Super Admin
              </p>
              <Link to="/super-admin/dashboard" className={getLinkClasses("/super-admin/dashboard")}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <Link to="/super-admin/companies" className={getLinkClasses("/super-admin/companies")}>
                <Building2 className="w-4 h-4" />
                <span>Companies</span>
              </Link>
              <Link to="/super-admin/users" className={getLinkClasses("/super-admin/users")}>
                <Users className="w-4 h-4" />
                <span>Users</span>
              </Link>
              <Link to="/super-admin/subscriptions" className={getLinkClasses("/super-admin/subscriptions")}>
                <Package className="w-4 h-4" />
                <span>Subscriptions & Billing</span>
              </Link>              <Link to="/super-admin/invoices" className={getLinkClasses("/super-admin/invoices")}>
                <Receipt className="w-4 h-4" />
                <span>Invoices</span>
              </Link>              <Link to="/super-admin/addons" className={getLinkClasses("/super-admin/addons")}>
                <Puzzle className="w-4 h-4" />
                <span>Add-ons</span>
              </Link>
              <Link to="/super-admin/analytics" className={getLinkClasses("/super-admin/analytics")}>
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </Link>
              <Link to="/super-admin/system-logs" className={getLinkClasses("/super-admin/system-logs")}>
                <FileCheck className="w-4 h-4" />
                <span>System & Logs</span>
              </Link>
              <Link to="/super-admin/security" className={getLinkClasses("/super-admin/security")}>
                <Shield className="w-4 h-4" />
                <span>Security</span>
              </Link>
              <Link to="/super-admin/admin-actions" className={getLinkClasses("/super-admin/admin-actions")}>
                <Zap className="w-4 h-4" />
                <span>Admin</span>
              </Link>
              <Link to="/super-admin/support" className={getLinkClasses("/super-admin/support")}>
                <MessageSquare className="w-4 h-4" />
                <span>Support</span>
              </Link>
            </div>
          ) : (
            /* Regular Company User Menu */
            <div className="space-y-0.5">
              {hasPermission("dashboard") && (
                <Link to="/dashboard" className={getLinkClasses("/dashboard")}>
                  <BarChart className="w-4 h-4" />
                  <span>{t("nav.dashboard")}</span>
                </Link>
              )}

              {hasPermission("employees") && (
                <Link to="/employees" className={getLinkClasses("/employees")}>
                  <Users className="w-4 h-4" />
                  <span>{t("nav.employees")}</span>
                </Link>
              )}

              {hasPermission("investigations") && (
                <Link
                  to="/investigations"
                  className={getLinkClasses("/investigations")}
                >
                  <Shield className="w-4 h-4" />
                  <span>{t("nav.investigations")}</span>
                </Link>
              )}

              {hasPermission("riskAssessments") && (
                <Link
                  to="/risk-assessments"
                  className={getLinkClasses("/risk-assessments")}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>{t("nav.riskAssessments")}</span>
                </Link>
              )}

              {hasPermission("trainings") && (
                <Link to="/training" className={getLinkClasses("/training")}>
                  <CheckCircle className="w-4 h-4" />
                  <span>{t("nav.trainings")}</span>
                </Link>
              )}

              {hasPermission("incidents") && (
                <Link to="/incidents" className={getLinkClasses("/incidents")}>
                  <AlertTriangle className="w-4 h-4" />
                  <span>{t("nav.incidents")}</span>
                </Link>
              )}

              {hasPermission("audits") && (
                <Link to="/audits" className={getLinkClasses("/audits")}>
                  <FileCheck className="w-4 h-4" />
                  <span>{t("nav.audits")}</span>
                </Link>
              )}

              {hasPermission("reports") && (
                <Link to="/reports" className={getLinkClasses("/reports")}>
                  <BarChart className="w-4 h-4" />
                  <span>{t("nav.reports")}</span>
                </Link>
              )}

              {hasPermission("settings") && (
                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-800">
                  <Link to="/settings" className={getLinkClasses("/settings")}>
                    <Settings className="w-4 h-4" />
                    <span>{t("nav.settings")}</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Building2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                <span>{companyName || "Company"}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                <span>{roleName || (userRole ? userRole.replace("_", " ") : "User")}</span>
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={signOut}
            className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-700 dark:hover:text-red-300 text-sm h-9"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span>{t("nav.logout")}</span>
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white"></h2>

            <div className="flex items-center gap-4">
              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold">
                      <span>{companyName?.charAt(0) || "U"}</span>
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <Link to="/profile">
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={toggleDarkMode}
                  >
                    {darkMode ? (
                      <Sun className="w-4 h-4 mr-2" />
                    ) : (
                      <Moon className="w-4 h-4 mr-2" />
                    )}
                    Dark mode
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer justify-between"
                    onClick={() => setLanguage(language === "en" ? "de" : "en")}
                  >
                    <div className="flex items-center">
                      <Globe className="w-4 h-4 mr-2" />
                      Language
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {language === "en" ? "EN" : "DE"}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="cursor-pointer text-red-600 dark:text-red-400"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
