export interface ReportStats {
  totalEmployees: number;
  totalRiskAssessments: number;
  totalAudits: number;
  totalTasks: number;
  totalIncidents: number;
  totalMeasures: number;
  totalTrainings: number;
  totalCheckUps: number;
  completedAudits: number;
  completedTasks: number;
  completedMeasures: number;
  completedCheckUps: number;
  openIncidents: number;
  reportableIncidents: number;
  trainingCompliance: number;
}

export interface TrainingStatus {
  employee_name: string;
  total_required: number;
  completed: number;
  expired: number;
  compliance_rate: number;
}

export interface NavSection {
  id: string;
  name: string;
  icon: React.ReactNode;
}

export const STATUS_COLORS: Record<string, string> = {
  planned: "#3b82f6",
  open: "#3b82f6",
  in_progress: "#f59e0b",
  pending: "#f59e0b",
  completed: "#10b981",
  done: "#10b981",
  cancelled: "#6b7280",
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
  very_high: "#991b1b",
  unknown: "#9ca3af",
};

export const CHART_COLOR_PALETTE = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#991b1b"];

export const getStatusColor = (key: string, index: number) =>
  STATUS_COLORS[(key || "").toLowerCase()] || CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length];

export const formatStatusLabel = (key: string) =>
  (key || "Unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
