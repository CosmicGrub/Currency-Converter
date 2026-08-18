import { useEffect, useState } from "react";

/** Tracks browser connectivity via the `online`/`offline` window events,
 *  seeded from `navigator.onLine`. Used to surface an explicit offline
 *  indicator even when a request hasn't yet failed (e.g. before the first
 *  rate fetch on a page reload with no connection). */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
