"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Soft-refreshes the current server-rendered page when watched tables change.
 * Ignores events briefly after subscribe to avoid remount loops.
 */
export function RealtimeRefresh({ tables }: { tables: string[] }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyAt = useRef(0);
  const tableKey = tables.join(",");

  useEffect(() => {
    const supabase = createClient();
    let channel = supabase.channel(
      `live:${tableKey}:${Math.random().toString(36).slice(2, 8)}`,
    );

    readyAt.current = Date.now() + 1500;

    const scheduleRefresh = () => {
      if (Date.now() < readyAt.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        router.refresh();
      }, 400);
    };

    for (const table of tables) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        scheduleRefresh,
      );
    }

    channel.subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey, router]);

  return null;
}
