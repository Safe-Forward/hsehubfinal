import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const POLL_INTERVAL_MS = 30000; // 30s Fallback — Supabase Realtime ist primär

/**
 * Zwei-Schichten-Sync:
 * 1. Supabase postgres_changes (Echtzeit) — funktioniert sobald Realtime
 *    für die Tabellen im Supabase-Dashboard aktiviert ist.
 * 2. Polling alle 8 Sekunden — greift sofort, unabhängig von Realtime-Config.
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
