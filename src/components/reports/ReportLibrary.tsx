import { Grid3x3, Users, AlertTriangle, ClipboardCheck, GraduationCap, Shield, Activity, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReportConfig } from "./ReportBuilder";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReportLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (config: Partial<ReportConfig>) => void;
}

function useReportTemplates(t: (key: string) => string) {
  return [
    {
      category: t("reports.library.category.employees"),
      icon: <Users className="w-5 h-5" />,
      reports: [
        {
          title: t("reports.library.employeesByDepartment.title"),
          metric: "employees",
          groupBy: "department",
          chartType: "bar" as const,
          description: t("reports.library.employeesByDepartment.description"),
        },
        {
          title: t("reports.library.employeesOverTime.title"),
          metric: "employees",
          groupBy: "created_at",
          chartType: "line" as const,
          description: t("reports.library.employeesOverTime.description"),
        },
      ],
    },
    {
      category: t("reports.library.category.incidents"),
      icon: <AlertTriangle className="w-5 h-5" />,
      reports: [
        {
          title: t("reports.library.incidentsByStatus.title"),
          metric: "incidents",
          groupBy: "investigation_status",
          chartType: "pie" as const,
          description: t("reports.library.incidentsByStatus.description"),
        },
        {
          title: t("reports.library.incidentsByCategory.title"),
          metric: "incidents",
          groupBy: "incident_type",
          chartType: "bar" as const,
          description: t("reports.library.incidentsByCategory.description"),
        },
      ],
    },
    {
      category: t("reports.library.category.audits"),
      icon: <ClipboardCheck className="w-5 h-5" />,
      reports: [
        {
          title: t("reports.library.auditsByIso.title"),
          metric: "audits",
          groupBy: "iso_code",
          chartType: "bar" as const,
          description: t("reports.library.auditsByIso.description"),
        },
        {
          title: t("reports.library.auditsCompletionStatus.title"),
          metric: "audits",
          groupBy: "status",
          chartType: "pie" as const,
          description: t("reports.library.auditsCompletionStatus.description"),
        },
        {
          title: t("reports.library.auditsTimeline.title"),
          metric: "audits",
          groupBy: "created_at",
          chartType: "line" as const,
          description: t("reports.library.auditsTimeline.description"),
        },
      ],
    },
    {
      category: t("reports.library.category.trainings"),
      icon: <GraduationCap className="w-5 h-5" />,
      reports: [
        {
          title: t("reports.library.trainingComplianceByEmployee.title"),
          metric: "trainings",
          groupBy: "employee_id",
          chartType: "bar" as const,
          description: t("reports.library.trainingComplianceByEmployee.description"),
        },
        {
          title: t("reports.library.trainingCompletedVsPending.title"),
          metric: "trainings",
          groupBy: "status",
          chartType: "pie" as const,
          description: t("reports.library.trainingCompletedVsPending.description"),
        },
        {
          title: t("reports.library.trainingTrends.title"),
          metric: "trainings",
          groupBy: "created_at",
          chartType: "line" as const,
          description: t("reports.library.trainingTrends.description"),
        },
      ],
    },
    {
      category: t("reports.library.category.riskAssessments"),
      icon: <Shield className="w-5 h-5" />,
      reports: [
        {
          title: t("reports.library.risksByLevel.title"),
          metric: "risks",
          groupBy: "risk_level",
          chartType: "pie" as const,
          description: t("reports.library.risksByLevel.description"),
        },
        {
          title: t("reports.library.risksByDepartment.title"),
          metric: "risks",
          groupBy: "department",
          chartType: "bar" as const,
          description: t("reports.library.risksByDepartment.description"),
        },
        {
          title: t("reports.library.risksApprovalStatus.title"),
          metric: "risks",
          groupBy: "approval_status",
          chartType: "pie" as const,
          description: t("reports.library.risksApprovalStatus.description"),
        },
      ],
    },
    {
      category: t("reports.library.category.measures"),
      icon: <CheckSquare className="w-5 h-5" />,
      reports: [
        {
          title: t("reports.library.measuresByStatus.title"),
          metric: "measures",
          groupBy: "status",
          chartType: "pie" as const,
          description: t("reports.library.measuresByStatus.description"),
        },
        {
          title: t("reports.library.measuresByDepartment.title"),
          metric: "measures",
          groupBy: "department",
          chartType: "bar" as const,
          description: t("reports.library.measuresByDepartment.description"),
        },
      ],
    },
    {
      category: t("reports.library.category.checkups"),
      icon: <Activity className="w-5 h-5" />,
      reports: [
        {
          title: t("reports.library.checkupsStatus.title"),
          metric: "checkups",
          groupBy: "status",
          chartType: "pie" as const,
          description: t("reports.library.checkupsStatus.description"),
        },
        {
          title: t("reports.library.checkupsOverTime.title"),
          metric: "checkups",
          groupBy: "created_at",
          chartType: "line" as const,
          description: t("reports.library.checkupsOverTime.description"),
        },
      ],
    },
  ];
}

export default function ReportLibrary({
  isOpen,
  onClose,
  onSelectTemplate,
}: ReportLibraryProps) {
  const { t } = useLanguage();
  const REPORT_TEMPLATES = useReportTemplates(t);
  if (!isOpen) return null;

  const handleSelectTemplate = (template: any) => {
    onSelectTemplate({
      title: template.title,
      metric: template.metric,
      groupBy: template.groupBy,
      chartType: template.chartType,
      dateProperty: "created_at",
      dateRange: { type: "last_30_days" },
      sortBy: "value",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{t("reports.library.title")}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("reports.library.subtitle")}
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              {t("reports.library.close")}
            </Button>
          </div>
        </div>

        {/* Report Categories */}
        <div className="p-6 space-y-8">
          {REPORT_TEMPLATES.map((category) => (
            <div key={category.category}>
              <div className="flex items-center gap-2 mb-4">
                {category.icon}
                <h3 className="text-lg font-semibold">{category.category}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.reports.map((report) => (
                  <Card
                    key={report.title}
                    className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                    onClick={() => handleSelectTemplate(report)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{report.title}</h4>
                        <Grid3x3 className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {report.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs">

                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          {t("reports.library.last30Days")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
