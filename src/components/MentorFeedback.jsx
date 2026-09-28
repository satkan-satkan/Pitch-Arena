import React from "react";
import { Sparkles } from "lucide-react";
export default function MentorFeedback({ review, t }) {
  if (!review) return null;
  if (review.unavailable)
    return (
      <p className="mentor-status" role="status">
        {t(
          "ИИ сейчас недоступен. Ниже — локальная проверка; можно продолжить тренировку или повторить разбор позже.",
          "AI is unavailable right now. The local checks below still work; continue practicing or retry the review later.",
        )}
      </p>
    );
  return (
    <section className="mentor-review">
      <div className="practice-eyebrow">
        <Sparkles size={15} />
        {t("ИИ-НАСТАВНИК", "AI COACH")}
      </div>
      <p>{review.summary || review.comment}</p>
      {review.quote && <blockquote>«{review.quote}»</blockquote>}
      {["strengths", "improvements"].map(
        (key) =>
          review[key]?.length > 0 && (
            <div key={key}>
              <h4>
                {key === "strengths"
                  ? t("Что работает", "What works")
                  : t("Что усилить", "What to strengthen")}
              </h4>
              {review[key].map((item, i) => (
                <div key={i}>
                  {item.quote && <blockquote>«{item.quote}»</blockquote>}
                  <p>{item.comment}</p>
                </div>
              ))}
            </div>
          ),
      )}
      {review.deckNotes && (
        <div>
          <h4>{t("По презентации", "About your slides")}</h4>
          <p>{review.deckNotes}</p>
        </div>
      )}
      <small>
        {t(
          "Обратная связь ИИ. Учебные баллы рассчитываются отдельно по правилам игры.",
          "AI feedback. Practice points are calculated separately by game rules.",
        )}
      </small>
    </section>
  );
}
