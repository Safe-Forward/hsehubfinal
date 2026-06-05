import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useDocumentActivityLog = () => {
  const { toast } = useToast();

  const logDocumentActivity = async (
    action: 'upload' | 'download' | 'delete' | 'view',
    documentId: string,
    documentName: string,
    fileSize?: number,
    fileType?: string
  ) => {
    try {
      const { error } = await supabase.rpc("log_document_activity", {
        p_action_type: action,
        p_document_id: documentId,
        p_document_name: documentName,
        p_file_size: fileSize || null,
        p_file_type: fileType || null,
      });

      if (error) {
        console.error("Error logging document activity:", error);
      }
    } catch (err) {
      console.error("Error in logDocumentActivity:", err);
    }
  };

  const logReportGeneration = async (
    reportType: string,
    reportName: string,
    filters?: Record<string, any>
  ) => {
    try {
      const { error } = await supabase.rpc("log_report_generation", {
        p_report_type: reportType,
        p_report_name: reportName,
        p_filters: filters || null,
      });

      if (error) {
        console.error("Error logging report generation:", error);
      }
    } catch (err) {
      console.error("Error in logReportGeneration:", err);
    }
  };

  return {
    logDocumentActivity,
    logReportGeneration,
  };
};
