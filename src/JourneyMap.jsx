import React, { useEffect, useId, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
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
  arenas,
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
export function QuestStrip({ history, t, pick, onSelect }) {
  const next = nextArena(history);
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
export function JourneyMap({ history, t, pick, onSelect }) {
  const [activeId, setActiveId] = useState(nextArena(history).id);
  const [region, setRegion] = useState("all");
  const id = useId().replaceAll(":", "");
  const active = arenas.find((a) => a.id === activeId);
  const viewport = useRef(null);
  useEffect(() => {
    const el = viewport.current;
    if (el && el.scrollWidth > el.clientWidth)
      el.scrollTo({
        left: Math.max(
          0,
          (active.mapPosition[0] / 1000) * el.scrollWidth - el.clientWidth / 2,
        ),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
  }, [activeId]);
  const done = history.some((h) => h.arenaId === activeId);
  const { best } = summarizeScores(
    history.filter((h) => h.arenaId === activeId),
  );
  const panel = panelFor(active);
  const visible = (a) =>
    region === "all" || a.region === region || a.id === "family";
  const order = campaign.map((id) => arenas.find((a) => a.id === id));
  const route = order.map((a) => a.mapPosition);
  const routeD = route.reduce(
    (s, p, i) =>
      i
        ? s +
          ` Q ${(route[i - 1][0] + p[0]) / 2} ${Math.min(route[i - 1][1], p[1]) - 55} ${p[0]} ${p[1]}`
        : `M${p[0]} ${p[1]}`,
    "",
  );
  return (
    <section
      className="journey-map"
      aria-label={t("Карта арен мира", "World arena map")}
    >
      <div className="map-toolbar">
        <div>
          <span className="map-season">
            <span />
            {t("СЕЗОН 01", "SEASON 01")}
          </span>
          <h3>{t("Весь мир — твоя арена", "The world is your arena")}</h3>
        </div>
        <div className="map-regions">
          {[
            ["all", "Мир", "World"],
            ["cis", "СНГ", "CIS"],
            ["us", "Америка", "Americas"],
            ["eu", "Европа", "Europe"],
            ["uae", "ОАЭ", "UAE"],
          ].map(([r, ru, en]) => (
            <button
              key={r}
              aria-pressed={region === r}
              className={region === r ? "active" : ""}
              onClick={() => {
                setRegion(r);
                if (r !== "all")
                  setActiveId(arenas.find((a) => a.region === r).id);
              }}
            >
              {r === "all" && <Globe2 size={12} />} {t(ru, en)}
            </button>
          ))}
        </div>
      </div>
      <div className="map-scroll" ref={viewport}>
        <div className="map-canvas">
          <svg viewBox="0 0 1000 460" className="world-svg" aria-hidden="true">
            <defs>
              <pattern
                id={`dots-${id}`}
                width="12"
                height="12"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r=".65" fill="#b4a4ca" opacity=".23" />
              </pattern>
              <linearGradient id={`land-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#e5deee" />
                <stop offset="1" stopColor="#f0e9f5" />
              </linearGradient>
            </defs>
            <rect width="1000" height="460" fill={`url(#dots-${id})`} />
            <path d={path(geoGraticule10())} className="map-graticule" />
            {countries.map((c) => (
              <path
                d={path(c)}
                key={c.id}
                className={
                  active.country === c.id
                    ? "country selected-country"
                    : "country"
                }
                fill={`url(#land-${id})`}
              />
            ))}
            <path d={routeD} className="campaign-route" />
            {arenas
              .filter((a) => a.coordinates && visible(a))
              .map((a) => {
                const p = projection(a.coordinates);
                return (
                  <g key={a.id}>
                    <line
                      x1={p[0]}
                      y1={p[1]}
                      x2={a.mapPosition[0]}
                      y2={a.mapPosition[1]}
                      className={`pin-leader ${a.id === activeId ? "active" : ""}`}
                    />
                    <circle cx={p[0]} cy={p[1]} r="3" className="city-dot" />
                  </g>
                );
              })}
            <text x="310" y="355" className="ocean-label">
              ATLANTIC OCEAN
            </text>
            <text x="734" y="356" className="ocean-label">
              INDIAN OCEAN
            </text>
            <text
              x="31"
              y="223"
              className="ocean-label"
              transform="rotate(-90 31 223)"
            >
              PACIFIC OCEAN
            </text>
          </svg>
          {arenas.filter(visible).map((a) => {
            const cleared = history.some((h) => h.arenaId === a.id),
              portrait = a.personaIds ? panelFor(a)[0] : null;
            return (
              <button
                key={a.id}
                className={`map-pin ${a.kind} ${a.id === activeId ? "selected" : ""} ${cleared ? "cleared" : ""}`}
                style={{
                  left: `${a.mapPosition[0] / 10}%`,
                  top: `${a.mapPosition[1] / 4.6}%`,
                }}
                onClick={() => setActiveId(a.id)}
                aria-label={`${pick(a.title)} — ${pick(a.city)}`}
                aria-pressed={a.id === activeId}
              >
                <span className="pin-disc">
                  {portrait ? (
                    <img src={photo(portrait.photo)} alt="" />
                  ) : (
                    <span>{a.symbol}</span>
                  )}
                  {cleared ? (
                    <i className="pin-clear">
                      <Check size={10} />
                    </i>
                  ) : (
                    <i className="pin-level">{a.level}</i>
                  )}
                </span>
                <span className="pin-label">
                  {a.id === "arena"
                    ? t("Арена Единорогов", "Unicorn Arena")
                    : a.id === "nfactorial"
                      ? "nFactorial"
                      : pick(a.title)}
                  {a.id === "arena" && <span className="pin-boss">BOSS</span>}
                </span>
                {a.id === activeId && (
                  <span className="pin-location">{pick(a.city)}</span>
                )}
              </button>
            );
          })}
          <div className="map-compass">
            <Compass size={26} strokeWidth={1} />
            <span>N</span>
          </div>
          <div className="map-home-note">
            <span>⌂</span>
            {t("Приключение начинается дома", "Every adventure starts at home")}
          </div>
          <div className="map-legend">
            <span>
              <i className="legend-current" />
              {t("Выбрано", "Selected")}
            </span>
            <span>
              <i className="legend-complete" />
              {t("Пройдено", "Cleared")}
            </span>
            <span>
              <i className="legend-route" />
              {t("Путь основателя", "Founder journey")}
            </span>
          </div>
        </div>
      </div>
      <div className="map-mission">
        <div className={`mission-emblem ${active.kind}`}>
          {active.personaIds ? (
            <img src={photo(panel[0].photo, 160)} alt={pick(panel[0].name)} />
          ) : (
            active.symbol
          )}
        </div>
        <div className="mission-text">
          <span>
            {done
              ? t("МИССИЯ ПРОЙДЕНА", "MISSION CLEARED")
              : active.level >= 3
                ? t("ВЫЗОВ ПРИНЯТ?", "UP FOR THE CHALLENGE?")
                : t("ТВОЯ СЛЕДУЮЩАЯ ИСТОРИЯ", "YOUR NEXT STORY")}
          </span>
          <h3>{pick(active.title)}</h3>
          <p>
            <MapPin size={12} />
            {pick(active.city)}
            <span>·</span>
            {active.personaIds
              ? pick(panel[0].name)
              : t("Учебная панель", "Practice panel")}
          </p>
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
            <small
              title={t(
                "По текущим правилам оценки",
                "Using the current scoring rules",
              )}
            >
              <Star size={11} />
              {t("Лучший", "Best")}: {best}/100
            </small>
          )}
        </div>
        <button className="button dark" onClick={() => onSelect(active)}>
          {done
            ? t("Улучшить результат", "Beat your score")
            : t("На сцену", "Enter the arena")}
          <ArrowUpRight size={17} />
        </button>
      </div>
      <div className="map-footnote">
        <span>
          {t(
            "Выбирай любую арену. Маршрут — рекомендация, а не ограничение.",
            "Every arena is playable. The route is a guide, not a restriction.",
          )}
        </span>
        <span>{t("Метки — игровые локации", "Pins are game locations")}</span>
      </div>
    </section>
  );
}
