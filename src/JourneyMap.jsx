import React, { useEffect, useId, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { motion } from "framer-motion";
import { useArenaMotion } from "./motion/Motion";
import { regions } from "./world-catalog";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import {
  ArrowUpRight,
  Check,
  Clock3,
  Compass,
  Globe2,
  MapPin,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import {
  arenas as defaultArenas,
  campaign,
  nextArena,
  medalsFor,
  panelFor,
  photo,
} from "./game-data";
import { summarizeScores } from "./practice/engine";
const countries = feature(world, world.objects.countries).features.filter(
  (c) => c.id !== "010",
);
const projection = geoNaturalEarth1().fitExtent(
  [
    [45, 45],
    [950, 435],
  ],
  { type: "FeatureCollection", features: countries },
);
const path = geoPath(projection);
export function QuestStrip({
  history,
  t,
  pick,
  onSelect,
  arenas = defaultArenas,
}) {
  const next = nextArena(history, arenas);
  return (
    <section
      className="quest-strip"
      aria-label={t("Путь основателя", "Founder journey")}
    >
      <div className="quest-caption">
        <span>
          <Sparkles size={13} />
          {t("ТВОЯ КАМПАНИЯ", "YOUR CAMPAIGN")}
        </span>
        <strong>
          {
            new Set(
              history
                .filter((h) => campaign.includes(h.arenaId))
                .map((h) => h.arenaId),
            ).size
          }
          <small> / 5</small>
        </strong>
      </div>
      <div className="quest-path">
        {campaign.map((id, i) => {
          const a = arenas.find((a) => a.id === id),
            done = history.some((h) => h.arenaId === id);
          return (
            <button
              key={id}
              className={`quest-node ${done ? "cleared" : ""} ${next.id === id ? "current" : ""}`}
              disabled={a.enabled === false}
              onClick={() => onSelect(a)}
              title={pick(a.title)}
            >
              <span className="quest-number">
                {done ? <Check size={14} /> : i + 1}
              </span>
              <span>
                <strong>
                  {id === "family"
                    ? t("Первый питч", "First pitch")
                    : id === "nfactorial"
                      ? "Demo Day"
                      : id === "arena"
                        ? t("Арена", "The arena")
                        : id === "yc"
                          ? "Y Combinator"
                          : "Unicorn"}
                </strong>
                <small>
                  {done
                    ? t("Пройдено", "Cleared")
                    : next.id === id
                      ? t("Твой следующий шаг", "Your next step")
                      : `+${a.xp} XP`}
                </small>
              </span>
              {i === 4 && <Star className="quest-final" size={14} />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
export function TrophyShelf({ history, t, pick }) {
  return (
    <section className="trophy-shelf">
      <div className="section-heading">
        <div className="section-title">
          <Trophy size={17} />
          <h2>{t("Твои достижения", "Your achievements")}</h2>
        </div>
        <span className="text-muted">
          {medalsFor(history).filter((m) => m.earned).length} / 5
        </span>
      </div>
      <div className="medal-grid">
        {medalsFor(history).map((m) => (
          <div
            className={`medal ${m.earned ? "earned" : ""}`}
            key={m.id}
            title={pick(m.description)}
          >
            <span className="medal-symbol">
              {m.icon}
              {m.earned && <Check size={10} />}
            </span>
            <div>
              <strong>{pick(m.name)}</strong>
              <p>{pick(m.description)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
export function JourneyMap({
  history,
  t,
  pick,
  onSelect,
  arenas = defaultArenas,
}) {
  const [activeId, setActiveId] = useState(
    nextArena(history, arenas)?.id || arenas[0]?.id,
  );
  const [region, setRegion] = useState("all");
  const { enabled } = useArenaMotion();
  const camera = useRef(null);
  const [aspect, setAspect] = useState(1000 / 460);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setAspect(width / height);
    });
    if (camera.current) observer.observe(camera.current);
    return () => observer.disconnect();
  }, []);
  const active = arenas.find((a) => a.id === activeId) || arenas[0];
  const locations = arenas.filter(
    (a) => a.coordinates && (region === "all" || a.region === region),
  );
  // Nearby cities in one country share a pin (e.g. the Bay Area), so their
  // buttons remain reachable even at world scale.
  const clusters = locations.reduce((out, a) => {
    const p = projection(a.coordinates);
    const nearby = out.find(
      (c) =>
        c.items[0].country === a.country &&
        Math.hypot(c.p[0] - p[0], c.p[1] - p[1]) < 8,
    );
    if (nearby) nearby.items.push(a);
    else out.push({ key: a.id, p, items: [a] });
    return out;
  }, []);
  let box = [0, (460 - 1000 / aspect) / 2, 1000, 1000 / aspect];
  if (region !== "all" && clusters.length) {
    const xs = clusters.map((c) => c.p[0]),
      ys = clusters.map((c) => c.p[1]);
    const width = Math.max(
      170,
      Math.max(...xs) - Math.min(...xs) + 120,
      (Math.max(...ys) - Math.min(...ys) + 80) * aspect,
    );
    const height = width / aspect;
    box = [
      (Math.min(...xs) + Math.max(...xs) - width) / 2,
      (Math.min(...ys) + Math.max(...ys) - height) / 2,
      width,
      height,
    ];
  }
  const activeCluster = clusters.find((c) =>
    c.items.some((a) => a.id === active.id),
  );
  const local =
    activeCluster?.items ||
    (region === "all"
      ? [
          arenas.find((a) => a.id === "family"),
          ...locations.slice(0, 5),
        ].filter(Boolean)
      : locations);
  const done = history.some((h) => h.arenaId === active.id);
  const { best } = summarizeScores(
    history.filter((h) => h.arenaId === active.id),
  );
  const panel = panelFor(active);
  const duration = enabled ? 0.55 : 0;
  return (
    <section
      className="journey-map atlas-map"
      aria-label={t("Карта арен мира", "World arena map")}
      data-region={region}
    >
      <div className="map-toolbar">
        <div>
          <span className="map-season">
            {t("МЕЖДУНАРОДНЫЙ КАТАЛОГ", "GLOBAL DIRECTORY")}
          </span>
          <h3>
            {t("Твой следующий стол переговоров", "Your next meeting table")}
          </h3>
        </div>
        <div className="map-regions">
          {regions.map(([id, ru, en]) => (
            <button
              key={id}
              aria-pressed={region === id}
              className={region === id ? "active" : ""}
              onClick={() => {
                setRegion(id);
                const first = arenas.find((a) =>
                  id === "all" ? a.id === "family" : a.region === id,
                );
                if (first) setActiveId(first.id);
              }}
            >
              {id === "all" && <Globe2 size={12} />} {t(ru, en)}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={camera}
        className="atlas-viewport"
        data-testid="atlas-camera"
        data-viewbox={box.join(" ")}
      >
        <motion.svg
          className="atlas-world"
          initial={false}
          animate={{ viewBox: box.join(" ") }}
          transition={{ duration }}
          aria-hidden="true"
        >
          <rect x="-1000" y="-500" width="3000" height="1500" fill="#141a1d" />
          <path d={path(geoGraticule10())} className="map-graticule" />
          {countries.map((c) => (
            <path
              key={c.id}
              d={path(c)}
              className={
                active.country === c.id ? "country selected-country" : "country"
              }
              fill="#384147"
            />
          ))}
        </motion.svg>
        {clusters.map((c) => {
          const current = c.items.some((a) => a.id === active.id),
            first = c.items[0];
          return (
            <motion.button
              key={c.key}
              initial={false}
              animate={{
                left: `${((c.p[0] - box[0]) / box[2]) * 100}%`,
                top: `${((c.p[1] - box[1]) / box[3]) * 100}%`,
              }}
              transition={{ duration }}
              className={`atlas-pin ${current ? "selected" : ""}`}
              onClick={() => setActiveId(first.id)}
              aria-label={`${pick(first.city)} · ${c.items.length} ${t("арен", "arenas")}`}
              aria-pressed={current}
            >
              <span>{c.items.length > 1 ? c.items.length : first.symbol}</span>
              <strong>{pick(first.city).split(",")[0]}</strong>
            </motion.button>
          );
        })}
        <span className="atlas-scale">
          {region === "all"
            ? t("Мир", "World")
            : t(...regions.find((r) => r[0] === region).slice(1))}{" "}
          · {locations.length} {t("арен", "arenas")}
        </span>
        {region === "all" && (
          <button className="atlas-home" onClick={() => setActiveId("family")}>
            ⌂ {t("Свои люди", "Friends & family")}
          </button>
        )}
      </div>
      <div className="atlas-local">
        <div>
          <strong>
            {activeCluster
              ? pick(activeCluster.items[0].city)
              : t("Выбери локацию на карте", "Choose a location on the map")}
          </strong>
          <span>
            {t(
              "Фонды и программы в этой локации",
              "Funds and programs in this location",
            )}
          </span>
        </div>
        <div className="atlas-fund-list">
          {local.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveId(a.id)}
              aria-pressed={active.id === a.id}
              className={active.id === a.id ? "selected" : ""}
            >
              <span>{a.symbol}</span>
              {pick(a.title)}
              {a.enabled === false && (
                <small>{t("Недоступно", "Unavailable")}</small>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="map-mission">
        <div className="mission-emblem venture">{active.symbol}</div>
        <div className="mission-text">
          <span>
            {done
              ? t("ПРОЙДЕНО", "COMPLETED")
              : t("УЧЕБНАЯ СИМУЛЯЦИЯ", "PRACTICE SIMULATION")}
          </span>
          <h3>{pick(active.title)}</h3>
          <p>
            <MapPin size={12} />
            {pick(active.city)}
          </p>
          <p>{panel.map((p) => pick(p.name)).join(" · ")}</p>
        </div>
        <div className="mission-rewards">
          <span>
            <Clock3 size={14} />
            {active.pitchSeconds / 60} {t("мин питч", "min pitch")}
          </span>
          <strong>
            <Zap size={14} />+{active.xp} XP
          </strong>
          {best !== null && (
            <small>
              {t("Лучший", "Best")}: {best}/100
            </small>
          )}
        </div>
        <button
          className="button dark"
          disabled={active.enabled === false}
          onClick={() => onSelect(active)}
        >
          {done
            ? t("Улучшить результат", "Beat your score")
            : t("На сцену", "Enter the arena")}
          <ArrowUpRight size={17} />
        </button>
      </div>
      <div className="map-footnote">
        <span>
          {t(
            "Нажми на город, затем выбери фонд. Локации — ориентиры для тренировки.",
            "Select a city, then a fund. Locations are practice reference points.",
          )}
        </span>
        {active.source && (
          <a href={active.source} target="_blank" rel="noreferrer">
            {t("Официальный источник", "Official source")} ↗
          </a>
        )}
      </div>
    </section>
  );
}
