import { useCallback, useState } from "react";
import { Upload, X, FileVideo, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface FileUploadZoneProps {
  onUploadComplete: (url: string) => void;
  acceptedFileTypes?: string[];
  maxFileSizeMB?: number;
  lessonType: "video_audio" | "pdf" | "text" | "iframe";
  currentFileUrl?: string;
}

export default function FileUploadZone({
  onUploadComplete,
  acceptedFileTypes = ["video/*", "audio/*", "application/pdf"],
  maxFileSizeMB = 500,
  lessonType,
  currentFileUrl,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleCloudinaryUpload = useCallback(() => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim();
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim().replace(/"/g, "");

    console.log("Cloudinary Config:", { cloudName, uploadPreset, lessonType });

    if (!cloudName || !uploadPreset) {
      toast({
        title: "Configuration Error",
        description: "Cloudinary credentials missing in .env",
        variant: "destructive",
      });
      return;
    }

    // Check if Cloudinary is available
    if (!window.cloudinary) {
      toast({
        title: "Upload Error",
        description: "Cloudinary widget not loaded. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    // Use 'video' for video/audio, 'auto' for PDFs
    // 'auto' lets Cloudinary decide - PDFs become 'image' type which is publicly accessible
    // 'raw' requires authentication and causes 401 errors
    const resourceType = lessonType === "video_audio" 
      ? "video" 
      : "auto";  // 'auto' makes PDFs publicly accessible
        
    const allowedFormats =
      lessonType === "video_audio"
        ? ["mp4", "webm", "mov", "avi", "mkv", "mp3", "wav", "ogg", "m4a", "flac"]
        : lessonType === "pdf"
        ? ["pdf"]
        : ["mp4", "webm", "mp3", "pdf", "png", "jpg", "jpeg"];

    const myWidget = window.cloudinary.createUploadWidget(
      {
        cloudName: cloudName,
        uploadPreset: uploadPreset,
        sources: ["local", "google_drive"],
        multiple: false,
        resourceType: resourceType,
        clientAllowedFormats: allowedFormats,
        maxFileSize: maxFileSizeMB * 1024 * 1024,
        folder: "hse-hub-lessons",
        tags: ["lesson", lessonType],
        // Ensure public access for all uploaded files
        publicId: undefined, // Let Cloudinary generate the public ID
        styles: {
          palette: {
            window: "#FFFFFF",
            windowBorder: "#90A0B3",
            tabIcon: "#0078FF",
            menuIcons: "#5A616A",
            textDark: "#000000",
            textLight: "#FFFFFF",
            link: "#0078FF",
            action: "#FF620C",
            inactiveTabIcon: "#0E2F5A",
            error: "#F44235",
            inProgress: "#0078FF",
            complete: "#20B832",
            sourceBg: "#E4EBF1",
          },
        },
      },
      (error: any, result: any) => {
        if (!error && result && result.event === "success") {
          // Use the secure_url directly
          const fileUrl = result.info.secure_url;
          console.log("Uploaded file URL:", fileUrl, "Resource type:", result.info.resource_type);
          onUploadComplete(fileUrl);
          toast({
            title: "Upload Successful",
            description: "Datei wurde hochgeladen",
          });
          setIsUploading(false);
        } else if (error) {
          console.error("Upload error:", error);
          setIsUploading(false);
          if (error.statusText !== "abort") {
            toast({
              title: "Upload Failed",
              description: error.message || "Datei konnte nicht hochgeladen werden",
              variant: "destructive",
            });
          }
        }
      }
    );

    myWidget.open();
  }, [lessonType, maxFileSizeMB, onUploadComplete, toast]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleCloudinaryUpload();
  };

  if (currentFileUrl) {
    return (
      <div className="border-2 border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileVideo className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">File uploaded</p>
              <p className="text-sm text-muted-foreground truncate max-w-md">
                {currentFileUrl}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Download button for PDF */}
            {lessonType === "pdf" && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(currentFileUrl, '_blank', 'noopener,noreferrer');
                }}
                title="View/Download PDF"
              >
                View
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onUploadComplete("")}
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {lessonType === "video_audio" && (
          <div className="mt-4 rounded-lg overflow-hidden bg-black aspect-video">
            <video src={currentFileUrl} controls preload="metadata" className="w-full h-full object-contain" />
          </div>
        )}

        {lessonType === "pdf" && (
          <div className="mt-4 space-y-3">
            {/* PDF embed - using object tag for better rendering */}
            <object
              data={currentFileUrl}
              type="application/pdf"
              className="w-full rounded-lg border-2 border-gray-300"
              style={{ height: '500px' }}
            >
              {/* Fallback for browsers that don't support object tag for PDFs */}
              <embed
                src={currentFileUrl}
                type="application/pdf"
                className="w-full h-full"
              />
            </object>
            <p className="text-xs text-muted-foreground text-center">
              If preview doesn't load, use the View button above to open the PDF
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:bg-muted/50"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="p-4 rounded-full bg-primary/10 text-primary">
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <Upload className="h-8 w-8" />
          )}
        </div>

        <div className="text-center space-y-1">
          <p className="font-medium text-lg">
            {isUploading ? "Uploading..." : "Select files or drop them here"}
          </p>
          <p className="text-sm text-muted-foreground">
            {lessonType === "video_audio" && "Video & Audio formats up to 500MB"}
            {lessonType === "pdf" && "PDF files up to 500MB"}
          </p>
        </div>

        {isUploading && (
          <div className="w-full max-w-xs">
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          onClick={handleCloudinaryUpload}
          disabled={isUploading}
        >
          {isUploading ? "Uploading..." : "Open Upload Widget"}
        </Button>
      </div>
    </div>
  );
}
