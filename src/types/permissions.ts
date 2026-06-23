// Detailed Permission Types for Enhanced RBAC System
// This file defines the granular permission structure matching the database schema

export interface StandardPermissions {
  collaborate_on_cases: boolean;
  assign_to_teams: boolean;
}

export interface EmployeePermissions {
  view_all: boolean;
  view_own_department: boolean;
  manage: boolean;
  delete: boolean;
  share_profiles: boolean;
}

export interface HealthExaminationPermissions {
  view_all: boolean;
  view_team: boolean;
  view_own: boolean;
  create_edit: boolean;
  medical_evaluations: boolean;
  delete: boolean;
}

export interface DocumentPermissions {
  view: boolean;
  upload: boolean;
  edit: boolean;
  delete: boolean;
}

export interface AuditPermissions {
  view: boolean;
  create_edit: boolean;
  assign_corrective_actions: boolean;
  close_feedback: boolean;
}

export interface ReportPermissions {
  view: boolean;
  create_dashboards: boolean;
  export_data: boolean;
}

export interface SettingsPermissions {
  company_location: boolean;
  user_role_management: boolean;
  gdpr_data_protection: boolean;
  templates_custom_fields: boolean;
  subscription_billing: boolean;
}

export interface InvestigationPermissions {
  view: boolean;
  create_edit: boolean;
  delete: boolean;
}

export interface TrainingPermissions {
  view: boolean;
  manage: boolean;
  issue_certificates: boolean;
  delete: boolean;
}

export interface RiskAssessmentPermissions {
  view: boolean;
  create_edit: boolean;
  approve: boolean;
  delete: boolean;
}

export interface IncidentPermissions {
  view: boolean;
  create_edit: boolean;
  assign: boolean;
  delete: boolean;
}

export interface MeasurePermissions {
  view: boolean;
  create_edit: boolean;
  close: boolean;
  delete: boolean;
}

export interface DetailedPermissions {
  standard: StandardPermissions;
  employees: EmployeePermissions;
  health_examinations: HealthExaminationPermissions;
  investigations: InvestigationPermissions;
  documents: DocumentPermissions;
  trainings: TrainingPermissions;
  risk_assessments: RiskAssessmentPermissions;
  incidents: IncidentPermissions;
  measures: MeasurePermissions;
  audits: AuditPermissions;
  reports: ReportPermissions;
  settings: SettingsPermissions;
}

export interface CustomRole {
  id: string;
  company_id: string;
  role_name: string;
  permissions: Record<string, boolean>; // Legacy permissions
  detailed_permissions: DetailedPermissions;
  description?: string;
  display_order: number;
  is_predefined: boolean;
  created_at: string;
  updated_at: string;
}

// Permission category keys for iteration
export type PermissionCategory = keyof DetailedPermissions;

// All permission categories with their display names and descriptions
export const PERMISSION_CATEGORIES: Record<PermissionCategory, { label: string; labelDe: string; description: string; descriptionDe: string }> = {
  standard: {
    label: 'Standard',
    labelDe: 'Standard',
    description: 'Basic collaboration permissions',
    descriptionDe: 'Grundlegende Zusammenarbeitsberechtigungen'
  },
  employees: {
    label: 'Employees',
    labelDe: 'Mitarbeiter',
    description: 'Employee data access and management',
    descriptionDe: 'Mitarbeiterdaten Zugriff und Verwaltung'
  },
  health_examinations: {
    label: 'Health Examinations',
    labelDe: 'Vorsorgeuntersuchungen',
    description: 'Medical examination records and evaluations',
    descriptionDe: 'Medizinische Untersuchungsaufzeichnungen und Bewertungen'
  },
  investigations: {
    label: 'Investigations',
    labelDe: 'Untersuchungen',
    description: 'G-Untersuchungen management',
    descriptionDe: 'G-Untersuchungen verwalten'
  },
  documents: {
    label: 'Documents',
    labelDe: 'Dokumente',
    description: 'Document management and sharing',
    descriptionDe: 'Dokumentenverwaltung und -freigabe'
  },
  trainings: {
    label: 'Trainings',
    labelDe: 'Schulungen',
    description: 'Training courses and certificates',
    descriptionDe: 'Schulungskurse und Zertifikate'
  },
  risk_assessments: {
    label: 'Risk Assessments',
    labelDe: 'Risikobewertungen',
    description: 'GBU / risk assessments and approval',
    descriptionDe: 'Gefährdungsbeurteilungen und Freigabe'
  },
  incidents: {
    label: 'Incidents',
    labelDe: 'Vorfälle',
    description: 'Incident reporting and assignment',
    descriptionDe: 'Vorfallmeldung und Zuweisung'
  },
  measures: {
    label: 'Measures',
    labelDe: 'Maßnahmen',
    description: 'Corrective and preventive measures',
    descriptionDe: 'Korrektur- und Präventivmaßnahmen'
  },
  audits: {
    label: 'Audits',
    labelDe: 'Audits',
    description: 'Audit management and corrective actions',
    descriptionDe: 'Auditverwaltung und Korrekturmaßnahmen'
  },
  reports: {
    label: 'Reports',
    labelDe: 'Berichte',
    description: 'Analytics, dashboards and data export',
    descriptionDe: 'Analysen, Dashboards und Datenexport'
  },
  settings: {
    label: 'Settings',
    labelDe: 'Einstellungen',
    description: 'System configuration and administration',
    descriptionDe: 'Systemkonfiguration und Administration'
  }
};

