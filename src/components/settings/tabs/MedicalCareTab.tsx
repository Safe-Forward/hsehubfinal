import { CheckSquare, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

interface MedicalCareTabProps {
  selectedGInvestigations: string[];
  toggleGInvestigation: (code: string) => void;
  toggleSelectAll: () => void;
  isAllSelected: () => boolean;
  saveGInvestigations: () => void;
}

export function MedicalCareTab({
  selectedGInvestigations,
  toggleGInvestigation,
  toggleSelectAll,
  isAllSelected,
  saveGInvestigations,
}: MedicalCareTabProps) {
  const { t } = useLanguage();

  const gCodes = [
    { code: "G 1.1", key: "G1.1" },
    { code: "G 1.2", key: "G1.2" },
    { code: "G 1.3", key: "G1.3" },
    { code: "G 1.4", key: "G1.4" },
    { code: "G 2", key: "G2" },
    { code: "G 3", key: "G3" },
    { code: "G 4", key: "G4" },
    { code: "G 5", key: "G5" },
    { code: "G 6", key: "G6" },
    { code: "G 7", key: "G7" },
    { code: "G 8", key: "G8" },
    { code: "G 9", key: "G9" },
    { code: "G 10", key: "G10" },
    { code: "G 11", key: "G11" },
    { code: "G 12", key: "G12" },
    { code: "G 13", key: "G13" },
    { code: "G 14", key: "G14" },
    { code: "G 15", key: "G15" },
    { code: "G 16", key: "G16" },
    { code: "G 17", key: "G17" },
    { code: "G 18", key: "G18" },
    { code: "G 19", key: "G19" },
    { code: "G 20", key: "G20" },
    { code: "G 21", key: "G21" },
    { code: "G 22", key: "G22" },
    { code: "G 23", key: "G23" },
    { code: "G 24", key: "G24" },
    { code: "G 25", key: "G25" },
    { code: "G 26", key: "G26" },
    { code: "G 27", key: "G27" },
    { code: "G 28", key: "G28" },
    { code: "G 29", key: "G29" },
    { code: "G 30", key: "G30" },
    { code: "G 31", key: "G31" },
    { code: "G 32", key: "G32" },
    { code: "G 33", key: "G33" },
    { code: "G 34", key: "G34" },
    { code: "G 35", key: "G35" },
    { code: "G 36", key: "G36" },
    { code: "G 37", key: "G37" },
    { code: "G 38", key: "G38" },
    { code: "G 39", key: "G39" },
    { code: "G 40", key: "G40" },
    { code: "G 41", key: "G41" },
    { code: "G 42", key: "G42" },
    { code: "G 43", key: "G43" },
    { code: "G 44", key: "G44" },
    { code: "G 45", key: "G45" },
    { code: "G 46", key: "G46" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5" />
          {t("gcode.title")}
        </CardTitle>
        <CardDescription>{t("gcode.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <p className="text-sm text-muted-foreground">
              {selectedGInvestigations.length} {t("gcode.of")} 46{" "}
              {t("gcode.selectedCount")}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              {isAllSelected()
                ? t("gcode.deselectAll")
                : t("gcode.selectAll")}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {gCodes.map((item) => (
              <div
                key={item.code}
                className="flex items-start space-x-3 p-2 hover:bg-muted/30 rounded"
              >
                <input
                  type="checkbox"
                  id={item.code.replace(/\s/g, "-")}
                  className={`w-4 h-4 cursor-pointer mt-1 flex-shrink-0 rounded border-2 transition-all ${
                    selectedGInvestigations.includes(item.code)
                      ? "border-red-500 bg-red-500 text-white accent-red-500"
                      : "border-gray-300 hover:border-red-300"
                  }`}
                  checked={selectedGInvestigations.includes(item.code)}
                  onChange={() => toggleGInvestigation(item.code)}
                />
                <label
                  htmlFor={item.code.replace(/\s/g, "-")}
                  className={`text-sm cursor-pointer flex-1 transition-colors ${
                    selectedGInvestigations.includes(item.code)
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`font-medium ${
                      selectedGInvestigations.includes(item.code)
                        ? "text-red-600"
                        : ""
                    }`}
                  >
                    {item.code}
                  </span>{" "}
                  {t(`gcode.${item.key}`)}
                </label>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={saveGInvestigations}>
              <CheckSquare className="w-4 h-4 mr-2" />
              {t("gcode.saveButton")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
