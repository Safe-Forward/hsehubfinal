import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Save, X, Loader2, FileText, ChevronDown, ChevronRight,
  AlertTriangle, Bell, Target, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  onNavigateToTab?: (tab: string) => void;
}

const predefinedISOs = [
  { id: "ISO_45001", name: "ISO 45001", description: "Arbeitssicherheit und Gesundheitsschutz" },
  { id: "ISO_14001", name: "ISO 14001", description: "Umweltmanagement" },
  { id: "ISO_9001", name: "ISO 9001", description: "Qualitätsmanagement" },
  { id: "ISO_50001", name: "ISO 50001", description: "Energiemanagement" },
];

export function IntervalsTab({ onNavigateToTab }: Props) {
  const { companyId } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { logAction } = useAuditLog();

  // Company settings state
  const [companySettings, setCompanySettings] = useState({
    notification_settings: {
      examinations_days: 60,
      measures_days: 14,
      qualifications_days: 30,
      audits_days: 30,
      gbu_review_days: 60,
    },
    risk_matrix_labels: {
      likelihood: ["Very unlikely", "unlikely", "possible", "probably", "very probably"],
      severity: ["very low", "low", "medium", "high", "very high"],
      result: ["low", "medium", "high", "very high"],
      colors: { low: "#22c55e", medium: "#f97316", high: "#ef4444", very_high: "#991b1b" },
    },
    gbu_intervals: [24] as number[],
    audit_intervals: [12] as number[],
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [newGbuInterval, setNewGbuInterval] = useState("");
  const [newAuditInterval, setNewAuditInterval] = useState("");

  // ISO state
  const [selectedISOs, setSelectedISOs] = useState<string[]>([]);
  const [customISOs, setCustomISOs] = useState<string[]>([]);
  const [isoCriteriaData, setIsoCriteriaData] = useState<any>({});
  const [importingISO, setImportingISO] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [activeISOForCriteria, setActiveISOForCriteria] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
  const [newCustomISO, setNewCustomISO] = useState("");
  const [newCriterionId, setNewCriterionId] = useState("");
  const [newCriterionText, setNewCriterionText] = useState("");

  useEffect(() => {
    if (companyId) {
      fetchCompanySettings();
      fetchISOStandards();
      fetchAllIsoCriteria();
    }
  }, [companyId]);

  const fetchCompanySettings = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) { console.warn("Could not load company settings:", error.message); return; }
      if (data) {
        setCompanySettings({
          notification_settings: data.notification_settings,
          risk_matrix_labels: data.risk_matrix_labels,
          gbu_intervals: data.gbu_intervals || [24],
          audit_intervals: data.audit_intervals || [12],
        });
      }
    } catch (err: any) {
      console.warn("Could not load company settings:", err.message);
    }
  };

  const saveCompanySettings = async (updates: Partial<typeof companySettings>) => {
    if (!companyId) return;
    setSavingSettings(true);
    try {
      const newSettings = { ...companySettings, ...updates };
      const { error } = await supabase
        .from("company_settings")
        .upsert(
          {
            company_id: companyId,
            notification_settings: newSettings.notification_settings,
            risk_matrix_labels: newSettings.risk_matrix_labels,
            gbu_intervals: newSettings.gbu_intervals,
            audit_intervals: newSettings.audit_intervals,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id" }
        );
      if (error) throw error;
      setCompanySettings(newSettings);
      toast({ title: "Erfolgreich", description: "Einstellungen wurden gespeichert" });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchISOStandards = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from("company_iso_standards")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true);
      if (error) throw error;

      const selected: string[] = [];
      const custom: string[] = [];
      (data || []).forEach((iso: any) => {
        selected.push(iso.iso_code);
        if (iso.is_custom) custom.push(iso.iso_code);
      });

      setSelectedISOs(selected);
      setCustomISOs(custom);
      if (selected.length > 0 && !activeISOForCriteria) {
        setActiveISOForCriteria(selected[0]);
      }

      // Load selected criteria from localStorage
      const savedCriteria = localStorage.getItem(`selectedCriteria_${companyId}`);
      if (savedCriteria) {
        try {
          setSelectedCriteria(JSON.parse(savedCriteria));
        } catch (e) { /* ignore */ }
      }

      for (const isoCode of selected) {
        await fetchIsoCriteria(isoCode);
      }
    } catch (err) {
      console.error("Error fetching ISO standards:", err);
    }
  };

  const fetchIsoCriteria = async (isoCode: string) => {
    try {
      const { data: sections, error } = await supabase
        .from("iso_criteria_sections")
        .select("*, subsections:iso_criteria_subsections(*, questions:iso_criteria_questions(*))")
        .eq("iso_code", isoCode)
        .order("sort_order");
      if (error) throw error;
      setIsoCriteriaData((prev: any) => ({ ...prev, [isoCode]: sections }));
    } catch (error: any) {
      console.error("Error fetching ISO criteria:", error);
    }
  };

  const fetchAllIsoCriteria = async () => {
    try {
      const { data: sections, error } = await supabase
        .from("iso_criteria_sections")
        .select("iso_code")
        .limit(1);
      if (error) throw error;
      if (sections && sections.length > 0) {
        const { data: allSections } = await supabase.from("iso_criteria_sections").select("iso_code");
        const uniqueIsoCodes = [...new Set(allSections?.map((s) => s.iso_code) || [])];
        for (const isoCode of uniqueIsoCodes) {
          await fetchIsoCriteria(isoCode as string);
        }
      }
    } catch (error: any) {
      console.error("Error fetching all ISO criteria:", error);
    }
  };

  const saveISOStandard = async (isoCode: string, isoName: string, isCustom: boolean) => {
    if (!companyId) return;
    try {
      const { error } = await supabase
        .from("company_iso_standards")
        .upsert(
          { company_id: companyId, iso_code: isoCode, iso_name: isoName, is_custom: isCustom, is_active: true },
          { onConflict: "company_id,iso_code" }
        );
      if (error) throw error;
      logAction({
        action: isCustom ? "update_custom_iso" : "activate_iso_standard",
        targetType: "iso_standard",
        targetId: isoCode,
        targetName: isoName,
        details: { iso_code: isoCode, is_active: true },
      });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const deleteISOStandard = async (isoCode: string) => {
    if (!companyId) return;
    try {
      const { error } = await supabase
        .from("company_iso_standards")
        .delete()
        .eq("company_id", companyId)
        .eq("iso_code", isoCode);
      if (error) throw error;
      logAction({
        action: "deactivate_iso_standard",
        targetType: "iso_standard",
        targetId: isoCode,
        targetName: isoCode,
        details: { iso_code: isoCode },
      });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const importIsoCriteria = async (isoCode: string) => {
    if (!companyId) return;
    setImportingISO(isoCode);
    try {
      let jsonData: any;
      if (isoCode === "ISO_9001") {
        jsonData = await import("../../../data/iso_9001_2015_complete.json");
      } else if (isoCode === "ISO_14001") {
        jsonData = await import("../../../data/iso_14001_2015_complete.json");
      } else if (isoCode === "ISO_45001") {
        jsonData = await import("../../../data/iso_45001_2015_complete.json");
      } else {
        throw new Error("Unknown ISO code");
      }
      const data = jsonData.default || jsonData;
      for (const section of data.sections) {
        const { data: sectionData, error: sectionError } = await supabase
          .from("iso_criteria_sections")
          .upsert(
            { iso_code: data.iso_code, section_number: section.section_number, title: section.title, title_en: section.title, sort_order: section.sort_order },
            { onConflict: "iso_code,section_number" }
          )
          .select()
          .single();
        if (sectionError) throw sectionError;
        for (const subsection of section.subsections) {
          const { data: subsectionData, error: subsectionError } = await supabase
            .from("iso_criteria_subsections")
            .upsert(
              { section_id: sectionData.id, subsection_number: subsection.subsection_number, title: subsection.title, title_en: subsection.title, sort_order: subsection.sort_order },
              { onConflict: "section_id,subsection_number" }
            )
            .select()
            .single();
          if (subsectionError) throw subsectionError;
          for (let i = 0; i < subsection.questions.length; i++) {
            const { error: questionError } = await supabase
              .from("iso_criteria_questions")
              .upsert({ subsection_id: subsectionData.id, question_text: subsection.questions[i], question_text_en: subsection.questions[i], sort_order: i + 1 });
            if (questionError) throw questionError;
          }
        }
      }
      toast({ title: "Gespeichert", description: `${data.iso_name} criteria imported successfully!` });
      await fetchIsoCriteria(isoCode);
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message || "Failed to import ISO criteria", variant: "destructive" });
    } finally {
      setImportingISO(null);
    }
  };

  const handleAddCustomCriterion = async () => {
    if (!activeISOForCriteria || !newCriterionId.trim() || !newCriterionText.trim()) {
      toast({ title: "Fehler", description: "Please enter both Criterion ID and Title", variant: "destructive" });
      return;
    }
    try {
      const firstPart = newCriterionId.split(".")[0];
      const sectionNumber = /^[1-7]$/.test(firstPart) ? firstPart : "7";
      const { data: sectionData, error: sectionError } = await supabase
        .from("iso_criteria_sections")
        .select("id")
        .eq("iso_code", activeISOForCriteria)
        .eq("section_number", sectionNumber)
        .single();
      if (sectionError || !sectionData) {
        toast({ title: "Fehler", description: "Could not find section for this ISO.", variant: "destructive" });
        return;
      }
      const { data: existingSubsections } = await supabase
        .from("iso_criteria_subsections")
        .select("sort_order")
        .eq("section_id", sectionData.id)
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextSortOrder = (existingSubsections?.[0]?.sort_order || 0) + 1;
      const { error: insertError } = await supabase
        .from("iso_criteria_subsections")
        .insert({
          section_id: sectionData.id,
          subsection_number: newCriterionId,
          title: newCriterionText,
          title_en: newCriterionText,
          company_id: companyId,
          sort_order: nextSortOrder,
        });
      if (insertError) throw insertError;
      toast({ title: "Gespeichert", description: "Kriterium wurde hinzugefügt" });
      setNewCriterionId("");
      setNewCriterionText("");
      await fetchIsoCriteria(activeISOForCriteria);
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message || "Kriterium konnte nicht hinzugefügt werden", variant: "destructive" });
    }
  };

  const handleDeleteCriterion = async (subsectionId: string) => {
    if (!activeISOForCriteria) return;
    try {
      const { error } = await supabase.from("iso_criteria_subsections").delete().eq("id", subsectionId).select();
      if (error) throw error;
      toast({ title: "Gespeichert", description: "Kriterium wurde gelöscht" });
      const isoCode = activeISOForCriteria;
      if (isoCode && isoCriteriaData[isoCode]) {
        const updatedSections = isoCriteriaData[isoCode].map((section: any) => ({
          ...section,
          subsections: section.subsections?.filter((sub: any) => sub.id !== subsectionId) || [],
        }));
        setIsoCriteriaData((prev: any) => ({ ...prev, [isoCode]: updatedSections }));
      }
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message || "Kriterium konnte nicht gelöscht werden", variant: "destructive" });
    }
  };

  const handleDeleteCriteriaBatch = async (subsectionIds: string[]) => {
    if (!activeISOForCriteria || subsectionIds.length === 0) return;
    try {
      const { error } = await supabase.from("iso_criteria_subsections").delete().in("id", subsectionIds);
      if (error) throw error;
      toast({ title: "Gespeichert", description: `${subsectionIds.length} criterion(s) deleted successfully` });
      const isoCode = activeISOForCriteria;
      if (isoCode && isoCriteriaData[isoCode]) {
        const updatedSections = isoCriteriaData[isoCode].map((section: any) => ({
          ...section,
          subsections: section.subsections?.filter((sub: any) => !subsectionIds.includes(sub.id)) || [],
        }));
        setIsoCriteriaData((prev: any) => ({ ...prev, [isoCode]: updatedSections }));
      }
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message || "Kriterien konnten nicht gelöscht werden", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* ISO Selection & Criteria */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Audits &amp; checklists</CardTitle>
            </div>
            <Badge className="bg-green-600 text-white hover:bg-green-700 px-4 py-1 text-sm">Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* ISO Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-base">ISO Selection</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const allISOIds = predefinedISOs.map((iso) => iso.id);
                      for (const iso of predefinedISOs) {
                        if (!selectedISOs.includes(iso.id)) {
                          await saveISOStandard(iso.id, iso.name, false);
                          await fetchIsoCriteria(iso.id);
                        }
                      }
                      setSelectedISOs(allISOIds);
                      toast({ title: "Gespeichert", description: "All ISOs selected and saved" });
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={async () => {
                      toast({ title: "Gespeichert", description: "ISO selection saved successfully" });
                      await fetchISOStandards();
                    }}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {predefinedISOs.map((iso) => (
                  <div
                    key={iso.id}
                    className={`flex items-center gap-2 px-4 py-2 rounded border-2 cursor-pointer transition-colors ${
                      selectedISOs.includes(iso.id)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white border-gray-300 hover:border-blue-400"
                    }`}
                    onClick={async () => {
                      const isSelected = selectedISOs.includes(iso.id);
                      if (!isSelected) {
                        await saveISOStandard(iso.id, iso.name, false);
                        setSelectedISOs([...selectedISOs, iso.id]);
                        setActiveISOForCriteria(iso.id);
                        await fetchIsoCriteria(iso.id);
                        toast({ title: "ISO Selected", description: `${iso.name} has been activated` });
                      } else {
                        await deleteISOStandard(iso.id);
                        const newSelectedISOs = selectedISOs.filter((id) => id !== iso.id);
                        setSelectedISOs(newSelectedISOs);
                        if (activeISOForCriteria === iso.id) {
                          setActiveISOForCriteria(newSelectedISOs.length > 0 ? newSelectedISOs[0] : null);
                        }
                        toast({ title: "ISO Deselected", description: `${iso.name} has been deactivated` });
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      id={iso.id}
                      checked={selectedISOs.includes(iso.id)}
                      onChange={() => {}}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor={iso.id} className="cursor-pointer font-medium">
                      {iso.name}
                    </label>
                    <span className="text-sm">{selectedISOs.includes(iso.id) ? "active" : "active"}</span>
                  </div>
                ))}

                {customISOs.map((iso, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 px-4 py-2 rounded border-2 cursor-pointer transition-colors ${
                      selectedISOs.includes(iso) ? "bg-white text-black border-gray-400" : "bg-white border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedISOs.includes(iso)}
                      onChange={async (e) => {
                        if (e.target.checked) {
                          await saveISOStandard(iso, iso, true);
                          setSelectedISOs([...selectedISOs, iso]);
                        } else {
                          await deleteISOStandard(iso);
                          setSelectedISOs(selectedISOs.filter((id) => id !== iso));
                        }
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="font-medium">{iso}</span>
                    <span className="text-sm">active</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 w-6 p-0"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await deleteISOStandard(iso);
                        setCustomISOs(customISOs.filter((_, i) => i !== index));
                        setSelectedISOs(selectedISOs.filter((id) => id !== iso));
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Custom ISO */}
            <div className="flex gap-2 max-w-xl">
              <Input
                placeholder="Add custom ISO"
                value={newCustomISO}
                onChange={(e) => setNewCustomISO(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && newCustomISO.trim()) {
                    await saveISOStandard(newCustomISO.trim(), newCustomISO.trim(), true);
                    setCustomISOs([...customISOs, newCustomISO.trim()]);
                    setSelectedISOs([...selectedISOs, newCustomISO.trim()]);
                    setNewCustomISO("");
                  }
                }}
                className="flex-1"
              />
              <Button
                onClick={async () => {
                  if (newCustomISO.trim()) {
                    await saveISOStandard(newCustomISO.trim(), newCustomISO.trim(), true);
                    setCustomISOs([...customISOs, newCustomISO.trim()]);
                    setSelectedISOs([...selectedISOs, newCustomISO.trim()]);
                    setNewCustomISO("");
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ISO Criteria Management */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {selectedISOs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No ISO selected</p>
                <p className="text-sm">Please select an ISO above</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">Criteria for:</span>
                    <div className="flex gap-2">
                      {selectedISOs.map((isoId) => {
                        const isoCodeMap: { [key: string]: string } = {
                          ISO_45001: "ISO 45001",
                          ISO_14001: "ISO 14001",
                          ISO_9001: "ISO 9001",
                        };
                        const displayName = isoCodeMap[isoId] || isoId;
                        const isActive = activeISOForCriteria === isoId;
                        return (
                          <Button
                            key={isoId}
                            variant="outline"
                            size="sm"
                            className={`${
                              isActive
                                ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                                : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
                            }`}
                            onClick={() => setActiveISOForCriteria(isoId)}
                          >
                            {displayName}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!activeISOForCriteria) return;
                        const isoCodeMap: { [key: string]: string } = {
                          ISO_45001: "ISO_45001",
                          ISO_14001: "ISO_14001",
                          ISO_9001: "ISO_9001",
                        };
                        const isoCode = isoCodeMap[activeISOForCriteria];
                        if (!isoCode) return;
                        const sections = isoCriteriaData[isoCode];
                        if (!sections) return;

                        const allSectionKeys: string[] = [];
                        const allCriteriaIds: string[] = [];
                        const groupedSections: { [key: string]: any[] } = {};
                        sections?.forEach((section: any) => {
                          section.subsections?.forEach((subsection: any) => {
                            const mainNumber = subsection.subsection_number?.split(".")[0] || section.section_number;
                            if (!groupedSections[mainNumber]) groupedSections[mainNumber] = [];
                            groupedSections[mainNumber].push(subsection);
                            allCriteriaIds.push(`${isoCode}-${subsection.id}`);
                          });
                          allCriteriaIds.push(`${isoCode}-section-${section.section_number}`);
                        });
                        Object.keys(groupedSections).forEach((sectionNum) => {
                          allSectionKeys.push(`${isoCode}-${sectionNum}`);
                        });

                        setExpandedSections((prev) => {
                          const filtered = prev.filter(k => !k.startsWith(`${isoCode}-`));
                          return [...filtered, ...allSectionKeys];
                        });
                        setSelectedCriteria((prev) => {
                          const filtered = prev.filter(id => !id.startsWith(`${isoCode}-`));
                          return [...filtered, ...allCriteriaIds];
                        });

                        if (companyId) {
                          const newCriteria = selectedCriteria.filter(id => !id.startsWith(`${isoCode}-`)).concat(allCriteriaIds);
                          localStorage.setItem(`selectedCriteria_${companyId}`, JSON.stringify(newCriteria));
                        }
                        toast({
                          title: "All Selected",
                          description: `All criteria for ${isoCodeMap[activeISOForCriteria] || activeISOForCriteria} selected (${allCriteriaIds.length} items)`,
                        });
                      }}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        if (companyId) {
                          localStorage.setItem(`selectedCriteria_${companyId}`, JSON.stringify(selectedCriteria));
                        }
                        toast({ title: "Gespeichert", description: `Criteria selection saved (${selectedCriteria.length} items)` });
                      }}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>

                {/* Criteria List */}
                <div className="space-y-1">
                  {activeISOForCriteria ? (() => {
                    const isoCodeMap: { [key: string]: string } = {
                      ISO_45001: "ISO_45001",
                      ISO_14001: "ISO_14001",
                      ISO_9001: "ISO_9001",
                    };
                    const isoCode = isoCodeMap[activeISOForCriteria];
                    if (!isoCode) return null;
                    const sections = isoCriteriaData[isoCode];
                    if (!sections || sections.length === 0)
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No criteria available for this ISO</p>
                        </div>
                      );

                    const groupedSections: { [key: string]: any[] } = {};
                    sections?.forEach((section: any) => {
                      section.subsections?.forEach((subsection: any) => {
                        const mainNumber = subsection.subsection_number?.split(".")[0] || section.section_number;
                        if (!groupedSections[mainNumber]) groupedSections[mainNumber] = [];
                        groupedSections[mainNumber].push(subsection);
                      });
                    });

                    return Object.keys(groupedSections)
                      .sort((a, b) => parseFloat(a) - parseFloat(b))
                      .map((sectionNum) => {
                        const subsections = groupedSections[sectionNum];
                        const isExpanded = expandedSections.includes(`${isoCode}-${sectionNum}`);
                        return (
                          <div key={`${isoCode}-${sectionNum}`}>
                            <div
                              className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 border-b cursor-pointer"
                              onClick={() => {
                                setExpandedSections((prev) =>
                                  isExpanded
                                    ? prev.filter((k) => k !== `${isoCode}-${sectionNum}`)
                                    : [...prev, `${isoCode}-${sectionNum}`]
                                );
                              }}
                            >
                              <input
                                type="checkbox"
                                className="w-4 h-4 mt-1 cursor-pointer"
                                checked={selectedCriteria.includes(`${isoCode}-section-${sectionNum}`)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const criteriaId = `${isoCode}-section-${sectionNum}`;
                                  const newCriteria = e.target.checked
                                    ? [...selectedCriteria, criteriaId]
                                    : selectedCriteria.filter((id) => id !== criteriaId);
                                  setSelectedCriteria(newCriteria);
                                  if (companyId) {
                                    localStorage.setItem(`selectedCriteria_${companyId}`, JSON.stringify(newCriteria));
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {sectionNum}{" "}
                                  {sections.find((s: any) => s.section_number === sectionNum)?.title || subsections[0]?.title}
                                </div>
                              </div>
                              {!/^[1-7]$/.test(sectionNum) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const subsectionIds = subsections.map((s: any) => s.id);
                                    handleDeleteCriteriaBatch(subsectionIds);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>

                            {isExpanded && subsections.map((subsection: any) => {
                              const questionsExpanded = expandedQuestions.has(subsection.id);
                              return (
                                <div key={subsection.id}>
                                  <div
                                    className="flex items-start gap-3 px-3 py-2 pl-10 hover:bg-gray-50 border-b bg-gray-50/50 cursor-pointer"
                                    onClick={() => {
                                      const newExpanded = new Set(expandedQuestions);
                                      if (questionsExpanded) {
                                        newExpanded.delete(subsection.id);
                                      } else {
                                        newExpanded.add(subsection.id);
                                      }
                                      setExpandedQuestions(newExpanded);
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 mt-1 cursor-pointer"
                                      checked={selectedCriteria.includes(`${isoCode}-${subsection.id}`)}
                                      onChange={(e) => {
                                        const criteriaId = `${isoCode}-${subsection.id}`;
                                        const newCriteria = e.target.checked
                                          ? [...selectedCriteria, criteriaId]
                                          : selectedCriteria.filter((id) => id !== criteriaId);
                                        setSelectedCriteria(newCriteria);
                                        if (companyId) {
                                          localStorage.setItem(`selectedCriteria_${companyId}`, JSON.stringify(newCriteria));
                                        }
                                      }}
                                    />
                                    {subsection.questions && subsection.questions.length > 0 && (
                                      <div className="text-gray-400">
                                        {questionsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">
                                        {subsection.subsection_number}{" "}
                                        {language === "en" ? subsection.title_en || subsection.title : subsection.title}
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteCriterion(subsection.id);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>

                                  {questionsExpanded && subsection.questions && subsection.questions.length > 0 && (
                                    <div className="ml-16 border-l-2 border-gray-200 pl-4">
                                      {subsection.questions.map((question: any) => (
                                        <div key={question.id} className="py-2 text-sm text-gray-600">
                                          <span className="font-medium text-gray-400 mr-2">•</span>
                                          {language === "en" ? question.question_text_en || question.question_text : question.question_text}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      });
                  })() : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Please select an ISO above to view its criteria</p>
                    </div>
                  )}
                </div>

                {/* Add Criterion Inputs */}
                <div className="flex gap-2 pt-4">
                  <Input
                    placeholder="Section.Subsection (e.g. 1.8, 3.5)"
                    className="w-64"
                    value={newCriterionId}
                    onChange={(e) => setNewCriterionId(e.target.value)}
                  />
                  <Input
                    placeholder="Enter criterion title"
                    className="flex-1"
                    value={newCriterionText}
                    onChange={(e) => setNewCriterionText(e.target.value)}
                  />
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleAddCustomCriterion}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>

                <div className="pt-4 text-sm text-muted-foreground">
                  <span className="font-semibold">Note:</span>{" "}
                  Sub-points of the selected criteria are automatically generated as individual checklist items in the audit and can be checked off individually.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Risk Matrix Labels */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Risikomatrix-Labels
              </CardTitle>
              <CardDescription>Passe Achsen- und Ergebnisbeschriftungen an eure Nomenklatur an.</CardDescription>
            </div>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => saveCompanySettings({ risk_matrix_labels: companySettings.risk_matrix_labels })}
              disabled={savingSettings}
            >
              {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Speichern
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 p-6 bg-white rounded-lg border">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-3">Likelihood</h4>
                <div className="space-y-2">
                  {companySettings.risk_matrix_labels.likelihood.map((label, idx) => (
                    <Input
                      key={`likelihood-${idx}`}
                      value={label}
                      onChange={(e) => {
                        const updated = [...companySettings.risk_matrix_labels.likelihood];
                        updated[idx] = e.target.value;
                        setCompanySettings((prev) => ({
                          ...prev,
                          risk_matrix_labels: { ...prev.risk_matrix_labels, likelihood: updated },
                        }));
                      }}
                      className="bg-white border-gray-300"
                    />
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Severity</h4>
                <div className="space-y-2">
                  {companySettings.risk_matrix_labels.severity.map((label, idx) => (
                    <Input
                      key={`severity-${idx}`}
                      value={label}
                      onChange={(e) => {
                        const updated = [...companySettings.risk_matrix_labels.severity];
                        updated[idx] = e.target.value;
                        setCompanySettings((prev) => ({
                          ...prev,
                          risk_matrix_labels: { ...prev.risk_matrix_labels, severity: updated },
                        }));
                      }}
                      className="bg-white border-gray-300"
                    />
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Result</h4>
                <div className="space-y-2">
                  {companySettings.risk_matrix_labels.result.map((label, idx) => (
                    <Input
                      key={`result-${idx}`}
                      value={label}
                      onChange={(e) => {
                        const updated = [...companySettings.risk_matrix_labels.result];
                        updated[idx] = e.target.value;
                        setCompanySettings((prev) => ({
                          ...prev,
                          risk_matrix_labels: { ...prev.risk_matrix_labels, result: updated },
                        }));
                      }}
                      className="bg-white border-gray-300"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 pt-4 border-t">
              {[
                { key: "low", label: "Farbe: Niedrig", tag: "low" },
                { key: "medium", label: "Farbe: Mittel", tag: "medium" },
                { key: "high", label: "Farbe: Hoch", tag: "high" },
                { key: "very_high", label: "Farbe: Sehr hoch", tag: "very high" },
              ].map((c) => (
                <div key={c.key}>
                  <label className="text-sm mb-2 block">
                    {c.label} <span className="text-red-600">{c.tag}</span>
                  </label>
                  <div className="relative h-12 rounded border-2 border-gray-300 overflow-hidden">
                    <input
                      type="color"
                      value={(companySettings.risk_matrix_labels.colors as any)[c.key] || "#22c55e"}
                      onChange={(e) => {
                        const updatedColors = { ...companySettings.risk_matrix_labels.colors, [c.key]: e.target.value };
                        setCompanySettings((prev) => ({
                          ...prev,
                          risk_matrix_labels: { ...prev.risk_matrix_labels, colors: updatedColors },
                        }));
                      }}
                      className="absolute inset-0 w-full h-full cursor-pointer border-0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment Intervals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Risk Assessment Intervals
              </CardTitle>
              <CardDescription>Set up recurring risk assessment schedules</CardDescription>
            </div>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => saveCompanySettings({ gbu_intervals: companySettings.gbu_intervals, audit_intervals: companySettings.audit_intervals })}
              disabled={savingSettings}
            >
              {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Speichern
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Prüfintervalle &amp; Fälligkeiten</h4>
              <p className="text-sm text-muted-foreground mb-4">Define one or more interval options for GBU and Audits.</p>

              {/* GBU Intervals */}
              <div className="mb-4">
                <Label className="mb-2 block">GBU intervals (months)</Label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {companySettings.gbu_intervals.map((interval, idx) => (
                    <div key={`gbu-${idx}`} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
                      <span className="text-sm">{interval} mo</span>
                      <button
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          const updated = companySettings.gbu_intervals.filter((_, i) => i !== idx);
                          setCompanySettings((prev) => ({ ...prev, gbu_intervals: updated }));
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 12"
                    type="number"
                    className="max-w-[200px]"
                    value={newGbuInterval}
                    onChange={(e) => setNewGbuInterval(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newGbuInterval.trim()) {
                        const val = parseInt(newGbuInterval, 10);
                        if (!isNaN(val) && !companySettings.gbu_intervals.includes(val)) {
                          setCompanySettings((prev) => ({ ...prev, gbu_intervals: [...prev.gbu_intervals, val].sort((a, b) => a - b) }));
                        }
                        setNewGbuInterval("");
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const val = parseInt(newGbuInterval, 10);
                      if (!isNaN(val) && !companySettings.gbu_intervals.includes(val)) {
                        setCompanySettings((prev) => ({ ...prev, gbu_intervals: [...prev.gbu_intervals, val].sort((a, b) => a - b) }));
                      }
                      setNewGbuInterval("");
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Audit Intervals */}
              <div>
                <Label className="mb-2 block">Audit intervals (months)</Label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {companySettings.audit_intervals.map((interval, idx) => (
                    <div key={`audit-${idx}`} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
                      <span className="text-sm">{interval} mo</span>
                      <button
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          const updated = companySettings.audit_intervals.filter((_, i) => i !== idx);
                          setCompanySettings((prev) => ({ ...prev, audit_intervals: updated }));
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 12"
                    type="number"
                    className="max-w-[200px]"
                    value={newAuditInterval}
                    onChange={(e) => setNewAuditInterval(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newAuditInterval.trim()) {
                        const val = parseInt(newAuditInterval, 10);
                        if (!isNaN(val) && !companySettings.audit_intervals.includes(val)) {
                          setCompanySettings((prev) => ({ ...prev, audit_intervals: [...prev.audit_intervals, val].sort((a, b) => a - b) }));
                        }
                        setNewAuditInterval("");
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const val = parseInt(newAuditInterval, 10);
                      if (!isNaN(val) && !companySettings.audit_intervals.includes(val)) {
                        setCompanySettings((prev) => ({ ...prev, audit_intervals: [...prev.audit_intervals, val].sort((a, b) => a - b) }));
                      }
                      setNewAuditInterval("");
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Logic */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Logic
              </CardTitle>
              <CardDescription>Set up automated notifications and reminders</CardDescription>
            </div>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => saveCompanySettings({ notification_settings: companySettings.notification_settings })}
              disabled={savingSettings}
            >
              {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Speichern
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Benachrichtigungslogik</h4>
              <p className="text-sm text-muted-foreground mb-4">Define reminders in days before due dates</p>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { key: "examinations_days", label: "Examinations (days before)" },
                  { key: "measures_days", label: "Measures (days before)" },
                  { key: "qualifications_days", label: "Qualifications (days before)" },
                  { key: "audits_days", label: "Audits (days before)" },
                  { key: "gbu_review_days", label: "GBU review (days before)" },
                ].map((item) => (
                  <div key={item.key}>
                    <Label className="mb-2 block">{item.label}</Label>
                    <Input
                      type="number"
                      value={(companySettings.notification_settings as any)[item.key]}
                      onChange={(e) =>
                        setCompanySettings((prev) => ({
                          ...prev,
                          notification_settings: {
                            ...prev.notification_settings,
                            [item.key]: Number(e.target.value),
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
