import React, { useState, useRef } from "react";
import { ArrowRight, Check, Mic, Sparkles, Globe2, Route } from "lucide-react";
import { GuidePortrait } from "../guide/Guide";
import "./landing-experience.css";
const steps = [
  ["Твой питч", "Your pitch"],
  ["Разбор", "Review"],
  ["Следующий шаг", "Next step"],
];
const moods = [
  ["welcome", "Приветствие", "Welcome"],
  ["thinking", "Размышление", "Thinking"],
  ["listening", "Внимание", "Listening"],
  ["support", "Поддержка", "Support"],
  ["celebrate", "Радость", "Celebration"],
];
export default function LandingExperience({ t, onGuide }) {
  const [step, setStep] = useState(0),
    [mood, setMood] = useState("welcome");
  const refs = useRef([]);
  const tabKey = (e, i) => {
    let next;
    if (e.key === "ArrowRight") next = (i + 1) % 3;
    else if (e.key === "ArrowLeft") next = (i + 2) % 3;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 2;
    else return;
    e.preventDefault();
    setStep(next);
    refs.current[next]?.focus();
  };
  return (
    <section className="landing-experience" id="experience">
      <div className="landing-section-heading">
        <span className="landing-eyebrow">
          {t("ПОПРОБУЙ ПРЕДСТАВИТЬ СВОЙ МОМЕНТ", "PICTURE YOUR FIRST MOMENT")}
        </span>
        <h2>
          {t(
            "Не просто рассказать. Быть понятым.",
            "More than a pitch. A connection.",
          )}
        </h2>
        <p>
          {t(
            "От первой фразы до следующей попытки — у каждого шага есть смысл.",
            "From your first sentence to your next attempt, every step has a purpose.",
          )}
        </p>
      </div>
      <div className="experience-window">
        <div className="experience-toolbar">
          <div aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <span>pitcharena / {t("первая тренировка", "first practice")}</span>
          <small>{t("ИНТЕРАКТИВНЫЙ ПРИМЕР", "INTERACTIVE EXAMPLE")}</small>
        </div>
        <div
          className="experience-tabs"
          role="tablist"
          aria-label={t("Этапы тренировки", "Practice stages")}
        >
          {steps.map((v, i) => (
            <button
              key={i}
              role="tab"
              id={`experience-tab-${i}`}
              aria-selected={step === i}
              aria-controls="experience-panel"
              tabIndex={step === i ? 0 : -1}
              ref={(el) => (refs.current[i] = el)}
              onKeyDown={(e) => tabKey(e, i)}
              onClick={() => setStep(i)}
            >
              <span>0{i + 1}</span>
              {t(...v)}
            </button>
          ))}
        </div>
        <div
          className="experience-content"
          id="experience-panel"
          role="tabpanel"
          aria-labelledby={`experience-tab-${step}`}
          tabIndex={0}
        >
          <div className="experience-demo">
            <span className="demo-eyebrow">
              {t("ПРИМЕР · ВЫМЫШЛЕННЫЙ ПРОЕКТ", "EXAMPLE · FICTIONAL PROJECT")}
            </span>
            {step === 0 ? (
              <>
                <div className="experience-clock">
                  <Mic size={21} />
                  <span>01:00</span>
                  <i />
                  {t("Твоё время говорить", "Your time to speak")}
                </div>
                <h3>
                  {t(
                    "Начни с того, кому помогаешь.",
                    "Start with who you help.",
                  )}
                </h3>
                <blockquote>
                  {t(
                    "«Небольшие команды теряют задачи в переписке. Мы собираем договорённости в один понятный план».",
                    "“Small teams lose tasks in chat. We turn their decisions into one clear plan.”",
                  )}
                </blockquote>
                <div className="experience-wave" aria-hidden="true">
                  {[
                    12, 25, 18, 40, 26, 48, 22, 33, 15, 28, 45, 21, 37, 18, 29,
                    11, 23, 39, 17, 30,
                  ].map((height, i) => (
                    <i key={i} style={{ height }} />
                  ))}
                </div>
              </>
            ) : step === 1 ? (
              <>
                <h3>
                  {t(
                    "Что уже понятно, а что усилить?",
                    "What works, and what needs more?",
                  )}
                </h3>
                <div className="experience-evidence">
                  <span>
                    <Check size={16} />
                    {t("Проблема названа", "The problem is clear")}
                  </span>
                  <p>
                    {t("«теряют задачи в переписке»", "“lose tasks in chat”")}
                  </p>
                </div>
                <div className="experience-evidence missing">
                  <span>
                    <Sparkles size={16} />
                    {t(
                      "Не хватает подтверждения спроса",
                      "Demand evidence is missing",
                    )}
                  </span>
                  <p>
                    {t(
                      "Кто уже попробовал продукт и что изменилось?",
                      "Who has tried the product, and what changed?",
                    )}
                  </p>
                </div>
                <small>
                  {t(
                    "Образец объяснения, а не оценка твоего проекта.",
                    "An example explanation, not a review of your project.",
                  )}
                </small>
              </>
            ) : (
              <>
                <span className="next-step-badge">
                  {t(
                    "ОДНА ЦЕЛЬ НА СЛЕДУЮЩИЙ ПИТЧ",
                    "ONE GOAL FOR YOUR NEXT PITCH",
                  )}
                </span>
                <h3>
                  {t("Добавь один реальный пример.", "Add one real example.")}
                </h3>
                <p>
                  {t(
                    "Расскажи, как конкретная команда попробовала продукт. Если тестов ещё нет — объясни, как проверишь гипотезу.",
                    "Describe how one team tried the product. If you have not tested it yet, explain how you will validate your idea.",
                  )}
                </p>
                <button className="button dark" onClick={onGuide}>
                  {t("Пройти свою первую миссию", "Start my first mission")}
                  <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>
          <aside className="experience-coach">
            <GuidePortrait
              t={t}
              emotion={["listening", "thinking", "support"][step]}
            />
            <div>
              <span>{t("ИСКРА РЯДОМ", "ISKRA IS HERE")}</span>
              <p>
                {step === 0
                  ? t(
                      "Я слушаю. Сейчас главное — твоя история.",
                      "I’m listening. This moment belongs to your story.",
                    )
                  : step === 1
                    ? t(
                        "Не нужно улучшать всё сразу. Найдём одну точку роста.",
                        "You do not have to fix everything. Let’s find one thing to improve.",
                      )
                    : t(
                        "Неидеальная попытка тоже двигает тебя вперёд.",
                        "An imperfect attempt still moves you forward.",
                      )}
              </p>
            </div>
          </aside>
        </div>
      </div>
      <div className="experience-bento">
        <article className="bento-guide">
          <div>
            <span className="landing-eyebrow">
              {t("ПРИЯТНО ПОЗНАКОМИТЬСЯ", "NICE TO MEET YOU")}
            </span>
            <h3>
              {t("Маленькая Искра.", "A little Iskra.")}
              <br />
              {t("Большая поддержка.", "A lot of encouragement.")}
            </h3>
            <p>
              {t(
                "Подскажет, когда нужно. Помолчит, когда говоришь ты. И порадуется твоему следующему шагу.",
                "A tip when you need it. Quiet when you speak. And a little joy for every step forward.",
              )}
            </p>
            <div
              className="emotion-picker"
              aria-label={t("Эмоции Искры", "Iskra’s emotions")}
            >
              {moods.map(([id, ru, en]) => (
                <button
                  key={id}
                  aria-pressed={mood === id}
                  onClick={() => setMood(id)}
                >
                  {t(ru, en)}
                </button>
              ))}
            </div>
            <button className="ready-text-button" onClick={onGuide}>
              {t("Познакомиться с Искрой", "Meet Iskra")}
              <ArrowRight size={15} />
            </button>
          </div>
          <GuidePortrait t={t} emotion={mood} />
        </article>
        <article className="bento-language">
          <Globe2 size={26} />
          <strong>
            RU <span>/</span> EN
          </strong>
          <h3>{t("Твой язык. Твой темп.", "Your language. Your pace.")}</h3>
          <p>
            {t(
              "Говори или печатай. Начни без слайдов. Включай подсказки, когда они нужны.",
              "Speak or type. Start without slides. Bring up tips whenever you need them.",
            )}
          </p>
        </article>
        <article className="bento-path">
          <Route size={27} />
          <h3>
            {t("Сегодня — перед своими.", "Today, friends & family.")}
            <br />
            {t("Завтра — перед миром.", "Tomorrow, the world.")}
          </h3>
          <p>
            {t(
              "Выбирай арену и тренируй разные стороны своей истории. Каждый результат — точка для нового старта.",
              "Choose an arena and practice different sides of your story. Every result is a new starting point.",
            )}
          </p>
          <span>
            01 <i /> 02 <i /> 03 <i /> ✦
          </span>
        </article>
      </div>
    </section>
  );
}
