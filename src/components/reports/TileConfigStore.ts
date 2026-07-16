// Speichert Kachel-Konfigurationsoverrides in localStorage

export interface TileConfig {
  title?: string;
  subtitle?: string;
  colorClass?: string;
  chartConfig?: ChartConfig;
}

export interface ChartConfig {
  metric: string;
  groupBy: string;
  chartType: 'pie' | 'bar' | 'line';
  dateRange: { type: string; startDate?: string; endDate?: string };
  tagFilters?: string[];
  title?: string;
}

const KEY = (sectionId: string, tileId: string) => `hse_tile_cfg_${sectionId}_${tileId}`;
const CHART_KEY = (sectionId: string, tileId: string) => `tile_chart_${sectionId}_${tileId}`;

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

export function getChartConfig(sectionId: string, tileId: string): ChartConfig | null {
  try {
    const raw = localStorage.getItem(CHART_KEY(sectionId, tileId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveChartConfig(sectionId: string, tileId: string, cfg: ChartConfig) {
  localStorage.setItem(CHART_KEY(sectionId, tileId), JSON.stringify(cfg));
}

export function resetChartConfig(sectionId: string, tileId: string) {
  localStorage.removeItem(CHART_KEY(sectionId, tileId));
}
