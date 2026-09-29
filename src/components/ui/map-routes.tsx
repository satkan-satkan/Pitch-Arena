import { useId } from "react";
import { motion } from "framer-motion";

type Point = { x: number; y: number };
interface AnimatedMapRoutesProps {
  routes: Array<{ start: Point; end: Point }>;
  lineColor?: string;
  motionEnabled?: boolean;
  animationDuration?: number;
  loop?: boolean;
  pointRadius?: number;
  curveHeight?: number;
}

// Shared drawing and travelling lights from the supplied 21st.dev WorldMap.
// Coordinates come from the host map's projection so zoom and pins stay aligned.
export function AnimatedMapRoutes({
  routes,
  lineColor = "#0ea5e9",
  motionEnabled = true,
  animationDuration = 2,
  loop = true,
  pointRadius = 4,
  curveHeight = 50,
}: AnimatedMapRoutesProps) {
  const gradientId = `route-gradient-${useId().replace(/:/g, "")}`;
  const createCurvedPath = (start: Point, end: Point) =>
    `M ${start.x} ${start.y} Q ${(start.x + end.x) / 2} ${Math.min(start.y, end.y) - curveHeight} ${end.x} ${end.y}`;
  const staggerDelay = 0.3;
  const totalAnimationTime = routes.length * staggerDelay + animationDuration;
  const fullCycleDuration = totalAnimationTime + 2;
  return (
    <g
      data-map-routes
      data-motion={motionEnabled ? "on" : "off"}
      pointerEvents="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="5%" stopColor={lineColor} stopOpacity="1" />
          <stop offset="95%" stopColor={lineColor} stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      {routes.map((route, i) => {
        const startPoint = route.start;
        const endPoint = route.end;

        // Calculate keyframe times for this specific path
        const startTime = (i * staggerDelay) / fullCycleDuration;
        const endTime =
          (i * staggerDelay + animationDuration) / fullCycleDuration;
        const resetTime = totalAnimationTime / fullCycleDuration;

        return (
          <g key={`path-group-${i}`}>
            <motion.path
              d={createCurvedPath(startPoint, endPoint)}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth="1"
              initial={{ pathLength: motionEnabled ? 0 : 1 }}
              animate={
                motionEnabled && loop
                  ? {
                      pathLength: [0, 0, 1, 1, 0],
                    }
                  : {
                      pathLength: 1,
                    }
              }
              transition={
                !motionEnabled
                  ? { duration: 0 }
                  : loop
                    ? {
                        duration: fullCycleDuration,
                        times: [0, startTime, endTime, resetTime, 1],
                        ease: "easeInOut",
                        repeat: Infinity,
                        repeatDelay: 0,
                      }
                    : {
                        duration: animationDuration,
                        delay: i * staggerDelay,
                        ease: "easeInOut",
                      }
              }
            />

            {motionEnabled && loop && (
              <motion.circle
                r={pointRadius}
                fill={lineColor}
                initial={{ offsetDistance: "0%", opacity: 0 }}
                animate={{
                  offsetDistance: [null, "0%", "100%", "100%", "100%"],
                  opacity: [0, 0, 1, 0, 0],
                }}
                transition={{
                  duration: fullCycleDuration,
                  times: [0, startTime, endTime, resetTime, 1],
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: 0,
                }}
                style={{
                  offsetPath: `path('${createCurvedPath(startPoint, endPoint)}')`,
                }}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
