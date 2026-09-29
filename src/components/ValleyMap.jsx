import React, { useState } from "react";
import { ArrowUpRight, Compass } from "lucide-react";
import "./valley-world.css";

export default function ValleyMap({ t, onNavigate }) {
  const [active, setActive] = useState("office");
  const places = [
    {
      id: "garage",
      x: 20,
      y: 58,
      name: t("Гараж", "The garage"),
      copy: t(
        "Твой кабинет, прогресс и следующий питч.",
        "Your room, progress and next pitch.",
      ),
    },
    {
      id: "stage",
      x: 39,
      y: 37,
      name: t("Репетиционная", "Rehearsal"),
      copy: t(
        "Подготовь слайды и выйди на тренировку.",
        "Prepare your deck and start a practice.",
      ),
    },
    {
      id: "office",
      x: 69,
      y: 26,
      name: t("Офисы фондов", "Venture offices"),
      copy: t(
        "Найди инвестора для следующей репетиции.",
        "Choose an investor for your next rehearsal.",
      ),
    },
    {
      id: "campus",
      x: 74,
      y: 57,
      name: t("Кампус", "The campus"),
      copy: t(
        "Собери команду и создай карточку стартапа.",
        "Build a team and create your startup profile.",
      ),
    },
    {
      id: "showroom",
      x: 48,
      y: 70,
      name: t("Выставка стартапов", "Startup showcase"),
      copy: t(
        "Открывай опубликованные продукты сообщества.",
        "Discover published community products.",
      ),
    },
    {
      id: "plaza",
      x: 35,
      y: 12,
      name: t("Площадь лидеров", "Leaderboard plaza"),
      copy: t(
        "Рейтинг стартапов по заявленной выручке.",
        "Startups ranked by founder-reported revenue.",
      ),
    },
  ];
  const selected = places.find((p) => p.id === active);
  return (
    <section
      className="valley-map"
      aria-label={t("Карта стартап-долины", "Startup valley map")}
    >
      <div className="valley-map-topline">
        <span>
          <Compass size={15} />
          {t(
            "ОДНА ИДЕЯ. ЦЕЛЫЙ ГОРОД ВОЗМОЖНОСТЕЙ.",
            "ONE IDEA. A WHOLE TOWN OF POSSIBILITIES.",
          )}
        </span>
        <small>
          {t(
            "Игровая долина · вымышленная карта",
            "Game world · fictional map",
          )}
        </small>
      </div>
      <div className="valley-map-scene">
        <img
          src="/scenes/startup-valley.webp"
          alt=""
          width="1536"
          height="864"
          loading="lazy"
          decoding="async"
        />
        {places.map((place, i) => (
          <button
            key={place.id}
            className={`valley-hotspot ${active === place.id ? "active" : ""}`}
            style={{ left: `${place.x}%`, top: `${place.y}%` }}
            aria-label={place.name}
            onMouseEnter={() => setActive(place.id)}
            onFocus={() => setActive(place.id)}
            onClick={() => onNavigate(place.id)}
          >
            <span className="valley-pin">0{i + 1}</span>
            <span className="valley-pin-label">
              {place.name}
              <ArrowUpRight size={12} />
            </span>
          </button>
        ))}
      </div>
      <div className="valley-mobile-places">
        {places.map((place, i) => (
          <button key={place.id} onClick={() => onNavigate(place.id)}>
            <small>0{i + 1}</small>
            {place.name}
            <ArrowUpRight size={13} />
          </button>
        ))}
      </div>
      <div className="valley-map-caption">
        <div>
          <strong>{selected.name}</strong>
          <p>{selected.copy}</p>
        </div>
        <button className="button white" onClick={() => onNavigate(active)}>
          {t("Перейти", "Explore")}
          <ArrowUpRight size={15} />
        </button>
      </div>
    </section>
  );
}

export function BeyondGarage({ t, onInvestors, onDirectory }) {
  return (
    <section className="beyond-garage" aria-labelledby="beyond-garage-title">
      <div className="beyond-garage-heading">
        <span className="landing-eyebrow">
          {t("ЗА ДВЕРЬЮ ГАРАЖА", "BEYOND THE GARAGE")}
        </span>
        <h2 id="beyond-garage-title">
          {t(
            "Следующая встреча — в другом месте.",
            "Your next meeting is somewhere new.",
          )}
        </h2>
        <p>
          {t(
            "Утро в офисе фонда. Разговор в кампусе. У каждой идеи свой маршрут.",
            "Morning at a venture office. A conversation on campus. Every idea finds its own route.",
          )}
        </p>
      </div>
      <div className="beyond-garage-grid">
        {[
          {
            id: "office",
            title: t("По ту сторону стола", "Across the table"),
            subtitle: t("ОФИСЫ ФОНДОВ / 09:30", "VENTURE OFFICES / 09:30"),
            action: t("Выбрать инвестора", "Choose an investor"),
            onClick: onInvestors,
          },
          {
            id: "campus",
            title: t("Здесь встречаются идеи", "Where ideas meet"),
            subtitle: t("КАМПУС / 11:00", "THE CAMPUS / 11:00"),
            action: t("Открыть стартапы", "Discover startups"),
            onClick: onDirectory,
          },
        ].map((place) => (
          <button
            className="beyond-garage-card"
            key={place.id}
            onClick={place.onClick}
          >
            <img
              src={`/scenes/startup-${place.id}.webp`}
              alt=""
              width="1536"
              height="864"
              loading="lazy"
              decoding="async"
            />
            <span className="beyond-scene-copy">
              <small>{place.subtitle}</small>
              <strong>{place.title}</strong>
              <span>
                {place.action}
                <ArrowUpRight size={18} />
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