// Individual permission definitions with labels
export const PERMISSION_DEFINITIONS: Record<PermissionCategory, Record<string, { label: string; labelDe: string; description: string; descriptionDe: string }>> = {
  standard: {
    collaborate_on_cases: {
      label: 'Collaborate on cases',
      labelDe: 'An Fällen zusammenarbeiten',
      description: 'Add notes and comments to cases',
      descriptionDe: 'Notizen und Kommentare zu Fällen hinzufügen'
    },
    assign_to_teams: {
      label: 'Assign to teams / departments',
      labelDe: 'Teams / Abteilungen zuweisen',
      description: 'Assign items to teams and departments',
      descriptionDe: 'Elemente Teams und Abteilungen zuweisen'
    }
  },
  employees: {
    view_all: {
      label: 'View all employees',
      labelDe: 'Alle Mitarbeiter anzeigen',
      description: 'Access to view all employee records',
      descriptionDe: 'Zugriff auf alle Mitarbeiterdaten'
    },
    view_own_department: {
      label: 'View employees (own department)',
      labelDe: 'Mitarbeiter anzeigen (eigene Abteilung)',
      description: 'View employees in your department only',
      descriptionDe: 'Nur Mitarbeiter der eigenen Abteilung anzeigen'
    },
    manage: {
      label: 'Manage employees (create/edit)',
      labelDe: 'Mitarbeiter verwalten (erstellen/bearbeiten)',
      description: 'Create and edit employee records',
      descriptionDe: 'Mitarbeiterdaten erstellen und bearbeiten'
    },
    delete: {
      label: 'Delete employees',
      labelDe: 'Mitarbeiter löschen',
      description: 'Permanently delete employee records',
      descriptionDe: 'Mitarbeiterdaten dauerhaft löschen'
    },
    share_profiles: {
      label: 'Share employee profiles (internal)',
      labelDe: 'Mitarbeiterprofile teilen (intern)',
      description: 'Share employee profiles with other team members',
      descriptionDe: 'Mitarbeiterprofile mit anderen Teammitgliedern teilen'
    }
  },
  health_examinations: {
    view_all: {
      label: 'View all examinations',
      labelDe: 'Alle Untersuchungen anzeigen',
      description: 'Access to all medical examination records',
      descriptionDe: 'Zugriff auf alle medizinischen Untersuchungsaufzeichnungen'
    },
    view_team: {
      label: 'View team examinations',
      labelDe: 'Team-Untersuchungen anzeigen',
      description: 'View examinations for team members',
      descriptionDe: 'Untersuchungen von Teammitgliedern anzeigen'
    },
    view_own: {
      label: 'View own examinations',
      labelDe: 'Eigene Untersuchungen anzeigen',
      description: 'View your own examination records',
      descriptionDe: 'Eigene Untersuchungsaufzeichnungen anzeigen'
    },
    create_edit: {
      label: 'Create & edit examinations',
      labelDe: 'Untersuchungen erstellen & bearbeiten',
      description: 'Create and modify examination records',
      descriptionDe: 'Untersuchungsaufzeichnungen erstellen und ändern'
    },
    medical_evaluations: {
      label: 'Medical evaluations',
      labelDe: 'Medizinische Bewertungen',
      description: 'Access to medical evaluation data',
      descriptionDe: 'Zugriff auf medizinische Bewertungsdaten'
    },
    delete: {
      label: 'Delete examinations',
      labelDe: 'Untersuchungen löschen',
      description: 'Permanently delete examination records',
      descriptionDe: 'Untersuchungsaufzeichnungen dauerhaft löschen'
    }
  },
  investigations: {
    view: {
      label: 'View investigations',
      labelDe: 'Untersuchungen anzeigen',
      description: 'Access to view G-Untersuchungen',
      descriptionDe: 'Zugriff auf G-Untersuchungen'
    },
    create_edit: {
      label: 'Create & edit investigations',
      labelDe: 'Untersuchungen erstellen & bearbeiten',
      description: 'Create and modify investigation records',
      descriptionDe: 'Untersuchungen erstellen und bearbeiten'
    },
    delete: {
      label: 'Delete investigations',
      labelDe: 'Untersuchungen löschen',
      description: 'Permanently delete investigation records',
      descriptionDe: 'Untersuchungen dauerhaft löschen'
    }
  },
  documents: {
    view: {
      label: 'View documents',
      labelDe: 'Dokumente anzeigen',
      description: 'Access to view documents',
      descriptionDe: 'Zugriff auf Dokumentenanzeige'
    },
    upload: {
      label: 'Upload documents',
      labelDe: 'Dokumente hochladen',
      description: 'Upload new documents to the system',
      descriptionDe: 'Neue Dokumente in das System hochladen'
    },
    edit: {
      label: 'Edit documents',
      labelDe: 'Dokumente bearbeiten',
      description: 'Modify existing documents',
      descriptionDe: 'Bestehende Dokumente ändern'
    },
    delete: {
      label: 'Delete documents',
      labelDe: 'Dokumente löschen',
      description: 'Permanently delete documents',
      descriptionDe: 'Dokumente dauerhaft löschen'
    }
  },
  trainings: {
    view: {
      label: 'View trainings',
      labelDe: 'Schulungen anzeigen',
      description: 'Access to view training courses',
      descriptionDe: 'Zugriff auf Schulungskurse'
    },
    manage: {
      label: 'Create & manage courses',
      labelDe: 'Kurse erstellen & verwalten',
      description: 'Create, edit and assign training courses',
      descriptionDe: 'Schulungskurse erstellen, bearbeiten und zuweisen'
    },
    issue_certificates: {
      label: 'Issue certificates',
      labelDe: 'Zertifikate ausstellen',
      description: 'Issue completion certificates to employees',
      descriptionDe: 'Abschlusszertifikate an Mitarbeiter ausstellen'
    },
    delete: {
      label: 'Delete trainings',
      labelDe: 'Schulungen löschen',
      description: 'Permanently delete training courses',
      descriptionDe: 'Schulungskurse dauerhaft löschen'
    }
  },
  risk_assessments: {
    view: {
      label: 'View risk assessments',
      labelDe: 'Risikobewertungen anzeigen',
      description: 'Access to view GBU / risk assessments',
      descriptionDe: 'Zugriff auf Gefährdungsbeurteilungen'
    },
    create_edit: {
      label: 'Create & edit risk assessments',
      labelDe: 'Risikobewertungen erstellen & bearbeiten',
      description: 'Create and modify risk assessments',
      descriptionDe: 'Gefährdungsbeurteilungen erstellen und bearbeiten'
    },
    approve: {
      label: 'Approve risk assessments',
      labelDe: 'Risikobewertungen freigeben',
      description: 'Approve or reject submitted risk assessments',
      descriptionDe: 'Eingereichte Gefährdungsbeurteilungen freigeben oder ablehnen'
    },
    delete: {
      label: 'Delete risk assessments',
      labelDe: 'Risikobewertungen löschen',
      description: 'Permanently delete risk assessments',
      descriptionDe: 'Gefährdungsbeurteilungen dauerhaft löschen'
    }
  },
  incidents: {
    view: {
      label: 'View incidents',
      labelDe: 'Vorfälle anzeigen',
      description: 'Access to view incident reports',
      descriptionDe: 'Zugriff auf Vorfallmeldungen'
    },
    create_edit: {
      label: 'Create & edit incidents',
      labelDe: 'Vorfälle erstellen & bearbeiten',
      description: 'Create and modify incident reports',
      descriptionDe: 'Vorfallmeldungen erstellen und bearbeiten'
    },
    assign: {
      label: 'Assign incidents',
      labelDe: 'Vorfälle zuweisen',
      description: 'Assign incidents to team members',
      descriptionDe: 'Vorfälle an Teammitglieder zuweisen'
    },
    delete: {
      label: 'Delete incidents',
      labelDe: 'Vorfälle löschen',
      description: 'Permanently delete incident reports',
      descriptionDe: 'Vorfallmeldungen dauerhaft löschen'
    }
  },
  measures: {
    view: {
      label: 'View measures',
      labelDe: 'Maßnahmen anzeigen',
      description: 'Access to view measures',
      descriptionDe: 'Zugriff auf Maßnahmen'
    },
    create_edit: {
      label: 'Create & edit measures',
      labelDe: 'Maßnahmen erstellen & bearbeiten',
      description: 'Create and modify measures',
      descriptionDe: 'Maßnahmen erstellen und bearbeiten'
    },
    close: {
      label: 'Close measures',
      labelDe: 'Maßnahmen abschließen',
      description: 'Mark measures as completed',
      descriptionDe: 'Maßnahmen als erledigt markieren'
    },
    delete: {
      label: 'Delete measures',
      labelDe: 'Maßnahmen löschen',
      description: 'Permanently delete measures',
      descriptionDe: 'Maßnahmen dauerhaft löschen'
    }
  },
  audits: {
    view: {
      label: 'View audits',
      labelDe: 'Audits anzeigen',
      description: 'Access to view audit records',
      descriptionDe: 'Zugriff auf Auditaufzeichnungen'
    },
    create_edit: {
      label: 'Create & edit audits',
      labelDe: 'Audits erstellen & bearbeiten',
      description: 'Create and modify audit records',
      descriptionDe: 'Auditaufzeichnungen erstellen und ändern'
    },
    assign_corrective_actions: {
      label: 'Assign corrective actions',
      labelDe: 'Korrekturmaßnahmen zuweisen',
      description: 'Assign corrective actions to team members',
      descriptionDe: 'Korrekturmaßnahmen an Teammitglieder zuweisen'
    },
    close_feedback: {
      label: 'Close / feedback on actions',
      labelDe: 'Abschließen / Feedback zu Maßnahmen',
      description: 'Close actions and provide feedback',
      descriptionDe: 'Maßnahmen abschließen und Feedback geben'
    }
  },
  reports: {
    view: {
      label: 'View reports',
      labelDe: 'Berichte anzeigen',
      description: 'Access to view reports and analytics',
      descriptionDe: 'Zugriff auf Berichte und Analysen'
    },
    create_dashboards: {
      label: 'Create & manage dashboards',
      labelDe: 'Dashboards erstellen & verwalten',
      description: 'Create and customize dashboards',
      descriptionDe: 'Dashboards erstellen und anpassen'
    },
    export_data: {
      label: 'Export data (CSV / PDF)',
      labelDe: 'Daten exportieren (CSV / PDF)',
      description: 'Export data in various formats',
      descriptionDe: 'Daten in verschiedenen Formaten exportieren'
    }
  },
  settings: {
    company_location: {
      label: 'Company & location settings',
      labelDe: 'Unternehmens- & Standorteinstellungen',
      description: 'Configure company and location settings',
      descriptionDe: 'Unternehmens- und Standorteinstellungen konfigurieren'
    },
    user_role_management: {
      label: 'User & role management',
      labelDe: 'Benutzer- & Rollenverwaltung',
      description: 'Manage users and their roles',
      descriptionDe: 'Benutzer und ihre Rollen verwalten'
    },
    gdpr_data_protection: {
      label: 'GDPR / data protection settings',
      labelDe: 'DSGVO / Datenschutzeinstellungen',
      description: 'Configure GDPR and data protection',
      descriptionDe: 'DSGVO und Datenschutz konfigurieren'
    },
    templates_custom_fields: {
      label: 'Templates, custom fields, categories',
      labelDe: 'Vorlagen, benutzerdefinierte Felder, Kategorien',
      description: 'Manage templates and custom fields',
      descriptionDe: 'Vorlagen und benutzerdefinierte Felder verwalten'
    },
    subscription_billing: {
      label: 'Subscription & billing',
      labelDe: 'Abonnement & Abrechnung',
      description: 'Manage subscription and billing settings',
      descriptionDe: 'Abonnement- und Abrechnungseinstellungen verwalten'
    }
  }
};

