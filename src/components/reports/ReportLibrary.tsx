import { Grid3x3, Users, AlertTriangle, ClipboardCheck, GraduationCap, Shield, Activity, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReportConfig } from "./ReportBuilder";

interface ReportLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (config: Partial<ReportConfig>) => void;
}

const REPORT_TEMPLATES = [
  {
    category: "Mitarbeiter",
    icon: <Users className="w-5 h-5" />,
    reports: [
      {
        title: "Mitarbeiter nach Abteilung",
        metric: "employees",
        groupBy: "department",
        chartType: "bar" as const,
        description: "Mitarbeiterverteilung auf Abteilungen",
      },
      {
        title: "Mitarbeiter im Zeitverlauf",
        metric: "employees",
        groupBy: "created_at",
        chartType: "line" as const,
        description: "Wachstumstrend der Belegschaft",
      },
    ],
  },
  {
    category: "Vorfälle",
    icon: <AlertTriangle className="w-5 h-5" />,
    reports: [
      {
        title: "Vorfälle nach Status",
        metric: "incidents",
        groupBy: "investigation_status",
        chartType: "pie" as const,
        description: "Übersicht der Vorfallsstatus",
      },
      {
        title: "Vorfälle nach Kategorie",
        metric: "incidents",
        groupBy: "incident_type",
        chartType: "bar" as const,
        description: "Aufschlüsselung nach Vorfallstyp",
      },
    ],
  },
  {
    category: "Audits",
    icon: <ClipboardCheck className="w-5 h-5" />,
    reports: [
      {
        title: "Audits nach ISO-Norm",
        metric: "audits",
        groupBy: "iso_code",
        chartType: "bar" as const,
        description: "Verteilung der Auditnormen",
      },
      {
        title: "Abschlussstatus",
        metric: "audits",
        groupBy: "status",
        chartType: "pie" as const,
        description: "Abschlussquote der Audits",
      },
      {
        title: "Audit-Zeitlinie",
        metric: "audits",
        groupBy: "created_at",
        chartType: "line" as const,
        description: "Audit-Aktivität im Zeitverlauf",
      },
    ],
  },
  {
    category: "Schulungen",
    icon: <GraduationCap className="w-5 h-5" />,
    reports: [
      {
        title: "Schulungscompliance je Mitarbeiter",
        metric: "trainings",
        groupBy: "employee_id",
        chartType: "bar" as const,
        description: "Individuelle Schulungsabschlussquoten",
      },
      {
        title: "Abgeschlossen vs. Ausstehend",
        metric: "trainings",
        groupBy: "status",
        chartType: "pie" as const,
        description: "Übersicht der Schulungsstatus",
      },
      {
        title: "Schulungstrends",
        metric: "trainings",
        groupBy: "created_at",
        chartType: "line" as const,
        description: "Schulungsaktivität im Zeitverlauf",
      },
    ],
  },
  {
    category: "Gefährdungsbeurteilungen",
    icon: <Shield className="w-5 h-5" />,
    reports: [
      {
        title: "Risiken nach Stufe",
        metric: "risks",
        groupBy: "risk_level",
        chartType: "pie" as const,
        description: "Verteilung nach Risikoschwere",
      },
      {
        title: "Risiken nach Abteilung",
        metric: "risks",
        groupBy: "department",
        chartType: "bar" as const,
        description: "Risikoexposition je Abteilung",
      },
      {
        title: "GBU-Freigabestatus",
        metric: "risks",
        groupBy: "approval_status",
        chartType: "pie" as const,
        description: "Freigabe-Workflow der GBUs",
      },
    ],
  },
  {
    category: "Maßnahmen",
    icon: <CheckSquare className="w-5 h-5" />,
    reports: [
      {
        title: "Maßnahmen nach Status",
        metric: "measures",
        groupBy: "status",
        chartType: "pie" as const,
        description: "Fortschrittsübersicht der Maßnahmen",
      },
      {
        title: "Maßnahmen nach Abteilung",
        metric: "measures",
        groupBy: "department",
        chartType: "bar" as const,
        description: "Maßnahmenverteilung auf Abteilungen",
      },
    ],
  },
  {
    category: "G-Untersuchungen",
    icon: <Activity className="w-5 h-5" />,
    reports: [
      {
        title: "Untersuchungsstatus",
        metric: "checkups",
        groupBy: "status",
        chartType: "pie" as const,
        description: "Abschlussquote der G-Untersuchungen",
      },
      {
        title: "Untersuchungen im Zeitverlauf",
        metric: "checkups",
        groupBy: "created_at",
        chartType: "line" as const,
        description: "Aktivitätstrends der Untersuchungen",
      },
    ],
  },
];

export default function ReportLibrary({
  isOpen,
  onClose,
  onSelectTemplate,
}: ReportLibraryProps) {
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
              <h2 className="text-2xl font-bold">Berichtvorlagen</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Wählen Sie eine vorgefertigte Berichtvorlage, um zu beginnen
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              Schließen
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
                          Letzte 30 Tage
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
