// Texts confirmed by the owner against the supplied ElevenLabs recordings.
// Keep these literal: contextual/AI questions must never play a different line.
export const armanRecordings = {
  customer: {
    src: "/audio/investors/arman/customer.mp3",
    text: "Подожди, вот здесь интересно. Кто твой первый пользователь? Он ведь уже как-то решает эту проблему. Почему он должен бросить привычный способ и прийти к тебе?",
  },
  demand: {
    src: "/audio/investors/arman/demand.mp3",
    text: "Какое самое сильное доказательство того, что людям нужен твой продукт? Почему ты считаешь его убедительным?",
  },
  comparison: {
    src: "/audio/investors/arman/comparison.mp3",
    text: "С чем пользователь сравнивает твой продукт? За счёт чего ты выигрываешь — и чем это подтверждается?",
  },
  funding: {
    src: "/audio/investors/arman/funding.mp3",
    text: "Какого конкретного результата ты хочешь достичь за следующие три месяца? На что потратишь ресурсы в первую очередь и почему?",
  },
  timeUp: {
    src: "/audio/investors/arman/time-up.mp3",
    text: "Всё, время. Спасибо! Теперь давай поговорим чуть подробнее.",
  },
};

export const hasArmanRecordings = (arena, language) =>
  language === "ru" &&
  arena.personaIds?.length === 1 &&
  arena.personaIds[0] === "arman";

export function recordingForQuestion(question, person, language) {
  if (
    !question ||
    question.followUp ||
    person?.id !== "arman" ||
    language !== "ru"
  )
    return null;
  return (
    Object.entries(armanRecordings).find(
      ([key, clip]) => key !== "timeUp" && clip.text === question.text,
    )?.[1] || null
  );
}
