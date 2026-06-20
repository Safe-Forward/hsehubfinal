---
slug: dashboard-ma-nahmen-widgets-kpi-card-sid
status: complete
commit: d9acb91
---

# Ergebnis: Dashboard Maßnahmen-Widgets

## Was implementiert wurde

### Dashboard.tsx
- `openMeasures` + neue `overdueMeasures` aus `DEFAULT_KPI_IDS` entfernt (beide per Default DEAKTIVIERT)
- `overdueMeasures` KPI-Card hinzugefügt (rose/red Gradient, AlertTriangle Icon)
- `SIDEBAR_WIDGET_IDS = ["sidebarMeasuresBadge"]` — virtuell, kein Card-Render in Grid
- `sidebarWidgetLabels` für Popover-Anzeige
- Kacheln-Popover: Trennlinie + "Sidebar"-Abschnitt für Badge-Widget
- Grid-Render filtert SIDEBAR_WIDGET_IDS raus
- `toggleKpiVisibility` dispatcht `hse_kpi_prefs_changed` CustomEvent für Same-Tab-Sync

### MainLayout.tsx
- `companyId` aus `useAuth()`
- `showMeasuresBadge` + `openMeasuresCount` State
- `fetchOpenMeasures()`: Supabase-Count auf `measures` (status != completed)
- useEffect: liest localStorage `hse_dashboard_visible_kpis`, reagiert auf `storage` + `hse_kpi_prefs_changed`
- Badge neben Maßnahmen-Link: lila Pill mit Zahl, nur wenn > 0

## Commit
d9acb91 → main → Vercel deployed
