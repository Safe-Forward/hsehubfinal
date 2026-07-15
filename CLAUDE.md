# CLAUDE.md – HSEHub Projektregeln

## Pflicht: Nach jeder Änderung committen & pushen

**Dieses Projekt läuft über Lovable**, das mit GitHub synchronisiert:
`https://github.com/Safe-Forward/hsehubfinal`

Lokale Dateiänderungen sind im Browser **nicht sichtbar**, bis sie gepusht sind.

**Nach jeder abgeschlossenen Änderung IMMER:**
```bash
git add -A
git commit -m "feat: ..."
git push origin main
```

Kein Push = keine Änderung sichtbar. Das ist die wichtigste Regel dieses Projekts.

Solange keine Testumgebung existiert, gehen alle Änderungen direkt auf `main`.

---

## Projekt

**HSEHub** — deutschsprachige HSE-/Arbeitssicherheits-Plattform (Solo Leveling-inspiriertes Design).
Tech-Stack: Vite + React + TypeScript + shadcn/ui + Supabase (Projekt: `mzqypusyxvyuiesuhjcw`, eu-central-1)

Lokaler Dev-Server: `localhost:8080` (nur zum Testen, nicht für den Nutzer relevant)

## Sprache

Die gesamte UI ist auf **Deutsch**. Keine englischen Strings in Komponenten, Labels, Platzhaltern, Fehlermeldungen oder Leer-Zuständen.

## Arbeitsverzeichnis

`/private/tmp/hsehub_code/` — das ist das korrekte Projektverzeichnis.
`/Users/pavelrohn/Desktop/apps/web/` ist ein **separates, anderes Produkt** (SAFE.Core) — dort niemals Änderungen vornehmen.
