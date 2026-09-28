import React from "react";
import MentorFeedback from "./MentorFeedback";
import { CheckCircle2, Target, ArrowUpRight } from "lucide-react";

export function EvidenceChecks({ checks, t }) {
  return (
    <ul className="evidence-checks">
      {checks.map((check) => (
        <li key={check.id} className={check.found ? "matched" : "missing"}>
          {check.found ? <CheckCircle2 size={16} /> : <Target size={16} />}
          <div>
            <strong>{t(...check.label)}</strong>
            <p>
              {check.found
                ? t("Есть в тексте", "Found in the text")
                : t(...check.hint)}
            </p>
            {check.found && check.quote && (
              <blockquote>«{check.quote}»</blockquote>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
export function PracticeGoal({ goal, t, compact = false }) {
  if (!goal) return null;
  return (
    <section className={`practice-goal ${compact ? "compact" : ""}`}>
      <div className="practice-eyebrow">
        <Target size={15} />
        {t("МИССИЯ НА СЛЕДУЮЩУЮ ПОПЫТКУ", "YOUR NEXT ATTEMPT MISSION")}
      </div>
      <h3>{t(...goal.title)}</h3>
      <p>{t(...goal.instruction)}</p>
      {!compact && goal.quote && (
        <blockquote>
          {t("Сейчас в питче", "In this pitch")}: «{goal.quote}»
        </blockquote>
      )}
    </section>
  );
}
export default function PracticeFeedback({ result: r, comparison, t }) {
  const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
  return (
    <div className="practice-feedback">
      <section
        className="attempt-comparison"
        aria-label={t("Сравнение попыток", "Attempt comparison")}
      >
        <div>
          <span className="practice-eyebrow">
            {t("ТВОЙ ПРОГРЕСС", "YOUR PROGRESS")}
          </span>
          <h3>
            {comparison
              ? t(
                  "По сравнению с прошлой попыткой",
                  "Compared with your previous attempt",
                )
              : t("Точка отсчёта сохранена", "Your baseline is saved")}
          </h3>
        </div>
        {comparison ? (
          <>
            <div
              className={`comparison-score ${comparison.delta < 0 ? "decreased" : ""}`}
            >
              <strong>
                {comparison.previousScore} → {r.score}
              </strong>
              <span>
                {signed(comparison.delta)} {t("баллов", "points")}
              </span>
            </div>
            <p>
              {t("Исходный питч", "Opening pitch")}:{" "}
              {signed(comparison.pitchDelta)} / 50 ·{" "}
              {t("Сравнение с", "Compared with")}{" "}
              {new Date(comparison.date).toLocaleDateString(
                t("ru-RU", "en-US"),
              )}
            </p>
          </>
        ) : (
          <p>
            {t(
              "После повторного раунда здесь появится сравнение. Сопоставляем одинаковое название стартапа, арену, лимит времени и версию оценки; старые баллы не смешиваем с новой формулой.",
              "Repeat this round to see your progress. We match the startup name, arena, time limit, and scoring version; older scores use a different formula.",
            )}
          </p>
        )}
      </section>
      <section className="practice-rubric">
        <h3>{t("Из чего сложился балл", "How your score adds up")}</h3>
        <p>
          {t(
            "Каждая тема: до 10 за исходный питч и до 10 за ответы. Найденные элементы не подтверждают истинность заявлений.",
            "Each topic: up to 10 for the opening pitch and 10 for answers. Detected elements do not verify your claims.",
          )}
        </p>
        {r.dimensions.map((d) => (
          <div className="rubric-row" key={d.id}>
            <div>
              <strong>{t(...d.name)}</strong>
              <small>
                {t("Питч", "Pitch")} {d.pitchPoints}/10 ·{" "}
                {t("Ответы", "Answers")} {d.answerPoints}/10
              </small>
            </div>
            <div className="rubric-track" aria-hidden="true">
              <span style={{ width: `${d.points * 5}%` }} />
            </div>
            <b>{d.points}/20</b>
            {comparison && (
              <span className="rubric-delta">
                {signed(comparison.dimensions.find((c) => c.id === d.id).delta)}
              </span>
            )}
          </div>
        ))}
      </section>
      <PracticeGoal goal={r.nextGoal} t={t} />
      <details className="practice-evidence">
        <summary>
          {t(
            "Разбор исходного питча с цитатами",
            "Opening pitch review with quotes",
          )}{" "}
          <ArrowUpRight size={15} />
        </summary>
        {r.analysis.topics.map((topic) => (
          <section key={topic.id}>
            <h4>
              {t(...topic.name)} · {topic.points}/10
            </h4>
            <EvidenceChecks checks={topic.checks} t={t} />
          </section>
        ))}
      </details>
      <details className="practice-evidence">
        <summary>
          {t(
            "Вопросы, ответы и обратная связь",
            "Questions, answers & feedback",
          )}{" "}
          <ArrowUpRight size={15} />
        </summary>
        {r.answerReports.map((report, i) => (
          <section key={i}>
            <h4>
              {i + 1}. {r.questions[i]}
            </h4>
            <blockquote>{r.answers[i]}</blockquote>
            <MentorFeedback review={r.mentorAnswers?.[i]} t={t} />
            <EvidenceChecks checks={report.checks} t={t} />
          </section>
        ))}
      </details>
    </div>
  );
}
