import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, RotateCcw } from "lucide-react";
import { getTileConfig, saveTileConfig, resetTileConfig, TileConfig } from "./TileConfigStore";

interface Props {
  sectionId: string;
  tileId: string;
  defaultTitle: string;
  defaultSubtitle?: string;
  onSave: (cfg: TileConfig) => void;
  onReset: () => void;
}

export function TileEditPopover({ sectionId, tileId, defaultTitle, defaultSubtitle, onSave, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const cfg = getTileConfig(sectionId, tileId);
  const [title, setTitle] = useState(cfg.title ?? defaultTitle);
  const [subtitle, setSubtitle] = useState(cfg.subtitle ?? (defaultSubtitle ?? ""));

  const handleSave = () => {
    const newCfg: TileConfig = { title, subtitle };
    saveTileConfig(sectionId, tileId, newCfg);
    onSave(newCfg);
    setOpen(false);
  };

  const handleReset = () => {
    resetTileConfig(sectionId, tileId);
    setTitle(defaultTitle);
    setSubtitle(defaultSubtitle ?? "");
    onReset();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100"
          title="Kachel bearbeiten"
        >
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold">Kachel anpassen</p>
        <div className="space-y-1">
          <Label className="text-xs">Titel</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Untertitel</Label>
          <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1 h-8" onClick={handleSave}>Speichern</Button>
          <Button size="sm" variant="outline" className="h-8" onClick={handleReset} title="Zurücksetzen">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
