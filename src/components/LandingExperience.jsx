import React, { useState, useRef, useId } from "react";
import { ArrowRight, Check, Mic, Sparkles } from "lucide-react";

import "./landing-experience.css";
import { motion } from "framer-motion";
import { Reveal, useArenaMotion } from "../motion/Motion";
const steps = [
  ["Твой питч", "Your pitch"],
  ["Разбор", "Review"],
  ["Следующий шаг", "Next step"],
];
export default function LandingExperience({ t, onGuide }) {
  const [step, setStep] = useState(0);
  const refs = useRef([]);
  const tabGroup = useId();
  const { enabled } = useArenaMotion();
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
    <Reveal as="section" className="landing-experience" id="experience">
      <div className="landing-section-heading">
        <span className="landing-eyebrow">
          {t("ВНУТРИ СИМУЛЯТОРА", "INSIDE THE SIMULATOR")}
        </span>
        <h2>
          {t("Твоя история. Их вопросы.", "Your story. Their questions.")}
        </h2>
        <p>
          {t(
            "Отрепетируй выступление и посмотри, где твоей истории не хватает фактов.",
            "Rehearse your pitch and see where your story needs evidence.",
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
              {step === i && (
                <motion.span
                  aria-hidden="true"
                  className="tab-active-background"
                  layoutId={enabled ? `experience-${tabGroup}` : undefined}
                  transition={{
                    type: "spring",
                    bounce: 0.15,
                    duration: enabled ? 0.35 : 0,
                  }}
                />
              )}
              <span className="tab-number">0{i + 1}</span>
              <span className="tab-label">{t(...v)}</span>
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
          <motion.div
            className="experience-demo"
            key={step}
            initial={enabled ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: enabled ? 0.28 : 0 }}
          >
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
          </motion.div>
          <aside className="experience-coach">
            <div className="room-cue" aria-hidden="true">
              <span>0{step + 1}</span>
              <i />
              <small>{["ON AIR", "THE DEBRIEF", "NEXT TAKE"][step]}</small>
            </div>
            <div>
              <span>{t("ЗАМЕТКА РЕДАКТОРА", "EDITOR’S NOTE")}</span>
              <p>
                {step === 0
                  ? t(
                      "Таймер идёт. Начни с проблемы клиента.",
                      "Clock’s running. Start with the customer’s problem.",
                    )
                  : step === 1
                    ? t(
                        "Не нужно улучшать всё сразу. Найдём одну точку роста.",
                        "You do not have to fix everything. Let’s find one thing to improve.",
                      )
                    : t(
                        "Один конкретный пример убедительнее пяти эпитетов.",
                        "One concrete example beats five adjectives.",
                      )}
              </p>
            </div>
          </aside>
        </div>
      </div>
      <div className="studio-briefing">
        <span>{t("ПЕРЕД ПЕРВЫМ ВЫХОДОМ", "BEFORE YOUR FIRST PITCH")}</span>
        <p>
          {t(
            "Нужен короткий брифинг? Искра проведёт через первую тренировку.",
            "Need a quick briefing? Iskra will guide your first practice.",
          )}
        </p>
        <button className="ready-text-button" onClick={onGuide}>
          {t("Познакомиться с Искрой", "Meet Iskra")}
          <ArrowRight size={15} />
        </button>
      </div>
    </Reveal>
  );
}