// Default permissions for new roles (deny all)
export const DEFAULT_DETAILED_PERMISSIONS: DetailedPermissions = {
  standard: {
    collaborate_on_cases: false,
    assign_to_teams: false
  },
  employees: {
    view_all: false,
    view_own_department: false,
    manage: false,
    delete: false,
    share_profiles: false
  },
  health_examinations: {
    view_all: false,
    view_team: false,
    view_own: false,
    create_edit: false,
    medical_evaluations: false,
    delete: false
  },
  investigations: {
    view: false,
    create_edit: false,
    delete: false
  },
  documents: {
    view: false,
    upload: false,
    edit: false,
    delete: false
  },
  trainings: {
    view: false,
    manage: false,
    issue_certificates: false,
    delete: false
  },
  risk_assessments: {
    view: false,
    create_edit: false,
    approve: false,
    delete: false
  },
  incidents: {
    view: false,
    create_edit: false,
    assign: false,
    delete: false
  },
  measures: {
    view: false,
    create_edit: false,
    close: false,
    delete: false
  },
  audits: {
    view: false,
    create_edit: false,
    assign_corrective_actions: false,
    close_feedback: false
  },
  reports: {
    view: false,
    create_dashboards: false,
    export_data: false
  },
  settings: {
    company_location: false,
    user_role_management: false,
    gdpr_data_protection: false,
    templates_custom_fields: false,
    subscription_billing: false
  }
};

