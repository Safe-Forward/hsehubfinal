import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, FileDown, Loader2, RefreshCw, ChevronDown, ChevronRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AuditDetails() {
  const { id } = useParams();
  const { user, loading, companyId } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [audit, setAudit] = useState<any>(null);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedSubsections, setExpandedSubsections] = useState<Set<string>>(new Set());
  const [notesDialog, setNotesDialog] = useState<{ open: boolean; itemId: string | null; currentNote: string }>({ 
    open: false, 
    itemId: null, 
    currentNote: "" 
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (user && companyId && id) {
      fetchAuditDetails();
    }
  }, [user, loading, navigate, companyId, id]);

  // Recalculate progress whenever checklist items change
  useEffect(() => {
    if (!audit || checklistItems.length === 0) return;

    const completedCount = checklistItems.filter(
      (item) => item.implemented && item.satisfied
    ).length;
    const totalCount = checklistItems.length;
    const progress = Math.round((completedCount / totalCount) * 100);

    setAudit((prev: any) => {
      if (!prev) return null;
      // Avoid infinite loops by checking if values actually changed
      if (
        prev.progress_percentage === progress &&
        prev.completed_items === completedCount
      ) {
        return prev;
      }
      return {
        ...prev,
        progress_percentage: progress,
        completed_items: completedCount,
        total_items: totalCount,
      };
    });
  }, [checklistItems]);

  const fetchAuditDetails = async () => {
    if (!companyId || !id) return;

    setLoadingData(true);
    try {
      // Fetch audit
      const { data: auditData, error: auditError} = await supabase
        .from("audits")
        .select(
          `
          *,
          audit_categories(name),
          departments(name),
          team_members!audits_responsible_person_id_fkey(first_name, last_name, email)
        `
        )
        .eq("id", id)
        .eq("company_id", companyId)
        .single();

      if (auditError) throw auditError;
      setAudit(auditData);
      console.log("Audit loaded:", auditData);

      // Fetch checklist items with ISO criteria - ordered by section and subsection numbers
      const { data: itemsData, error: itemsError } = await supabase
        .from("audit_checklist_items")
        .select(
          `
          *,
          iso_criteria_sections(section_number, title, title_en),
          iso_criteria_subsections(subsection_number, title, title_en),
          iso_criteria_questions(question_text, question_text_en)
        `
        )
        .eq("audit_id", id);

      if (itemsError) throw itemsError;
      console.log("Checklist items loaded:", itemsData?.length || 0, "items");
      
      // If no checklist items exist, automatically generate them
      if (!itemsData || itemsData.length === 0) {
        console.log("No checklist items found, generating automatically...");
        await generateChecklistItems(auditData);
      } else {
        console.log("Sample item:", itemsData?.[0]);
        
        // Deduplicate by question text to prevent showing duplicate entries
        const seenQuestionTexts = new Set<string>();
        const uniqueItems = itemsData.filter((item: any) => {
          const questionText = item.iso_criteria_questions?.question_text;
          if (!questionText) return true; // Keep items without question
          if (seenQuestionTexts.has(questionText)) {
            return false; // Skip duplicate
          }
          seenQuestionTexts.add(questionText);
          return true;
        });
        
        console.log(`Deduplicated: ${itemsData.length} -> ${uniqueItems.length} items`);
        
        // Sort items by section_number, subsection_number, and sort_order for proper ordering
        const sortedItems = uniqueItems.sort((a: any, b: any) => {
          const sectionA = parseFloat(a.iso_criteria_sections?.section_number || "0");
          const sectionB = parseFloat(b.iso_criteria_sections?.section_number || "0");
          
          if (sectionA !== sectionB) {
            return sectionA - sectionB;
          }
          
          const subsectionA = parseFloat(a.iso_criteria_subsections?.subsection_number || "0");
          const subsectionB = parseFloat(b.iso_criteria_subsections?.subsection_number || "0");
          
          if (subsectionA !== subsectionB) {
            return subsectionA - subsectionB;
          }
          
          // Sort by question sort_order if available
          const orderA = a.iso_criteria_questions?.sort_order || 0;
          const orderB = b.iso_criteria_questions?.sort_order || 0;
          
          return orderA - orderB;
        });
        
        setChecklistItems(sortedItems);
        
        // Auto-expand all sections on load
        const allSections = new Set<string>();
        uniqueItems.forEach((item: any) => {
          if (item.section_id) {
            allSections.add(item.section_id);
          }
        });
        setExpandedSections(allSections);
      }
    } catch (err: any) {
      toast({
        title: "Error loading audit",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const generateChecklistItems = async (auditData: any) => {
    if (!auditData?.iso_code) {
      console.log("No ISO code found for this audit");
      return;
    }

    try {
      // Read selected criteria from localStorage (same as Settings page)
      let selectedSections: string[] = [];
      if (companyId) {
        const storedCriteria = localStorage.getItem(`selectedCriteria_${companyId}`);
        if (storedCriteria) {
          const allSelectedCriteria = JSON.parse(storedCriteria);
          // Filter to get only section IDs for this ISO code
          // Format: "ISO_14001-section-1", "ISO_14001-section-3"
          selectedSections = allSelectedCriteria
            .filter((id: string) => id.startsWith(`${auditData.iso_code}-section-`))
            .map((id: string) => id.replace(`${auditData.iso_code}-section-`, ""));
          
          console.log(`Selected sections for ${auditData.iso_code}:`, selectedSections);
        }
      }

      // Fetch all ISO criteria sections, subsections, and QUESTIONS for this standard
      const { data: sections, error } = await supabase
        .from("iso_criteria_sections")
        .select(
          `
          id,
          section_number,
          title,
          title_en,
          subsections:iso_criteria_subsections(
            id,
            subsection_number,
            title,
            title_en,
            questions:iso_criteria_questions(
              id,
              question_text,
              question_text_en,
              sort_order
            )
          )
        `
        )
        .eq("iso_code", auditData.iso_code)
        .order("section_number");

      if (error) throw error;

      if (!sections || sections.length === 0) {
        console.log(`No ISO criteria found for ${auditData.iso_code}`);
        toast({
          title: "No criteria found",
          description: `Please import ISO criteria for ${auditData.iso_code} in Settings first.`,
          variant: "destructive",
        });
        return;
      }

      // Filter sections to only include selected ones
      console.log("All sections from database:", sections?.map((s: any) => ({ id: s.id, number: s.section_number })));
      let filteredSections = sections;
      if (selectedSections.length > 0) {
        filteredSections = sections.filter((section: any) => {
          const normalized = section.section_number?.toString().trim();
          const isIncluded = selectedSections.includes(normalized);
          console.log(`Section ${section.section_number} (normalized: "${normalized}") included?`, isIncluded);
          return isIncluded;
        });
        console.log(`Filtered to ${filteredSections.length} sections from ${sections.length} total`);
        console.log("Filtered section numbers:", filteredSections.map((s: any) => s.section_number));
      } else {
        // If NO criteria are selected, show NOTHING (not all sections)
        filteredSections = [];
        console.log("No criteria selection found, showing no sections");
      }

      // Check for existing checklist items to prevent duplicates
      const { data: existingItems } = await supabase
        .from("audit_checklist_items")
        .select("question_id")
        .eq("audit_id", auditData.id);

      const existingQuestionIds = new Set(
        existingItems?.map(item => item.question_id) || []
      );

      // Create checklist items for each QUESTION (not subsection)
      // Track question IDs to avoid duplicates from the database
      const checklistItems: any[] = [];
      const seenQuestionIds = new Set<string>();
      
      filteredSections?.forEach((section) => {
        section.subsections?.forEach((subsection: any) => {
          subsection.questions?.forEach((question: any) => {
            // Skip if:
            // 1. This question already has a checklist item (by ID)
            // 2. We've already seen this question ID (prevents database duplicates)
            if (!existingQuestionIds.has(question.id) && 
                !seenQuestionIds.has(question.id)) {
              
              seenQuestionIds.add(question.id);
              
              checklistItems.push({
                audit_id: auditData.id,
                section_id: section.id,
                subsection_id: subsection.id,
                question_id: question.id,
                status: "pending",
                implemented: false,
                satisfied: false,
              });
            }
          });
        });
      });

      if (checklistItems.length > 0) {
        console.log("Inserting", checklistItems.length, "checklist items");
        
        const { data: insertedData, error: insertError } = await supabase
          .from("audit_checklist_items")
          .insert(checklistItems)
          .select(
            `
            *,
            iso_criteria_sections(section_number, title, title_en),
            iso_criteria_subsections(subsection_number, title, title_en),
            iso_criteria_questions(question_text, question_text_en)
          `
          );

        if (insertError) {
          console.error("Error inserting checklist items:", insertError);
          throw insertError;
        }

        console.log("Successfully inserted:", insertedData?.length, "items");
        
        // Directly set the checklist items instead of fetching again to avoid infinite loop
        setChecklistItems(insertedData || []);
        
        // Auto-expand all sections
        const allSections = new Set<string>();
        insertedData?.forEach(item => {
          if (item.section_id) {
            allSections.add(item.section_id);
          }
        });
        setExpandedSections(allSections);
        
        toast({
          title: "Checklist Generated",
          description: `Successfully created ${insertedData?.length || checklistItems.length} checklist items`,
        });
      }
    } catch (err: any) {
      console.error("Error generating checklist:", err);
      
      // Provide more detailed error message
      let errorMessage = err.message || "Failed to generate checklist";
      if (err.code === '42501') {
        errorMessage = "Database permission error. Please contact support to fix RLS policies.";
      }
      
      toast({
        title: "Error generating checklist",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Persist computed progress back to the audits table so the list page stays in sync
  const syncProgressToDb = async (updatedItems: any[]) => {
    if (!id) return;
    const total = updatedItems.length;
    const completed = updatedItems.filter((i) => i.implemented && i.satisfied).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    const status = percentage >= 100 ? "completed" : percentage > 0 ? "in_progress" : "planned";

    await supabase
      .from("audits")
      .update({
        status,
        progress_percentage: percentage,
        completed_items: completed,
        total_items: total,
      })
      .eq("id", id);
  };

  const updateChecklistItem = async (itemId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from("audit_checklist_items")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId);

      if (error) throw error;

      // Update local state and sync progress to DB
      setChecklistItems((items) => {
        const updated = items.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        );
        syncProgressToDb(updated);
        return updated;
      });
    } catch (err: any) {
      toast({
        title: "Error updating item",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  };

  const toggleSubsection = (subsectionKey: string) => {
    setExpandedSubsections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subsectionKey)) {
        newSet.delete(subsectionKey);
      } else {
        newSet.add(subsectionKey);
      }
      return newSet;
    });
  };

  const handleImplementedCheckbox = (item: any, checked: boolean) => {
    if (checked) {
      // Open notes dialog when checkbox is checked
      setNotesDialog({
        open: true,
        itemId: item.id,
        currentNote: item.notes || "",
      });
    } else {
      // Directly update if unchecking
      updateChecklistItem(item.id, { implemented: checked });
    }
  };

  const handleSaveNote = async () => {
    if (!notesDialog.itemId) return;

    await updateChecklistItem(notesDialog.itemId, {
      implemented: true,
      notes: notesDialog.currentNote,
    });

    setNotesDialog({ open: false, itemId: null, currentNote: "" });
    
    toast({
      title: "Note saved",
      description: "Implementation note has been added successfully",
    });
  };

  const handleCancelNote = () => {
    setNotesDialog({ open: false, itemId: null, currentNote: "" });
  };

  const handleSelectAll = () => {
    const allUpdates = checklistItems.map(item => ({
      id: item.id,
      implemented: true,
      satisfied: true,
    }));

    // Update all items in the database
    Promise.all(
      allUpdates.map(update =>
        supabase
          .from("audit_checklist_items")
          .update({
            implemented: update.implemented,
            satisfied: update.satisfied,
            updated_at: new Date().toISOString(),
          })
          .eq("id", update.id)
      )
    ).then(() => {
      // Update local state and sync progress to DB
      setChecklistItems(items => {
        const updated = items.map(item => ({
          ...item,
          implemented: true,
          satisfied: true,
        }));
        syncProgressToDb(updated);
        return updated;
      });
      
      toast({
        title: "All items selected",
        description: `Updated ${allUpdates.length} checklist items`,
      });
    }).catch(err => {
      toast({
        title: "Error updating items",
        description: err.message,
        variant: "destructive",
      });
    });
  };

  const handleExportPdf = () => {
    if (!audit || checklistItems.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no checklist items available for this audit.",
        variant: "destructive",
      });
      return;
    }

    try {
      const doc = new jsPDF();
      const today = new Date().toISOString().split("T")[0];

      doc.setFontSize(16);
      doc.text(audit.title || "Audit", 14, 18);
      doc.setFontSize(10);
      doc.text(`ISO: ${audit.iso_code || "-"}`, 14, 25);
      doc.text(`Scheduled: ${audit.scheduled_date || "-"}`, 70, 25);
      doc.text(`Progress: ${audit.progress_percentage || 0}%`, 145, 25);

      const rows = checklistItems.map((item) => {
        const sectionNumber = item.iso_criteria_sections?.section_number || "";
        const subsectionNumber = item.iso_criteria_subsections?.subsection_number || "";
        const questionText =
          language === "en"
            ? item.iso_criteria_questions?.question_text_en ||
              item.iso_criteria_questions?.question_text ||
              "-"
            : item.iso_criteria_questions?.question_text ||
              item.iso_criteria_questions?.question_text_en ||
              "-";

        const criteriaLabel = `${sectionNumber}${subsectionNumber ? `.${subsectionNumber}` : ""} ${questionText}`.trim();

        return [
          criteriaLabel,
          item.implemented ? "Yes" : "No",
          item.satisfied ? "Yes" : "No",
          item.notes || "-",
        ];
      });

      autoTable(doc, {
        startY: 32,
        head: [["Criteria", "Implemented", "Satisfied", "Notes"]],
        body: rows,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [37, 99, 235] },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 16, halign: "center" },
          2: { cellWidth: 16, halign: "center" },
          3: { cellWidth: 50 },
        },
      });

      doc.save(`audit_${audit.iso_code || "report"}_${today}.pdf`);
      toast({
        title: "Success",
        description: t("common.pdfExported"),
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error?.message || "Failed to export PDF",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        label: t("audits.status.pending"),
        variant: "outline" as const,
        color: "text-gray-600",
      },
      completed: {
        label: t("audits.status.completed"),
        variant: "default" as const,
        color: "text-green-600",
      },
      failed: {
        label: t("audits.status.failed"),
        variant: "destructive" as const,
        color: "text-red-600",
      },
      not_applicable: {
        label: t("audits.status.notApplicable"),
        variant: "secondary" as const,
        color: "text-gray-500",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Audit not found</p>
      </div>
    );
  }

  // Group checklist items by section and subsection
  const groupedItems = checklistItems.reduce((acc, item) => {
    const sectionKey = item.section_id || "other";
    const subsectionKey = item.subsection_id || "no_subsection";
    
    if (!acc[sectionKey]) {
      acc[sectionKey] = {
        section: item.iso_criteria_sections,
        subsections: {},
      };
    }
    
    if (!acc[sectionKey].subsections[subsectionKey]) {
      acc[sectionKey].subsections[subsectionKey] = {
        subsection: item.iso_criteria_subsections,
        questions: [],
      };
    }
    
    acc[sectionKey].subsections[subsectionKey].questions.push(item);
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/audits")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{audit.title}</h1>
              <p className="text-xs text-muted-foreground">
                {audit.iso_code} - {audit.scheduled_date}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                if (!audit || !companyId) return;
                
                try {
                  // Clear local state first
                  setChecklistItems([]);
                  setExpandedSections(new Set());
                  
                  // Delete ALL existing checklist items for this audit
                  console.log("Deleting all checklist items for audit:", audit.id);
                  const { error: deleteError, count } = await supabase
                    .from("audit_checklist_items")
                    .delete()
                    .eq("audit_id", audit.id);
                  
                  if (deleteError) {
                    console.error("Delete error:", deleteError);
                    toast({
                      title: "Error",
                      description: deleteError.message,
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  console.log("Deleted items, count:", count);
                  
                  // Read selected criteria from localStorage
                  let selectedSections: string[] = [];
                  const storedCriteria = localStorage.getItem(`selectedCriteria_${companyId}`);
                  if (storedCriteria) {
                    const allSelectedCriteria = JSON.parse(storedCriteria);
                    selectedSections = allSelectedCriteria
                      .filter((id: string) => id.startsWith(`${audit.iso_code}-section-`))
                      .map((id: string) => id.replace(`${audit.iso_code}-section-`, ""));
                    console.log("Selected sections from localStorage:", selectedSections);
                  }
                  
                  // Fetch sections with subsections AND questions from database
                  const { data: sections, error: sectionsError } = await supabase
                    .from("iso_criteria_sections")
                    .select(`
                      id,
                      section_number,
                      title,
                      title_en,
                      subsections:iso_criteria_subsections(
                        id,
                        subsection_number,
                        title,
                        title_en,
                        questions:iso_criteria_questions(
                          id,
                          question_text,
                          question_text_en,
                          sort_order
                        )
                      )
                    `)
                    .eq("iso_code", audit.iso_code)
                    .order("section_number");
                  
                  if (sectionsError) {
                    console.error("Sections fetch error:", sectionsError);
                    throw sectionsError;
                  }
                  
                  // Filter sections to only include selected ones
                  let filteredSections = sections || [];
                  if (selectedSections.length > 0) {
                    filteredSections = sections?.filter((section: any) => 
                      selectedSections.includes(section.section_number)
                    ) || [];
                    console.log(`Using ${filteredSections.length} selected sections from ${sections?.length || 0} total`);
                  } else {
                    // If NO criteria are selected, show NOTHING (not all sections)
                    filteredSections = [];
                    console.log("No criteria selection found, showing no sections");
                  }

                  
                  // Create unique checklist items (one per QUESTION, not subsection)
                  const newItems: any[] = [];
                  const seenQuestionIds = new Set<string>();
                  
                  filteredSections.forEach((section: any) => {
                    section.subsections?.forEach((sub: any) => {
                      sub.questions?.forEach((question: any) => {
                        if (!seenQuestionIds.has(question.id)) {
                          seenQuestionIds.add(question.id);
                          newItems.push({
                            audit_id: audit.id,
                            section_id: section.id,
                            subsection_id: sub.id,
                            question_id: question.id,
                            status: "pending",
                            implemented: false,
                            satisfied: false,
                          });
                        }
                      });
                    });
                  });
                  
                  console.log(`Creating ${newItems.length} unique checklist items (after dedup)`);
                  
                  if (newItems.length > 0) {
                    // Insert new items
                    const { data: insertedData, error: insertError } = await supabase
                      .from("audit_checklist_items")
                      .insert(newItems)
                      .select(`
                        *,
                        iso_criteria_sections(section_number, title, title_en),
                        iso_criteria_subsections(subsection_number, title, title_en),
                        iso_criteria_questions(question_text, question_text_en)
                      `);
                    
                    if (insertError) {
                      console.error("Insert error:", insertError);
                      throw insertError;
                    }
                    
                    console.log(`Successfully inserted ${insertedData?.length} items`);
                    
                    // Set state with new items
                    setChecklistItems(insertedData || []);
                    
                    // Expand all sections
                    const allSectionIds = new Set<string>();
                    insertedData?.forEach((item: any) => {
                      if (item.section_id) allSectionIds.add(item.section_id);
                    });
                    setExpandedSections(allSectionIds);
                  }
                  
                  toast({
                    title: "Checklist Regenerated",
                    description: `Created ${newItems.length} unique checklist items`,
                  });
                  
                } catch (err: any) {
                  console.error("Regeneration error:", err);
                  toast({
                    title: "Error",
                    description: err.message || "Failed to regenerate checklist",
                    variant: "destructive",
                  });
                }
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate Checklist
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={handleSelectAll}
              className="bg-green-600 hover:bg-green-700"
            >
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf}>
              <FileDown className="w-4 h-4 mr-2" />
              {t("audits.pdfExport")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Audit Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{audit.title}</CardTitle>
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  <span>📋 {audit.iso_code}</span>
                  <span>📅 {audit.scheduled_date}</span>
                  <span>
                    👤 {audit.team_members 
                      ? `${audit.team_members.first_name} ${audit.team_members.last_name}`
                      : t("audits.notAssigned")}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {audit.progress_percentage || 0}%
                </div>
                <div className="text-sm text-muted-foreground">
                  ({audit.completed_items || 0}/{audit.total_items || 0})
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Checklist Table */}
        <Card>
          <CardHeader>
            <CardTitle>Audit File Explanation</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold">Criteria</th>
                    <th className="text-center p-3 font-semibold w-32">
                      Implemented
                    </th>
                    <th className="text-center p-3 font-semibold w-32">
                      Satisfied
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedItems).map(
                    ([sectionKey, sectionGroup]: [string, any]) => {
                      const isExpanded = expandedSections.has(sectionKey);
                      return (
                        <React.Fragment key={`section-${sectionKey}`}>
                          {/* Main Section Row - Clickable */}
                          <tr 
                            className="border-b bg-gray-100 cursor-pointer hover:bg-gray-200"
                            onClick={() => toggleSection(sectionKey)}
                          >
                            <td colSpan={3} className="p-3 font-bold flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5" />
                              ) : (
                                <ChevronRight className="w-5 h-5" />
                              )}
                              {sectionGroup.section?.section_number}.{" "}
                              {language === "en"
                                ? sectionGroup.section?.title_en ||
                                  sectionGroup.section?.title
                                : sectionGroup.section?.title}
                            </td>
                          </tr>

                          {/* Subsections - Only show if expanded */}
                          {isExpanded && Object.entries(sectionGroup.subsections).map(
                            ([subsectionKey, subsectionGroup]: [string, any]) => {
                              const isSubsectionExpanded = expandedSubsections.has(subsectionKey);
                              return (
                              <React.Fragment key={`subsection-${subsectionKey}`}>
                                {/* Subsection Header Row - Clickable to expand/collapse */}
                                <tr 
                                  className="border-b bg-gray-50 cursor-pointer hover:bg-gray-100"
                                  onClick={() => toggleSubsection(subsectionKey)}
                                >
                                  <td colSpan={3} className="p-3 pl-10 font-semibold">
                                    <div className="flex items-center gap-2">
                                      {isSubsectionExpanded ? (
                                        <ChevronDown className="w-4 h-4" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4" />
                                      )}
                                      <span className="font-bold text-primary">
                                        {subsectionGroup.subsection?.subsection_number}{" "}
                                      </span>
                                      {language === "en"
                                        ? subsectionGroup.subsection?.title_en ||
                                          subsectionGroup.subsection?.title
                                        : subsectionGroup.subsection?.title ||
                                          subsectionGroup.subsection?.title_en}
                                    </div>
                                  </td>
                                </tr>
                                
                                {/* Questions under subsection - Only show if subsection is expanded */}
                                {isSubsectionExpanded && subsectionGroup.questions.map((item: any) => (
                                  <tr
                                    key={`item-${item.id}`}
                                    className="border-b hover:bg-gray-50/50"
                                  >
                                    <td className="p-3 pl-16">
                                      <span className="text-muted-foreground">
                                        {language === "en"
                                          ? item.iso_criteria_questions?.question_text_en ||
                                            item.iso_criteria_questions?.question_text
                                          : item.iso_criteria_questions?.question_text ||
                                            item.iso_criteria_questions?.question_text_en}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <input
                                          type="checkbox"
                                          className="w-5 h-5 cursor-pointer"
                                          checked={item.implemented || false}
                                          onChange={(e) =>
                                            handleImplementedCheckbox(item, e.target.checked)
                                          }
                                        />
                                        {item.notes && (
                                          <span 
                                            title="Click to view/edit note"
                                            className="cursor-pointer hover:opacity-70"
                                            onClick={() => setNotesDialog({
                                              open: true,
                                              itemId: item.id,
                                              currentNote: item.notes || "",
                                            })}
                                          >
                                            <MessageSquare className="w-4 h-4 text-blue-500" />
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-3 text-center">
                                      <input
                                        type="checkbox"
                                        className="w-5 h-5 cursor-pointer"
                                        checked={item.satisfied || false}
                                        onChange={(e) =>
                                          updateChecklistItem(item.id, {
                                            satisfied: e.target.checked,
                                          })
                                        }
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Notes Dialog */}
      <Dialog open={notesDialog.open} onOpenChange={(open) => !open && handleCancelNote()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Implementation Note</DialogTitle>
            <DialogDescription>
              Add any relevant notes about the implementation of this criterion (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter your implementation notes here..."
              value={notesDialog.currentNote}
              onChange={(e) =>
                setNotesDialog((prev) => ({ ...prev, currentNote: e.target.value }))
              }
              rows={5}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelNote}>
              Skip
            </Button>
            <Button onClick={handleSaveNote}>
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
