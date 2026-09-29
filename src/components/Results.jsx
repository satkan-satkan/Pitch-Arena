import React from "react";
import {
  Trophy,
  Star,
  CheckCircle2,
  Lightbulb,
  Globe2,
  Download,
  ArrowUpRight,
} from "lucide-react";

import PracticeFeedback from "./PracticeFeedback";
import MentorFeedback from "./MentorFeedback";
import { compareAttempt } from "../practice/engine";
import { GuideMessage } from "../guide/Guide";

export default function Results({
  result: r,
  t,
  onClose,
  onRetry,
  onMap,
  nextChallenge,
  onNext,
  Modal,
  history,
  guideEnabled = true,
}) {
  const comparison = compareAttempt(r, history);
  const download = () => {
    const content = [
      r.startup,
      r.arena,
      `${r.score}/100`,
      ...(r.pitchTranscript
        ? [
            t("ИСХОДНЫЙ ПИТЧ", "ORIGINAL PITCH"),
            r.pitchTranscript,
            t("ВОПРОСЫ И ОТВЕТЫ", "QUESTIONS AND ANSWERS"),
          ]
        : []),
      ...(r.nextGoal
        ? [
            t("СЛЕДУЮЩАЯ ПОПЫТКА", "NEXT ATTEMPT"),
            t(...r.nextGoal.instruction),
            ...r.dimensions.map((d) => `${t(...d.name)}: ${d.points}/20`),
          ]
        : []),
      ...(comparison
        ? [
            t("ИЗМЕНЕНИЕ БАЛЛА", "SCORE CHANGE"),
            `${comparison.previousScore} → ${r.score} (${comparison.delta > 0 ? "+" : ""}${comparison.delta})`,
          ]
        : []),
      ...r.questions.flatMap((q, i) => [q, r.answers[i] || ""]),
    ].join("\n\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.startup}-pitch.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <Modal onClose={onClose} label={t("Результат питча", "Pitch results")} wide>
      <div className="result-heading">
        <span className="result-trophy">
          <Trophy size={30} />
        </span>
        <div className="eyebrow">
          {t("РАЗБОР ПОСЛЕ ВСТРЕЧИ", "POST-MEETING REVIEW")}
        </div>
        <h2>{t("Раунд завершён", "Round complete")}</h2>
        <div className="result-stars">
          {[1, 2, 3].map((n) => (
            <Star
              key={n}
              size={25}
              className={n <= (r.stars || 1) ? "earned" : ""}
            />
          ))}
        </div>
        <p>
          {r.startup} · {r.arena}
        </p>
      </div>
      {guideEnabled && (
        <GuideMessage t={t} phase="completed" score={r.score} compact />
      )}
      <div className="result-stats">
        <div>
          <strong>
            {r.score}
            <small>/100</small>
          </strong>
          <span>{t("Учебный балл", "Practice score")}</span>
        </div>
        <div>
          <strong>
            +{r.xp ?? 100}
            <small>XP</small>
          </strong>
          <span>
            {t("За завершённую тренировку", "For completing the practice")}
          </span>
        </div>
        <div>
          <strong>
            {Math.floor(r.duration / 60)}:
            {String(r.duration % 60).padStart(2, "0")}
          </strong>
          <span>{t("Время всей сессии", "Total session time")}</span>
        </div>
      </div>
      {r.newMedals?.length > 0 && (
        <div className="new-medals">
          <span>{t("НОВЫЕ ДОСТИЖЕНИЯ", "NEW ACHIEVEMENTS")}</span>
          {r.newMedals.map((m) => (
            <div key={m.id}>
              <strong>{m.icon}</strong>
              <span>{t(...m.name)}</span>
              <CheckCircle2 size={15} />
            </div>
          ))}
        </div>
      )}
      {r.pitchTranscript && (
        <details className="result-transcript">
          <summary>
            {t("Твой исходный питч", "Your original pitch")} · {r.pitchDuration}{" "}
            {t("сек", "sec")}
          </summary>
          <p>{r.pitchTranscript}</p>
        </details>
      )}
      <MentorFeedback review={r.mentor} t={t} />
      {r.scoringVersion === 3 ? (
        <PracticeFeedback result={r} comparison={comparison} t={t} />
      ) : (
        <>
          <div className="result-feedback">
            <h3>
              {t("Фокус для следующего питча", "Focus for your next pitch")}
            </h3>
            {[
              [
                r.coverage >= 4,
                t("Структура ответов", "Answer structure"),
                r.coverage >= 4
                  ? t(
                      "Большинство ответов достаточно развёрнуты. Попробуй уложить каждый в 30–60 секунд.",
                      "Most answers have enough detail. Try keeping each one to 30–60 seconds.",
                    )
                  : t(
                      "Раскрой ответы: проблема → решение → пример. Старайся давать хотя бы 15 слов на каждый вопрос.",
                      "Add detail: problem → solution → example. Aim for at least 15 words per answer.",
                    ),
              ],
              [
                r.evidence >= 2,
                t("Цифры и доказательства", "Numbers and evidence"),
                r.evidence >= 2
                  ? t(
                      "Ты использовал цифры. На следующем питче добавь источники и период измерения.",
                      "You included numbers. Next time, add sources and the measurement period.",
                    )
                  : t(
                      "Добавь конкретные метрики: размер рынка, выручку, количество клиентов или план использования инвестиций.",
                      "Add specific metrics: market size, revenue, customer count, or a plan for using the investment.",
                    ),
              ],
            ].map(([good, title, body], i) => (
              <div className="feedback-item" key={i}>
                {good ? <CheckCircle2 size={20} /> : <Lightbulb size={20} />}
                <section>
                  <strong>{title}</strong>
                  <p>{body}</p>
                </section>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="info-note">
        {r.scoringVersion === 3
          ? t(
              "Локальная проверка текста: до 50 за элементы питча и до 50 за ответы. Длина текста и отдельные цифры не дают бонусов. XP: награда арены + 5 за каждые 10 баллов. Это учебные ориентиры, не ИИ-оценка бизнеса.",
              "Local text checks: up to 50 for pitch elements and 50 for answers. Text length and isolated numbers earn no bonuses. XP: arena reward + 5 per 10 points. These are practice signals, not an AI business evaluation.",
            )
          : r.scoringVersion === 2
            ? t(
                "Учебный балл: темы питча — до 25, развёрнутые ответы — до 40, цифры — до 25, объём питча — до 10. XP: награда арены + 5 за каждые 10 баллов. Это локальные правила, не ИИ-оценка бизнеса.",
                "Practice score: pitch topics up to 25, detailed answers up to 40, numbers up to 25, pitch length up to 10. XP: arena reward + 5 per 10 points. These are local rules, not an AI business evaluation.",
              )
            : t(
                "Оценка по формуле: развёрнутые ответы — до 50 баллов, объём текста — до 25, наличие цифр — до 25. Это не ИИ-анализ качества бизнеса.",
                "Scoring formula: detailed answers up to 50 points, text length up to 25, use of numbers up to 25. This is not an AI evaluation of your business.",
              )}
      </p>
      <button className="button dark full result-map-button" onClick={onMap}>
        {t("Вернуться на карту", "Back to the world map")}
        <Globe2 size={17} />
      </button>
      {nextChallenge && (
        <section className="result-next-challenge">
          <div>
            <small>{t("СЛЕДУЮЩАЯ АРЕНА", "NEXT ARENA")}</small>
            <strong>{t(...nextChallenge.title)}</strong>
            <p>{t(...nextChallenge.subtitle)}</p>
          </div>
          <button className="button dark" onClick={onNext}>
            {t("Продолжить путь", "Continue the journey")}{" "}
            <ArrowUpRight size={17} />
          </button>
        </section>
      )}
      <div className="modal-actions">
        <button className="button white" onClick={download}>
          <Download size={16} />
          {t("Скачать диалог", "Download transcript")}
        </button>
        <button className="button dark" onClick={onRetry}>
          {t("Улучшить питч", "Improve my pitch")}
          <ArrowUpRight size={17} />
        </button>
      </div>
    </Modal>
  );
}
