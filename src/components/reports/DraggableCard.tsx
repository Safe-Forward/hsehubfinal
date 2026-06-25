import { Card, CardContent } from "@/components/ui/card";
import { GripVertical, EyeOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function DraggableCard({
  title,
  subtitle,
  value,
  icon,
  color,
  onHide,
}: {
  title: string;
  subtitle: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  onHide?: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Card className="dashboard-grid-card border hover:border-primary/50 transition-colors shadow-sm h-full group">
      <div className="drag-handle border-b cursor-grab active:cursor-grabbing flex-shrink-0 flex items-center justify-between px-2">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
        {onHide && (
          <button
            onClick={(e) => { e.stopPropagation(); onHide(); }}
            className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100"
            title={t("reports.draggableCard.hide")}
          >
            <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
      <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-3 overflow-hidden">
        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center flex-shrink-0 mb-2`}>
          {icon}
        </div>
        <h3 className="font-medium text-foreground text-sm leading-tight">{title}</h3>
        <p className="text-muted-foreground text-xs mb-1">{subtitle}</p>
        <p className="font-bold text-foreground text-xl">{value}</p>
      </CardContent>
    </Card>
  );
}
