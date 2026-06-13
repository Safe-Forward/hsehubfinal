import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Video, FileText, Type, Code, FolderOpen, ClipboardList } from "lucide-react";

interface LessonTypeSelectorProps {
  value: "subchapter" | "video_audio" | "pdf" | "text" | "iframe" | "quiz";
  onChange: (value: "subchapter" | "video_audio" | "pdf" | "text" | "iframe" | "quiz") => void;
  disabled?: boolean;
}

export default function LessonTypeSelector({
  value,
  onChange,
  disabled = false,
}: LessonTypeSelectorProps) {
  const lessonTypes = [
    { value: "video_audio", label: "Video/Audio", icon: Video },
    { value: "pdf", label: "PDF", icon: FileText },
    { value: "text", label: "Text", icon: Type },
    { value: "iframe", label: "iFrame", icon: Code },
    { value: "subchapter", label: "Kapitel", icon: FolderOpen },
    { value: "quiz", label: "Quiz", icon: ClipboardList },
  ] as const;

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue>
          <div className="flex items-center gap-2">
            {lessonTypes.find((t) => t.value === value)?.icon && (
              <>
                {(() => {
                  const Icon = lessonTypes.find((t) => t.value === value)!.icon;
                  return <Icon className="w-4 h-4" />;
                })()}
              </>
            )}
            <span>{lessonTypes.find((t) => t.value === value)?.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {lessonTypes.map((type) => (
          <SelectItem key={type.value} value={type.value}>
            <div className="flex items-center gap-2">
              <type.icon className="w-4 h-4" />
              <span>{type.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
