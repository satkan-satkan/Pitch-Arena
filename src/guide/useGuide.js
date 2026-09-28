import { useCallback, useMemo, useSyncExternalStore } from "react";
import { guideTransition, parseGuide } from "./model";
const volatile = new Map();
const readKey = (key) => {
  if (volatile.has(key)) return volatile.get(key);
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
};
const subscribe = (fn) => {
  const storage = (e) => {
    if (e.key) volatile.delete(e.key);
    else volatile.clear();
    fn();
  };
  window.addEventListener("storage", storage);
  window.addEventListener("pa-guide-update", fn);
  return () => {
    window.removeEventListener("storage", storage);
    window.removeEventListener("pa-guide-update", fn);
  };
};
export default function useGuide(userId) {
  const key = `pa-guide:${userId || "guest"}`;
  const snapshot = useCallback(() => readKey(key), [key]);
  const raw = useSyncExternalStore(subscribe, snapshot, () => ""),
    state = useMemo(() => parseGuide(raw), [raw]);
  const dispatch = useCallback(
    (event) => {
      const next = JSON.stringify(
        guideTransition(parseGuide(readKey(key)), event),
      );
      try {
        localStorage.setItem(key, next);
        volatile.delete(key);
      } catch {
        volatile.set(key, next);
      }
      window.dispatchEvent(new Event("pa-guide-update"));
    },
    [key],
  );
  return { state, dispatch };
}
