import { Users, AlertTriangle, ClipboardCheck, GraduationCap, Shield, Activity, CheckSquare, ListChecks, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportConfig } from "./ReportBuilder";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReportLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (config: Partial<ReportConfig>) => void;
  existingReports?: ReportConfig[];
  onDuplicateReport?: (config: ReportConfig) => void;
}

function useReportTemplates(t: (key: string) => string) {
  return [
    {
      category: "Mitarbeiter",
      icon: <Users className="w-5 h-5" />,
      color: "bg-blue-50 text-blue-600",
      reports: [
        { title: "Mitarbeiter nach Abteilung", metric: "employees", groupBy: "department", chartType: "bar" as const, description: "Verteilung der Mitarbeiter auf Abteilungen" },
        { title: "Mitarbeiterwachstum", metric: "employees", groupBy: "created_at", chartType: "line" as const, description: "Neueintritte im Zeitverlauf" },
        { title: "Mitarbeiter nach Tag", metric: "employees", groupBy: "tag", chartType: "pie" as const, description: "Mitarbeiter-Tags als Kreisdiagramm" },
      ],
    },
    {
      category: "Vorfälle",
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "bg-red-50 text-red-600",
      reports: [
        { title: "Vorfälle nach Status", metric: "incidents", groupBy: "investigation_status", chartType: "pie" as const, description: "Offen / In Bearbeitung / Geschlossen" },
        { title: "Vorfälle nach Kategorie", metric: "incidents", groupBy: "incident_type", chartType: "bar" as const, description: "Unfall, Beinaheunfall, Gefährdung etc." },
        { title: "Vorfälle nach Schweregrad", metric: "incidents", groupBy: "severity", chartType: "bar" as const, description: "Kritisch / Hoch / Mittel / Niedrig" },
        { title: "Vorfälle nach Abteilung", metric: "incidents", groupBy: "department", chartType: "bar" as const, description: "Abteilungsweise Vorfallshäufigkeit" },
        { title: "Vorfälle im Zeitverlauf", metric: "incidents", groupBy: "created_at", chartType: "line" as const, description: "Monatliche Vorfallsentwicklung" },
      ],
    },
    {
      category: "Gefährdungsbeurteilungen",
      icon: <Shield className="w-5 h-5" />,
      color: "bg-orange-50 text-orange-600",
      reports: [
        { title: "GBUs nach Risikoniveau", metric: "risks", groupBy: "risk_level", chartType: "pie" as const, description: "Niedrig / Mittel / Hoch / Kritisch" },
        { title: "GBUs nach Abteilung", metric: "risks", groupBy: "department", chartType: "bar" as const, description: "Abteilungsweise GBU-Verteilung" },
        { title: "GBU-Freigabestatus", metric: "risks", groupBy: "approval_status", chartType: "pie" as const, description: "Genehmigt / Ausstehend / Abgelehnt" },
      ],
    },
    {
      category: "Audits",
      icon: <ClipboardCheck className="w-5 h-5" />,
      color: "bg-indigo-50 text-indigo-600",
      reports: [
        { title: "Audits nach ISO-Norm", metric: "audits", groupBy: "iso_code", chartType: "bar" as const, description: "ISO 9001, 14001, 45001 etc." },
        { title: "Audit-Abschlussstatus", metric: "audits", groupBy: "status", chartType: "pie" as const, description: "Abgeschlossen / Offen / Geplant" },
        { title: "Audits im Zeitverlauf", metric: "audits", groupBy: "created_at", chartType: "line" as const, description: "Monatliche Audit-Entwicklung" },
        { title: "Audits nach Kategorie", metric: "audits", groupBy: "category", chartType: "bar" as const, description: "Interner / Externer Audit" },
      ],
    },
    {
      category: "Schulungen",
      icon: <GraduationCap className="w-5 h-5" />,
      color: "bg-green-50 text-green-600",
      reports: [
        { title: "Compliance nach Mitarbeiter", metric: "trainings", groupBy: "employee_id", chartType: "bar" as const, description: "Schulungserfüllungsgrad je Person" },
        { title: "Abgeschlossen vs. Ausstehend", metric: "trainings", groupBy: "status", chartType: "pie" as const, description: "Status-Übersicht aller Schulungen" },
        { title: "Schulungen im Zeitverlauf", metric: "trainings", groupBy: "created_at", chartType: "line" as const, description: "Monatliche Schulungsentwicklung" },
      ],
    },
    {
      category: "Maßnahmen",
      icon: <CheckSquare className="w-5 h-5" />,
      color: "bg-teal-50 text-teal-600",
      reports: [
        { title: "Maßnahmen nach Status", metric: "measures", groupBy: "status", chartType: "pie" as const, description: "Offen / In Bearbeitung / Abgeschlossen" },
        { title: "Maßnahmen nach Abteilung", metric: "measures", groupBy: "department", chartType: "bar" as const, description: "Abteilungsweise Maßnahmenbelastung" },
      ],
    },
    {
      category: "Aufgaben",
      icon: <ListChecks className="w-5 h-5" />,
      color: "bg-purple-50 text-purple-600",
      reports: [
        { title: "Aufgaben nach Status", metric: "tasks", groupBy: "status", chartType: "pie" as const, description: "Offen / In Bearbeitung / Abgeschlossen" },
        { title: "Aufgaben im Zeitverlauf", metric: "tasks", groupBy: "created_at", chartType: "line" as const, description: "Monatliche Aufgabenentwicklung" },
      ],
    },
    {
      category: "G-Untersuchungen",
      icon: <Activity className="w-5 h-5" />,
      color: "bg-pink-50 text-pink-600",
      reports: [
        { title: "Untersuchungen nach Status", metric: "checkups", groupBy: "status", chartType: "pie" as const, description: "Anstehend / Abgeschlossen / Fällig" },
        { title: "Untersuchungen im Zeitverlauf", metric: "checkups", groupBy: "created_at", chartType: "line" as const, description: "Monatliche Untersuchungsentwicklung" },
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
      dateProperty: template.metric === "incidents" || template.metric === "risks" ? (template.metric === "incidents" ? "incident_date" : "assessment_date") : "created_at",
      dateRange: { type: "last_30_days" },
      sortBy: "value",
    });
  };

  const chartTypeLabel = (ct: string) => {
    if (ct === "pie") return "Kreis";
    if (ct === "line") return "Linie";
    return "Balken";
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Bericht hinzufügen</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Wähle eine Vorlage aus ({REPORT_TEMPLATES.reduce((s, c) => s + c.reports.length, 0)} verfügbar)
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>Schließen</Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {REPORT_TEMPLATES.map((category) => (
                <div key={category.category}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-8 h-8 rounded-lg ${category.color} flex items-center justify-center`}>
                      {category.icon}
                    </div>
                    <h3 className="text-base font-semibold">{category.category}</h3>
                    <span className="text-xs text-muted-foreground">({category.reports.length} Vorlagen)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {category.reports.map((report) => (
                      <Card
                        key={report.title}
                        className="cursor-pointer hover:shadow-md transition-all border hover:border-primary group"
                        onClick={() => handleSelectTemplate(report)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm leading-tight pr-2">{report.title}</h4>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                          </div>
                          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                            {report.description}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {chartTypeLabel(report.chartType)}diagramm
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
