/**
 * Temporary Type Definitions for New HSE Tables
 * 
 * These types will be replaced by auto-generated types from Supabase
 * after the database migration is applied and types are regenerated.
 * 
 * To regenerate types after migration:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
 */

// ============================================
// ENUMS
// ============================================

export type MeasureType = 'preventive' | 'corrective' | 'improvement';
export type MeasureStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type IncidentType = 'injury' | 'near_miss' | 'property_damage' | 'environmental' | 'other';
export type IncidentSeverity = 'minor' | 'moderate' | 'serious' | 'critical' | 'fatal';
export type InvestigationStatus = 'open' | 'in_progress' | 'closed';

// ============================================
// ACTIVITY GROUPS
// ============================================

export interface ActivityGroup {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  hazards: string[] | null;
  required_ppe: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityGroupInsert {
  company_id: string;
  name: string;
  description?: string | null;
  hazards?: string[] | null;
  required_ppe?: string[] | null;
}

export interface ActivityGroupUpdate {
  name?: string;
  description?: string | null;
  hazards?: string[] | null;
  required_ppe?: string[] | null;
  updated_at?: string;
}

// ============================================
// EMPLOYEE ACTIVITY ASSIGNMENTS
// ============================================

export interface EmployeeActivityAssignment {
  id: string;
  employee_id: string;
  activity_group_id: string;
  assigned_date: string;
  created_at: string;
}

export interface EmployeeActivityAssignmentInsert {
  employee_id: string;
  activity_group_id: string;
  assigned_date?: string;
}

// ============================================
// MEASURES
// ============================================

export interface Measure {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  measure_type: MeasureType;
  status: MeasureStatus;
  risk_assessment_id: string | null;
  audit_id: string | null;
  incident_id: string | null;
  responsible_person_id: string | null;
  due_date: string | null;
  completion_date: string | null;
  verification_method: string | null;
  attachments: any | null; // JSONB
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface MeasureInsert {
  company_id: string;
  title: string;
  description?: string | null;
  measure_type?: MeasureType;
  status?: MeasureStatus;
  risk_assessment_id?: string | null;
  audit_id?: string | null;
  incident_id?: string | null;
  responsible_person_id?: string | null;
  due_date?: string | null;
  completion_date?: string | null;
  verification_method?: string | null;
  attachments?: any | null;
  created_by?: string | null;
}

export interface MeasureUpdate {
  title?: string;
  description?: string | null;
  measure_type?: MeasureType;
  status?: MeasureStatus;
  risk_assessment_id?: string | null;
  audit_id?: string | null;
  incident_id?: string | null;
  responsible_person_id?: string | null;
  due_date?: string | null;
  completion_date?: string | null;
  verification_method?: string | null;
  attachments?: any | null;
  updated_at?: string;
}

// With joined data for display
export interface MeasureWithRelations extends Measure {
  responsible_person?: Array<{
    full_name: string;
  }>;
}

// ============================================
// INCIDENTS
// ============================================

export interface Incident {
  id: string;
  company_id: string;
  incident_number: string;
  title: string;
  description: string | null;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  incident_date: string;
  location: string | null;
  department_id: string | null;
  affected_employee_id: string | null;
  witness_ids: string[] | null;
  reported_by_id: string | null;
  root_cause: string | null;
  contributing_factors: string[] | null;
  immediate_actions: string | null;
  investigation_status: InvestigationStatus;
  investigation_completed_date: string | null;
  attachments: any | null; // JSONB
  photos: any | null; // JSONB
  created_at: string;
  updated_at: string;
}

export interface IncidentInsert {
  company_id: string;
  title: string;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  incident_date: string;
  description?: string | null;
  location?: string | null;
  department_id?: string | null;
  affected_employee_id?: string | null;
  witness_ids?: string[] | null;
  reported_by_id?: string | null;
  root_cause?: string | null;
  contributing_factors?: string[] | null;
  immediate_actions?: string | null;
  investigation_status?: InvestigationStatus;
  investigation_completed_date?: string | null;
  attachments?: any | null;
  photos?: any | null;
}

export interface IncidentUpdate {
  title?: string;
  description?: string | null;
  incident_type?: IncidentType;
  severity?: IncidentSeverity;
  incident_date?: string;
  location?: string | null;
  department_id?: string | null;
  affected_employee_id?: string | null;
  witness_ids?: string[] | null;
  reported_by_id?: string | null;
  root_cause?: string | null;
  contributing_factors?: string[] | null;
  immediate_actions?: string | null;
  investigation_status?: InvestigationStatus;
  investigation_completed_date?: string | null;
  attachments?: any | null;
  photos?: any | null;
  updated_at?: string;
}

// With joined data for display
export interface IncidentWithRelations extends Incident {
  affected_employee?: Array<{
    full_name: string;
  }>;
  reported_by?: Array<{
    full_name: string;
  }>;
  department?: Array<{
    name: string;
  }>;
}

// ============================================
// ACTIVITY RISK LINKS
// ============================================

export interface ActivityRiskLink {
  id: string;
  activity_group_id: string;
  risk_assessment_id: string;
  created_at: string;
}

export interface ActivityRiskLinkInsert {
  activity_group_id: string;
  risk_assessment_id: string;
}

// ============================================
// ACTIVITY TRAINING REQUIREMENTS
// ============================================

export interface ActivityTrainingRequirement {
  id: string;
  activity_group_id: string;
  training_type_id: string;
  is_mandatory: boolean;
  created_at: string;
}

export interface ActivityTrainingRequirementInsert {
  activity_group_id: string;
  training_type_id: string;
  is_mandatory?: boolean;
}

// ============================================
// EXPOSURE GROUPS (Extended from existing)
// ============================================

export interface ExposureGroup {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  exposure_factors: string[] | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// DOCUMENTS
// ============================================

export type DocumentCategory = 
  | 'policy' 
  | 'procedure' 
  | 'risk_assessment' 
  | 'training' 
  | 'incident_report' 
  | 'audit_report' 
  | 'certificate' 
  | 'permit' 
  | 'inspection' 
  | 'other';

export interface Document {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  tags: string[] | null;
  department_id: string | null;
  is_public: boolean;
  allowed_roles: string[] | null;
  version: string;
  expiry_date: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  related_risk_assessment_id: string | null;
  related_audit_id: string | null;
  related_incident_id: string | null;
  related_training_id: string | null;
}

export interface DocumentInsert {
  company_id: string;
  title: string;
  category: DocumentCategory;
  file_name: string;
  file_path: string;
  description?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  tags?: string[] | null;
  department_id?: string | null;
  is_public?: boolean;
  allowed_roles?: string[] | null;
  version?: string;
  expiry_date?: string | null;
  uploaded_by?: string | null;
  related_risk_assessment_id?: string | null;
  related_audit_id?: string | null;
  related_incident_id?: string | null;
  related_training_id?: string | null;
}

export interface DocumentUpdate {
  title?: string;
  description?: string | null;
  category?: DocumentCategory;
  tags?: string[] | null;
  department_id?: string | null;
  is_public?: boolean;
  allowed_roles?: string[] | null;
  version?: string;
  expiry_date?: string | null;
  related_risk_assessment_id?: string | null;
  related_audit_id?: string | null;
  related_incident_id?: string | null;
  related_training_id?: string | null;
  updated_at?: string;
}

export interface DocumentWithUploader extends Document {
  uploader?: {
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  };
  department?: {
    name: string;
  };
}

// ============================================
// TYPE GUARDS
// ============================================

export function isMeasure(obj: any): obj is Measure {
  return obj && typeof obj.id === 'string' && typeof obj.title === 'string' && 'measure_type' in obj;
}

export function isIncident(obj: any): obj is Incident {
  return obj && typeof obj.id === 'string' && typeof obj.incident_number === 'string' && 'incident_type' in obj;
}

export function isActivityGroup(obj: any): obj is ActivityGroup {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string' && 'hazards' in obj;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export const measureTypeLabels: Record<MeasureType, string> = {
  preventive: 'Preventive',
  corrective: 'Corrective',
  improvement: 'Improvement',
};

export const measureStatusLabels: Record<MeasureStatus, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const incidentTypeLabels: Record<IncidentType, string> = {
  injury: 'Injury',
  near_miss: 'Near Miss',
  property_damage: 'Property Damage',
  environmental: 'Environmental',
  other: 'Other',
};

export const incidentSeverityLabels: Record<IncidentSeverity, string> = {
  minor: 'Minor',
  moderate: 'Moderate',
  serious: 'Serious',
  critical: 'Critical',
  fatal: 'Fatal',
};

export const investigationStatusLabels: Record<InvestigationStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  closed: 'Closed',
};

export const documentCategoryLabels: Record<DocumentCategory, string> = {
  policy: 'Richtlinie',
  procedure: 'Verfahrensanweisung',
  risk_assessment: 'Gefährdungsbeurteilung',
  training: 'Schulung',
  incident_report: 'Vorfallbericht',
  audit_report: 'Auditbericht',
  certificate: 'Zertifikat',
  permit: 'Genehmigung',
  inspection: 'Inspektion',
  other: 'Sonstiges',
};

// ============================================
// UTILITY TYPES FOR SUPABASE QUERIES
// ============================================

// For type-safe Supabase queries until official types are generated
export type Database = {
  public: {
    Tables: {
      activity_groups: {
        Row: ActivityGroup;
        Insert: ActivityGroupInsert;
        Update: ActivityGroupUpdate;
      };
      employee_activity_assignments: {
        Row: EmployeeActivityAssignment;
        Insert: EmployeeActivityAssignmentInsert;
        Update: Partial<EmployeeActivityAssignmentInsert>;
      };
      measures: {
        Row: Measure;
        Insert: MeasureInsert;
        Update: MeasureUpdate;
      };
      incidents: {
        Row: Incident;
        Insert: IncidentInsert;
        Update: IncidentUpdate;
      };
      activity_risk_links: {
        Row: ActivityRiskLink;
        Insert: ActivityRiskLinkInsert;
        Update: Partial<ActivityRiskLinkInsert>;
      };
      activity_training_requirements: {
        Row: ActivityTrainingRequirement;
        Insert: ActivityTrainingRequirementInsert;
        Update: Partial<ActivityTrainingRequirementInsert>;
      };
      documents: {
        Row: Document;
        Insert: DocumentInsert;
        Update: DocumentUpdate;
      };
    };
  };
};
