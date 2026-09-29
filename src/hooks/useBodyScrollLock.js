import { useEffect } from "react";
import { lockBodyScroll } from "../browser/scroll-lock";
export default function useBodyScrollLock(active = true) {
  useEffect(() => (active ? lockBodyScroll() : undefined), [active]);
}
