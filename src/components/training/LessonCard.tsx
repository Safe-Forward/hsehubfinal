import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Video,
  FileText,
  Type,
  Code,
  FolderOpen,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  CheckCircle2,
  Circle,
  Play,
  CheckCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LessonCardProps {
  lesson: {
    id: string;
    course_id: string;
    name: string;
    type: "subchapter" | "video_audio" | "pdf" | "text" | "iframe";
    status: "draft" | "published";
    content_data?: any;
  };
  onDelete?: (lessonId: string, lessonName: string) => void;
  onDuplicate?: (lessonId: string) => void;
  onToggleStatus?: (lessonId: string, currentStatus: string) => void;
  isCompleted?: boolean;
  lessonNumber?: number;
  isAdmin?: boolean;
}

export default function LessonCard({
  lesson,
  onDelete,
  onDuplicate,
  onToggleStatus,
  isCompleted = false,
  lessonNumber,
  isAdmin = false,
}: LessonCardProps) {
  const navigate = useNavigate();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video_audio": return <Video className="w-4 h-4" />;
      case "pdf": return <FileText className="w-4 h-4" />;
      case "text": return <Type className="w-4 h-4" />;
      case "iframe": return <Code className="w-4 h-4" />;
      case "subchapter": return <FolderOpen className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "video_audio": return "Video";
      case "pdf": return "PDF";
      case "text": return "Text";
      case "iframe": return "iFrame";
      case "subchapter": return "Kapitel";
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "video_audio": return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      case "pdf": return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      case "text": return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "iframe": return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "subchapter": return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const handleEdit = () => navigate(`/training/${lesson.course_id}/lesson/${lesson.id}`);
  const handleView = () => navigate(`/training/${lesson.course_id}/lesson/${lesson.id}/view`);

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all group cursor-pointer hover:shadow-md ${
        isCompleted
          ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
          : "border-border hover:border-primary/30 bg-card"
      }`}
      onClick={isAdmin ? handleEdit : handleView}
    >
      {/* Nummer / Status */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
        isCompleted
          ? "bg-green-500 text-white"
          : "bg-muted text-muted-foreground"
      }`}>
        {isCompleted ? <CheckCircle className="w-5 h-5" /> : (lessonNumber || "·")}
      </div>

      {/* Typ-Icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeColor(lesson.type)}`}>
        {getTypeIcon(lesson.type)}
      </div>

      {/* Inhalt */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm truncate">{lesson.name}</h3>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeColor(lesson.type)}`}>
            {getTypeLabel(lesson.type)}
          </span>
          {isAdmin && (
            <Badge
              variant={lesson.status === "published" ? "default" : "secondary"}
              className="text-xs h-5"
            >
              {lesson.status === "draft" ? "Entwurf" : "Veroeffentlicht"}
            </Badge>
          )}
          {isCompleted && (
            <span className="text-xs text-green-600 font-medium">Abgeschlossen</span>
          )}
        </div>
        {lesson.content_data?.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {lesson.content_data.description}
          </p>
        )}
      </div>

      {/* Play Button für Nutzer */}
      {!isAdmin && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110 ${
          isCompleted ? "bg-green-500" : "bg-primary"
        }`}>
          {isCompleted
            ? <CheckCircle className="w-4 h-4 text-white" />
            : <Play className="w-4 h-4 text-white ml-0.5" />
          }
        </div>
      )}

      {/* Admin Dropdown */}
      {isAdmin && onDelete && onDuplicate && onToggleStatus && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 h-8 w-8"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(); }}>
              <Edit className="w-4 h-4 mr-2" />
              Bearbeiten
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(lesson.id); }}>
              <Copy className="w-4 h-4 mr-2" />
              Duplizieren
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleStatus(lesson.id, lesson.status); }}>
              {lesson.status === "draft" ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" />Veroeffentlichen</>
              ) : (
                <><Circle className="w-4 h-4 mr-2" />Als Entwurf</>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(lesson.id, lesson.name); }}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Loeschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
