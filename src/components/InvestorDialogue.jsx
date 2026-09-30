import React, { useEffect, useState } from "react";
import { Volume2, ChevronRight } from "lucide-react";
import { photo } from "../game-data";
import "./investor-dialogue.css";

export default function InvestorDialogue({
  person,
  panel,
  question,
  step,
  total,
  arena,
  startup,
  answered,
  t,
  pick,
  onSpeak,
}) {
  const text = question.text;
  const hasCutout =
    person.id === "arman" && person.photo === "/portraits/arman.png";
  const [visible, setVisible] = useState(0);
  const [failedPhoto, setFailedPhoto] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reveal = () => {
      if (media.matches) setVisible(text.length);
    };
    setVisible(media.matches ? text.length : 0);
    const start = performance.now();
    const timer = window.setInterval(() => {
      const count = Math.min(
        text.length,
        Math.floor((performance.now() - start) / 12),
      );
      setVisible((previous) => Math.max(previous, count));
      if (count >= text.length) window.clearInterval(timer);
    }, 32);
    media.addEventListener("change", reveal);
    return () => {
      window.clearInterval(timer);
      media.removeEventListener("change", reveal);
    };
  }, [text]);
  return (
    <section
      className="investor-novel"
      aria-label={t("Диалог с инвестором", "Investor dialogue")}
    >
      <div className="novel-backdrop" aria-hidden="true" />
      <header className="novel-scene-heading">
        <div>
          <span>{pick(arena.title)}</span>
          <strong>{startup}</strong>
        </div>
        <span className="novel-scene-number">
          {t("ВОПРОС", "QUESTION")} {String(step + 1).padStart(2, "0")} /{" "}
          {String(total).padStart(2, "0")}
        </span>
      </header>
      <div className="novel-cast" aria-label={t("Участники", "Participants")}>
        {panel.map((member, i) => (
          <span
            key={member.id || i}
            className={member === person ? "active" : ""}
          >
            {pick(member.name)}
          </span>
        ))}
      </div>
      <div
        className={`novel-character ${hasCutout ? "has-cutout" : ""}`}
        key={person.id || pick(person.name)}
      >
        {person.photo && !failedPhoto ? (
          <img
            src={photo(person.photo, 800)}
            alt={pick(person.name)}
            style={{
              objectPosition: hasCutout
                ? "center bottom"
                : person.photoPosition || "center 30%",
            }}
            onError={() => setFailedPhoto(true)}
          />
        ) : (
          <div className="novel-monogram">
            {person.initial || pick(person.name).slice(0, 1)}
          </div>
        )}
      </div>
      <div className="novel-dialogue">
        <div className="novel-speaker">
          <div>
            <span>
              {question.followUp
                ? t("УТОЧНЕНИЕ", "FOLLOW-UP")
                : t("СЛОВО ИНВЕСТОРУ", "INVESTOR SPEAKING")}
            </span>
            <h2>{pick(person.name)}</h2>
            <small>{person.role}</small>
          </div>
          <button
            type="button"
            className="novel-audio"
            onClick={onSpeak}
            aria-label={t("Озвучить вопрос", "Read question aloud")}
          >
            <Volume2 size={20} />
          </button>
        </div>
        <p className="novel-question" aria-live="polite" aria-atomic="true">
          <span className="novel-accessible-question">{text}</span>
          <span aria-hidden="true">
            {text.slice(0, visible)}
            <span className="novel-unrevealed">{text.slice(visible)}</span>
          </span>
        </p>
        <footer>
          <span>
            {t(
              "Учебная симуляция · реплики придуманы для игры",
              "Practice simulation · dialogue written for the game",
            )}
          </span>
          {visible < text.length ? (
            <button type="button" onClick={() => setVisible(text.length)}>
              {t("Показать весь вопрос", "Show full question")}
              <ChevronRight size={15} />
            </button>
          ) : (
            <span className="novel-turn">
              {answered
                ? t("Ответ принят", "Answer received")
                : t("Твой ответ", "Your turn")}
              <ChevronRight size={15} />
            </span>
          )}
        </footer>
      </div>
    </section>
  );
}
