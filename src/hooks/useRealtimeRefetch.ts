import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// 60s Fallback. Alle Tabellen, für die dieser Hook genutzt wird, sind in der
// supabase_realtime-Publikation registriert (siehe Migration
// enable_realtime_for_polled_tables) — Layer 1 ist damit der Normalfall,
// dieses Intervall fängt nur kurze Verbindungsaussetzer ab. Vorher stand
// hier 30s bei jeder offenen Seite, was bei vielen gleichzeitig geöffneten
// Tabs unnötige Hintergrundlast verursacht hat, ohne dass Realtime damals
// überhaupt aktiv war.
const POLL_INTERVAL_MS = 60000;

/**
 * Zwei-Schichten-Sync:
 * 1. Supabase postgres_changes (Echtzeit) — primärer Mechanismus.
 * 2. Polling als Fallback — greift, falls die Realtime-Verbindung kurz
 *    getrennt ist oder eine Tabelle künftig aus der Publikation fällt.
 *
 * onRefetch wird in einem Ref gehalten — kein useCallback beim Aufrufer nötig.
 */
export function useRealtimeRefetch(
  tables: string[],
  companyId: string | null,
  onRefetch: () => void
) {
  const refetchRef = useRef(onRefetch);
  useEffect(() => { refetchRef.current = onRefetch; });

  useEffect(() => {
    if (!companyId) return;

    // ── Layer 1: Supabase Realtime (postgres_changes) ──────────────────────
    const channelName = `realtime-${tables.join("-")}-${companyId}`;
    const channel = supabase.channel(channelName);

    tables.forEach((table) => {
      (channel as any).on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `company_id=eq.${companyId}`,
        },
        () => refetchRef.current()
      );
    });

    channel.subscribe((status: string) => {
      // Log nur im Dev-Modus
      if (import.meta.env.DEV) {
        console.log(`[Realtime] ${channelName}: ${status}`);
      }
    });

    // ── Layer 2: Polling-Fallback ───────────────────────────────────────────
    const pollInterval = window.setInterval(() => {
      refetchRef.current();
    }, POLL_INTERVAL_MS);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, tables.join(",")]);
}
