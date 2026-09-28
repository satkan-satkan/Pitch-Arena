export const GUIDE_VERSION = 1;
export const initialGuide = () => ({
  version: GUIDE_VERSION,
  enabled: true,
  introStep: 0,
  status: "new",
  sessionId: null,
});
export function parseGuide(raw) {
  try {
    const s = JSON.parse(raw);
    if (s?.version !== GUIDE_VERSION) return initialGuide();
    return {
      version: GUIDE_VERSION,
      enabled: s.enabled !== false,
      introStep: Math.max(
        0,
        Math.min(2, Number.isInteger(s.introStep) ? s.introStep : 0),
      ),
      status: ["new", "learning", "practicing", "completed"].includes(s.status)
        ? s.status
        : "new",
      sessionId: typeof s.sessionId === "string" ? s.sessionId : null,
    };
  } catch {
    return initialGuide();
  }
}
export function guideTransition(state, event) {
  switch (event.type) {
    case "toggle":
      return { ...state, enabled: !state.enabled };
    case "intro":
      return {
        ...state,
        enabled: true,
        status: state.status === "completed" ? "completed" : "learning",
      };
    case "step":
      return { ...state, introStep: Math.max(0, Math.min(2, event.step)) };
    case "started":
      return { ...state, status: "practicing", sessionId: event.id };
    case "completed":
      return event.id === state.sessionId && state.status === "practicing"
        ? { ...state, status: "completed", sessionId: null }
        : state;
    case "discarded":
      return event.id === state.sessionId
        ? { ...state, status: "learning", sessionId: null }
        : state;
    default:
      return state;
  }
}
// Copy follows observed UI state. No model calls, score changes or microphone access.
export function guideCue({
  phase,
  busy = false,
  error = false,
  score = null,
  answered = false,
}) {
  if (error)
    return {
      emotion: "support",
      title: ["Сделаем паузу", "Let’s pause"],
      text: [
        "Что-то не получилось. Проверь сообщение об ошибке: можно повторить действие. Если микрофон недоступен, продолжай текстом.",
        "Something did not work. Check the error message and retry. If the microphone is unavailable, you can continue by text.",
      ],
    };
  if (phase === "pitch")
    return {
      emotion: "listening",
      title: ["Микрофон твой", "The floor is yours"],
      text: [
        "Сейчас твоя сцена. Вопросы будут после питча.",
        "The stage is yours. Questions come after your pitch.",
      ],
    };
  if (busy)
    return {
      emotion: "thinking",
      title: ["Разбираем по шагам", "One step at a time"],
      text: [
        "Подожди, пока закончится разбор. Текст и конкретные примеры важнее идеальных формулировок.",
        "Wait for the review to finish. Your examples matter more than perfect wording.",
      ],
    };
  if (phase === "ready")
    return {
      emotion: "support",
      title: ["Начни с одного человека", "Start with one person"],
      text: [
        "Кому ты помогаешь и что у него не получается? Скажи это простыми словами. Микрофон необязателен.",
        "Who are you helping, and what is difficult for them? Say it simply. A microphone is optional.",
      ],
    };
  if (phase === "review")
    return {
      emotion: "thinking",
      title: ["Сначала проверим историю", "Let’s check the story"],
      text: [
        "Прочитай транскрипт и исправь ошибки распознавания. Только после подтверждения начнётся разбор, а затем вопросы.",
        "Read your transcript and correct recognition errors. Review begins after confirmation, then questions follow.",
      ],
    };
  if (phase === "analysis")
    return {
      emotion: "thinking",
      title: ["Ищем опору в фактах", "Look for the evidence"],
      text: [
        "Открой один пункт разбора. Найди цитату из своего питча и посмотри, чего не хватает для убедительного ответа.",
        "Open one review criterion. Find the quote from your pitch and see what would make it more convincing.",
      ],
    };
  if (phase === "qa")
    return {
      emotion: answered ? "support" : "thinking",
      title: answered
        ? ["Один ответ — один шаг", "One answer, one step"]
        : ["Отвечай по существу", "Answer the question"],
      text: answered
        ? [
            "Прочитай обратную связь перед следующим вопросом. Если данных пока нет, честно назови способ их проверить.",
            "Read the feedback before the next question. If you lack evidence, explain how you will test it.",
          ]
        : [
            "Сначала ответь прямо, потом добавь пример или число, если оно у тебя есть. Не нужно придумывать метрики.",
            "Answer directly, then add an example or a number if you have one. Do not invent metrics.",
          ],
    };
  if (phase === "completed")
    return {
      emotion: Number.isFinite(score) && score < 50 ? "support" : "celebrate",
      title:
        Number.isFinite(score) && score < 50
          ? ["Есть над чем поработать", "There’s work to do"]
          : ["Раунд завершён.", "Round complete."],
      text: [
        "Посмотри, какие ответы подкреплены фактами. Выбери один пробел для следующей попытки.",
        "Check which answers have evidence behind them. Pick one gap to address next time.",
      ],
    };
  return {
    emotion: "welcome",
    title: ["Привет, я Искра", "Hi, I’m Iskra"],
    text: [
      "Помогу превратить идею в понятный питч. Начнём с небольшой репетиции?",
      "I’ll help turn your idea into a clear pitch. Shall we start with a small rehearsal?",
    ],
  };
}
