import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to Supabase Realtime for one or more tables and calls `onRefetch`
 * whenever any row in those tables changes (INSERT / UPDATE / DELETE).
 *
 * The `onRefetch` callback is held in a ref so callers don't need to wrap it
 * in useCallback — the subscription is only recreated when `companyId` changes.
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

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, tables.join(",")]);
}
