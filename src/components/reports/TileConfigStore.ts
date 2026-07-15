// Speichert Kachel-Konfigurationsoverrides in localStorage

export interface TileConfig {
  title?: string;
  subtitle?: string;
  colorClass?: string;
}

const KEY = (sectionId: string, tileId: string) => `hse_tile_cfg_${sectionId}_${tileId}`;

export function getTileConfig(sectionId: string, tileId: string): TileConfig {
  try {
    const raw = localStorage.getItem(KEY(sectionId, tileId));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveTileConfig(sectionId: string, tileId: string, cfg: TileConfig) {
  localStorage.setItem(KEY(sectionId, tileId), JSON.stringify(cfg));
}

export function resetTileConfig(sectionId: string, tileId: string) {
  localStorage.removeItem(KEY(sectionId, tileId));
}
