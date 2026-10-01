import React from "react";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "../motion/Motion";
import "./garage-world.css";

export const garageScenes = {
  workbench: "/scenes/garage-workbench.webp",
  rehearsal: "/scenes/garage-rehearsal.webp",
  crew: "/scenes/garage-crew.webp",
  office: "/scenes/startup-office.webp",
  campus: "/scenes/startup-campus.webp",
};

export function GarageScene({ scene, children, className = "" }) {
  return (
    <div
      className={`garage-environment ${className}`}
      data-garage-scene={scene}
    >
      <img
        src={garageScenes[scene]}
        alt=""
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.style.visibility = "hidden";
        }}
        onLoad={(e) => {
          e.currentTarget.style.visibility = "visible";
        }}
      />
      <div className="garage-environment-shade" />
      <div className="garage-environment-content">{children}</div>
    </div>
  );
}

export function GarageChapters({ t, onPlay, onGuide, onTeam }) {
  const chapters = [
    {
      scene: "workbench",
      title: t("Рабочий стол", "The workbench"),
      copy: t("Идея, дек и остывший кофе.", "An idea, a deck and cold coffee."),
      action: t("Войти в гараж", "Enter the garage"),
      onClick: onPlay,
    },
    {
      scene: "rehearsal",
      title: t("Репетиционная", "The rehearsal"),
      copy: t(
        "Две минуты, чтобы стало понятно.",
        "Two minutes to make it click.",
      ),
      action: t("Подготовить питч", "Prepare your pitch"),
      onClick: onGuide,
    },
    {
      scene: "crew",
      title: t("Общий стол", "The shared table"),
      copy: t("Здесь «я» превращается в «мы».", "Where “I” becomes “we”."),
      action: t("Собрать команду", "Build your team"),
      onClick: onTeam,
    },
  ];
  return (
    <Reveal
      as="section"
      className="garage-chapters"
      aria-labelledby="garage-chapters-title"
    >
      <div className="garage-chapters-heading">
        <div>
          <span className="landing-eyebrow">
            {t("ВНУТРИ ГАРАЖА", "INSIDE THE GARAGE")}
          </span>
          <h2 id="garage-chapters-title">
            {t("У каждой идеи есть адрес.", "Every idea starts somewhere.")}
          </h2>
        </div>
        <p>
          {t(
            "Один гараж. Много поздних вечеров. Твой путь к первому раунду.",
            "One garage. Many late nights. Your way to the first round.",
          )}
        </p>
      </div>
      <div className="garage-chapters-grid">
        {chapters.map((chapter, i) => (
          <button
            className="garage-chapter"
            key={chapter.scene}
            onClick={chapter.onClick}
          >
            <div className="garage-chapter-frame">
              <img
                src={garageScenes[chapter.scene]}
                alt=""
                loading="lazy"
                decoding="async"
                width="1536"
                height="864"
              />
              <span className="garage-chapter-number">0{i + 1}</span>
              <span className="garage-chapter-action">
                {chapter.action}
                <ArrowUpRight size={18} />
              </span>
            </div>
            <div className="garage-chapter-caption">
              <h3>{chapter.title}</h3>
              <p>{chapter.copy}</p>
            </div>
          </button>
        ))}
      </div>
    </Reveal>
  );
}
