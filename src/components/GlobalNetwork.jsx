import React, { lazy, Suspense } from "react";
import { useArenaMotion } from "../motion/Motion";
import "./global-network.css";

const WorldMap = lazy(() =>
  import("./ui/map").then((m) => ({ default: m.WorldMap })),
);

export default function GlobalNetwork({ t }) {
  const { enabled } = useArenaMotion();
  const sf = {
    lat: 37.7749,
    lng: -122.4194,
    label: t("Бэй-Эрия", "SF Bay"),
  };
  const london = { lat: 51.5074, lng: -0.1278, label: t("Лондон", "London") };
  const almaty = { lat: 43.2389, lng: 76.8897, label: t("Алматы", "Almaty") };
  const dots = [
    { start: sf, end: london },
    {
      start: sf,
      end: { lat: 40.7128, lng: -74.006, label: t("Нью-Йорк", "New York") },
    },
    {
      start: london,
      end: { lat: 55.7558, lng: 37.6173, label: t("Москва", "Moscow") },
    },
    { start: london, end: almaty },
    {
      start: almaty,
      end: { lat: 25.2048, lng: 55.2708, label: t("Дубай", "Dubai") },
    },
    {
      start: almaty,
      end: { lat: 1.3521, lng: 103.8198, label: t("Сингапур", "Singapore") },
    },
  ];
  return (
    <section
      className="global-network dark py-40 bg-black w-full"
      aria-labelledby="global-network-title"
    >
      <div className="max-w-7xl mx-auto text-center">
        <h2
          id="global-network-title"
          className="font-bold text-xl md:text-4xl text-white"
        >
          {t("Твой питч. Весь мир.", "Your pitch. Worldwide.")}
        </h2>
        <p className="text-sm md:text-lg text-neutral-500 max-w-2xl mx-auto py-4">
          {t(
            "Тренируй выступления перед инвесторами из разных стран. Линии на карте — игровые маршруты между городами арен.",
            "Practice pitching to investors across countries. The lines show game routes between arena cities.",
          )}
        </p>
      </div>
      <Suspense fallback={<div className="aspect-[2/1]" aria-busy="true" />}>
        <WorldMap dots={dots} motionEnabled={enabled} />
      </Suspense>
    </section>
  );
}
