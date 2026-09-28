import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useArenaMotion } from "../motion/Motion";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { guideCue } from "./model";
import "./guide.css";
const emotions = {
  welcome: ["приветствует", "welcoming"],
  thinking: ["размышляет", "thinking"],
  listening: ["слушает", "listening"],
  support: ["поддерживает", "encouraging"],
  celebrate: ["радуется", "celebrating"],
};
export function GuidePortrait({
  emotion = "welcome",
  t,
  className = "",
  quiet = false,
}) {
  const mood = emotions[emotion] ? emotion : "welcome";
  const { enabled } = useArenaMotion();
  const [loadedMood, setLoadedMood] = useState(mood);
  useEffect(() => {
    let active = true;
    const image = new Image();
    image.src = `/guide/iskra-${mood}.png`;
    image
      .decode()
      .then(() => {
        if (active) setLoadedMood(mood);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [mood]);
  const poses = {
    welcome: { rotate: [0, -3, 2, 0], y: [0, -5, 0] },
    thinking: { rotate: [0, -5, -3, 0], y: [0, -2, 0] },
    listening: { rotate: [0, 1, 0], y: [0, -2, 0] },
    support: { rotate: [0, 3, 0], y: [0, -3, 0] },
    celebrate: { rotate: [0, -5, 5, 0], y: [0, -12, 0, -5, 0] },
  };
  const moving = enabled && !quiet;
  return (
    <motion.span
      className={`guide-portrait ${className}`}
      data-emotion={loadedMood}
      data-quiet={quiet}
      animate={moving ? poses[loadedMood] : { rotate: 0, y: 0 }}
      transition={{ duration: moving ? 1.2 : 0, ease: "easeInOut" }}
      whileHover={
        moving
          ? { y: -5, rotate: -3, transition: { duration: 0.25 } }
          : undefined
      }
    >
      <AnimatePresence initial={false}>
        <motion.img
          key={loadedMood}
          src={`/guide/iskra-${loadedMood}.png`}
          alt={`${t("Искра", "Iskra")} — ${t(...emotions[loadedMood])}`}
          width="180"
          height="180"
          decoding="async"
          initial={{ opacity: moving ? 0 : 1, scale: moving ? 0.95 : 1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: moving ? 0.24 : 0 }}
        />
      </AnimatePresence>
    </motion.span>
  );
}
export function GuideMessage({
  t,
  phase,
  emotion,
  title,
  text,
  compact = false,
  children,
  ...context
}) {
  const cue = guideCue({ phase, ...context });
  return (
    <section
      className={`guide-message ${compact ? "compact" : ""}`}
      data-emotion={emotion || cue.emotion}
      aria-label={t("Подсказка Искры", "Iskra’s tip")}
    >
      <GuidePortrait
        emotion={emotion || cue.emotion}
        t={t}
        quiet={phase === "pitch"}
      />
      <div className="guide-bubble">
        <span className="guide-name">
          {t("ИСКРА · ТВОЙ ГИД", "ISKRA · YOUR GUIDE")}
        </span>
        <strong>{title || t(...cue.title)}</strong>
        <p>{text || t(...cue.text)}</p>
        {children}
      </div>
    </section>
  );
}
export function GuideHome({ guide, t, onOpen, hasDraft, onResume }) {
  if (!guide.state.enabled) return null;
  const completed = guide.state.status === "completed";
  return (
    <div className="guide-home">
      <GuideMessage
        t={t}
        emotion={completed ? "celebrate" : hasDraft ? "support" : "welcome"}
        title={
          completed
            ? t(
                "Раунд закрыт. Что улучшаем?",
                "Round complete. What needs work?",
              )
            : hasDraft
              ? t("Твоя история ждёт продолжения", "Your story is waiting")
              : t(
                  "Давай проверим твой питч.",
                  "Let’s put your pitch to the test.",
                )
        }
        text={
          completed
            ? t(
                "Посмотри задачу для следующей попытки или выбери другую арену. Я рядом, если понадоблюсь.",
                "Review your next goal or choose another arena. I’m here when you need me.",
              )
            : hasDraft
              ? t(
                  "Сначала продолжи сохранённую тренировку. Новый питч начнём, когда закончишь этот.",
                  "Resume your saved practice first. We can start a new pitch when you finish this one.",
                )
              : t(
                  "Я Искра, редактор твоего питча. Начнём с минуты перед «Своими людьми». Затем разберём, где аргумент, а где пока предположение.",
                  "I’m Iskra, your pitch editor. Start with a minute in front of Friends & family. Then we’ll separate evidence from assumptions.",
                )
        }
      >
        <div className="guide-actions">
          <button
            className="button dark"
            onClick={hasDraft ? onResume : onOpen}
          >
            {hasDraft
              ? t("Продолжить с Искрой", "Resume with Iskra")
              : completed
                ? t("Повторить обучение", "Replay introduction")
                : t("Первый питч с Искрой", "First pitch with Iskra")}
            <ArrowRight size={15} />
          </button>
          <span>
            {t(
              "Можно пропустить · голос необязателен",
              "Optional · no microphone required",
            )}
          </span>
        </div>
      </GuideMessage>
      <button
        className="guide-dismiss"
        aria-label={t("Скрыть подсказки Искры", "Hide Iskra’s tips")}
        onClick={() => guide.dispatch({ type: "toggle" })}
      >
        <X size={15} />
      </button>
    </div>
  );
}
const intro = [
  {
    emotion: "welcome",
    title: ["Давай познакомимся", "Let’s meet"],
    text: [
      "Я Искра. Помогу собрать питч, который выдержит уточняющий вопрос. Начнём с тренировки перед «Своими людьми».",
      "I’m Iskra. Let’s build a pitch that survives a follow-up question. We’ll start with Friends & family.",
    ],
    task: [
      "Твоя цель — понятно объяснить идею, а не впечатлить сложными словами.",
      "Your goal is to explain your idea clearly, not impress with jargon.",
    ],
  },
  {
    emotion: "thinking",
    title: ["Три опоры для первой истории", "Three anchors for your story"],
    text: [
      "Подумай: кому ты помогаешь, какую проблему решаешь и как работает продукт. Если есть подтверждение спроса — добавь его.",
      "Think about who you help, what problem you solve and how your product works. Add evidence of demand if you have it.",
    ],
    task: [
      "«Мы помогаем [кому] справиться с [проблемой] с помощью [решения]».",
      "“We help [who] solve [problem] with [solution].”",
    ],
  },
  {
    emotion: "support",
    title: ["Твоя первая сцена", "Your first stage"],
    text: [
      "Предлагаю начать с 60 секунд. Затем проверишь текст, увидишь разбор и ответишь на пять вопросов; возможно одно уточнение. Время можно изменить в подготовке.",
      "Start with 60 seconds. Then check the text, review your pitch and answer five questions, with at most one follow-up. You can adjust the time during setup.",
    ],
    task: [
      "Можно говорить или печатать. Слайды необязательны. Награда появится только после завершения тренировки.",
      "Speak or type. Slides are optional. Rewards arrive only after you complete the practice.",
    ],
  },
];
export function GuideIntro({
  guide,
  t,
  Modal,
  onClose,
  onStart,
  hasDraft,
  onResume,
}) {
  const step = guide.state.introStep,
    card = intro[step];
  return (
    <Modal
      wide
      label={t("Знакомство с Искрой", "Meet Iskra")}
      onClose={onClose}
    >
      <div className="guide-intro">
        <div className="guide-intro-art">
          <span>✦</span>
          <GuidePortrait emotion={card.emotion} t={t} />
          <small>{t("РЕДАКТОР / НА СВЯЗИ", "EDITOR / ON COMMS")}</small>
        </div>
        <div className="guide-intro-copy">
          <span className="eyebrow">
            {t("ПЕРВЫЙ ПИТЧ", "YOUR FIRST PITCH")} · {step + 1} / 3
          </span>
          <h2>{t(...card.title)}</h2>
          <p>{t(...card.text)}</p>
          <blockquote>{t(...card.task)}</blockquote>
          <div
            className="guide-intro-progress"
            aria-label={t("Этапы знакомства", "Introduction steps")}
          >
            {intro.map((_, i) => (
              <button
                key={i}
                aria-label={t(`Шаг ${i + 1}`, `Step ${i + 1}`)}
                aria-current={step === i ? "step" : undefined}
                onClick={() => guide.dispatch({ type: "step", step: i })}
              >
                {i < step ? <Check size={13} /> : i + 1}
              </button>
            ))}
          </div>
          <button
            className="button dark"
            onClick={() =>
              step < 2
                ? guide.dispatch({ type: "step", step: step + 1 })
                : hasDraft
                  ? onResume()
                  : onStart()
            }
          >
            {step < 2
              ? t("Дальше", "Next")
              : hasDraft
                ? t("Продолжить тренировку", "Resume practice")
                : t("Подготовить первый питч", "Prepare first pitch")}
            <ArrowRight size={16} />
          </button>
          <button className="ready-text-button" onClick={onClose}>
            {t("Пока самостоятельно", "Explore on my own")}
          </button>
        </div>
      </div>
      <div className="guide-preferences">
        <Sparkles size={15} />
        <span>
          {t(
            "Подсказки и эмоции следуют этапам игры. Искра не оценивает твой голос.",
            "Tips and emotions follow game stages. Iskra does not evaluate your voice.",
          )}
        </span>
        <button onClick={() => guide.dispatch({ type: "toggle" })}>
          {guide.state.enabled
            ? t("Отключить подсказки", "Turn tips off")
            : t("Включить подсказки", "Turn tips on")}
        </button>
      </div>
    </Modal>
  );
}
