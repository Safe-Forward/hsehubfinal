---
status: complete
---

# Summary: Training Teilnahmeverfolgung & Pflichtschulungen

## Was wurde gebaut

### DB (Supabase)
- `courses.is_mandatory` (boolean, default false) + `courses.renewal_months` (int)
- Neue Tabelle `training_participations` mit RLS (registered/completed/absent)

### Training.tsx
- Pflichtschulung-Toggle beim Kurse erstellen + Wiederholungsintervall
- "Pflicht"-Label auf Kurs-Kacheln (rotes Badge oben links)
- Lernfortschritt-Tab: Teilnahme-Status-Badges pro Mitarbeiter
- Zwei Buttons pro Mitarbeiter: "Teilgenommen" (grün) / "Abwesend" (rot)
- "Zertifikat ausstellen"-Button wenn Teilgenommen aber kein Zertifikat → PDF-Download
- Realtime-Sync (silent, kein Loading-Spinner)

### MainLayout.tsx
- Amber-Badge bei "Schulungen"-Navlink
- Zeigt Anzahl Mitarbeiter mit mindestens einer offenen Pflichtschulung
- Realtime-aktualisiert über useRealtimeRefetch

## Commit
`db1e6a6` — pushed to main, Vercel deployed

## Hinweis
`training_participations` muss manuell in der Supabase-Publication aktiviert werden:
Supabase Dashboard → Database → Publications → supabase_realtime → training_participations
