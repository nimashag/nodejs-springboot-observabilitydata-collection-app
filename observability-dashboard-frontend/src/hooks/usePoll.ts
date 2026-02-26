import { useEffect, useRef, useState } from "react";

export function usePoll<T>(
  fetcher: () => Promise<T>,
  opts?: { intervalMs?: number; enabled?: boolean },
) {
  const intervalMs = opts?.intervalMs ?? 2000;
  const enabled = opts?.enabled ?? true;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const timer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        if (!enabled) return;
        setLoading((x) => (data ? false : x));
        const v = await fetcher();
        if (!cancelled) {
          setData(v);
          setError(null);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(String(e?.message || e));
          setLoading(false);
        }
      }
    }

    tick();

    if (enabled) {
      timer.current = window.setInterval(tick, intervalMs);
    }

    return () => {
      cancelled = true;
      if (timer.current) window.clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs]);

  return { data, error, loading };
}
