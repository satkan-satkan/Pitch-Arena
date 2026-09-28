import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  motion,
  MotionConfig,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
} from "framer-motion";
import { Pause, Play } from "lucide-react";

const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const subscribeReduced = (notify) => {
  reducedQuery.addEventListener("change", notify);
  return () => reducedQuery.removeEventListener("change", notify);
};
const getReduced = () => reducedQuery.matches;
const MotionContext = createContext({
  enabled: false,
  paused: false,
  toggle() {},
});
export const useArenaMotion = () => useContext(MotionContext);
export function ArenaMotionProvider({ children }) {
  const systemReduced = useSyncExternalStore(
    subscribeReduced,
    getReduced,
    () => true,
  );
  const [paused, setPaused] = useState(() => {
    try {
      return localStorage.getItem("pa-motion") === "paused";
    } catch {
      return false;
    }
  });
  const [visible, setVisible] = useState(!document.hidden);
  const enabled = !systemReduced && !paused && visible;
  useEffect(() => {
    const change = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = enabled ? "on" : "off";
  }, [enabled]);
  const toggle = () =>
    setPaused((old) => {
      try {
        localStorage.setItem("pa-motion", old ? "on" : "paused");
      } catch {
        /* Session preference still works. */
      }
      return !old;
    });
  return (
    <MotionContext.Provider value={{ enabled, paused, toggle, systemReduced }}>
      <MotionConfig reducedMotion={enabled ? "never" : "always"}>
        {children}
      </MotionConfig>
    </MotionContext.Provider>
  );
}
export function MotionControls({ t }) {
  const { paused, toggle, systemReduced } = useArenaMotion();
  const label = systemReduced
    ? t(
        "Анимации отключены настройкой устройства",
        "Motion disabled by device setting",
      )
    : paused
      ? t("Включить анимации", "Enable animations")
      : t("Приостановить анимации", "Pause animations");
  return (
    <button
      className="motion-control"
      aria-label={label}
      title={label}
      aria-pressed={paused || !!systemReduced}
      disabled={!!systemReduced}
      onClick={toggle}
    >
      {paused || systemReduced ? <Play size={15} /> : <Pause size={15} />}
    </button>
  );
}
// Adapted from Reveal by asanshay, retrieved from 21st.dev. See docs/MOTION.md.
export function Reveal({
  children,
  className = "",
  as = "div",
  index = 0,
  ...props
}) {
  const { enabled } = useArenaMotion();
  const Component = as === "section" ? motion.section : motion.div;
  return (
    <Component
      {...props}
      className={className}
      initial={enabled ? { opacity: 0, y: 24, filter: "blur(5px)" } : false}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      animate={!enabled ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
      viewport={{ once: true, amount: 0.08 }}
      transition={{
        delay: enabled ? index * 0.09 : 0,
        duration: enabled ? 0.55 : 0,
        ease: "easeOut",
      }}
    >
      {children}
    </Component>
  );
}
// Adapted from Tilt by ibelick, retrieved from 21st.dev. Coarse pointers stay static.
export function Tilt({ children, className = "" }) {
  const { enabled } = useArenaMotion();
  const ref = useRef(null);
  const x = useMotionValue(0),
    y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 100, damping: 24 });
  const springY = useSpring(y, { stiffness: 100, damping: 24 });
  const rotateX = useTransform(springY, [-0.5, 0.5], [4, -4]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-5, 5]);
  const transform = useMotionTemplate`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  useEffect(() => {
    if (!enabled) {
      x.set(0);
      y.set(0);
    }
  }, [enabled, x, y]);
  return (
    <motion.div
      ref={ref}
      className={className}
      data-tilt="scene"
      style={{
        transform: enabled ? transform : "none",
        transformStyle: "preserve-3d",
      }}
      onPointerMove={(e) => {
        if (
          !enabled ||
          e.pointerType !== "mouse" ||
          !matchMedia("(hover: hover) and (pointer: fine)").matches
        )
          return;
        const r = ref.current.getBoundingClientRect();
        x.set(
          Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5)),
        );
        y.set(
          Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5)),
        );
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}