// Admin permissions (all true)
export const ADMIN_DETAILED_PERMISSIONS: DetailedPermissions = {
  standard: {
    collaborate_on_cases: true,
    assign_to_teams: true
  },
  employees: {
    view_all: true,
    view_own_department: true,
    manage: true,
    delete: true,
    share_profiles: true
  },
  health_examinations: {
    view_all: true,
    view_team: true,
    view_own: true,
    create_edit: true,
    medical_evaluations: true,
    delete: true
  },
  investigations: {
    view: true,
    create_edit: true,
    delete: true
  },
  documents: {
    view: true,
    upload: true,
    edit: true,
    delete: true
  },
  trainings: {
    view: true,
    manage: true,
    issue_certificates: true,
    delete: true
  },
  risk_assessments: {
    view: true,
    create_edit: true,
    approve: true,
    delete: true
  },
  incidents: {
    view: true,
    create_edit: true,
    assign: true,
    delete: true
  },
  measures: {
    view: true,
    create_edit: true,
    close: true,
    delete: true
  },
  audits: {
    view: true,
    create_edit: true,
    assign_corrective_actions: true,
    close_feedback: true
  },
  reports: {
    view: true,
    create_dashboards: true,
    export_data: true
  },
  settings: {
    company_location: true,
    user_role_management: true,
    gdpr_data_protection: true,
    templates_custom_fields: true,
    subscription_billing: true
  }
};

// Predefined role names
export const PREDEFINED_ROLES = ['Admin', 'HSE Manager', 'Line Manager', 'Doctor', 'Employee', 'User'] as const;
export type PredefinedRole = typeof PREDEFINED_ROLES[number];

// Helper to check if a role is predefined
export function isPredefinedRole(roleName: string): roleName is PredefinedRole {
  return PREDEFINED_ROLES.includes(roleName as PredefinedRole);
}
