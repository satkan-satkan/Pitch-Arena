import React, { useEffect, useState } from "react";
import { ArrowUpRight, Plus, RefreshCw, Trophy } from "lucide-react";
import { api, errorText } from "../services/api";
export default function StartupLeaderboard({ t, onOpen, onCreate }) {
  const [currency, setCurrency] = useState("USD"),
    [page, setPage] = useState(0),
    [reload, setReload] = useState(0);
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    api(`/startups?sort=revenue&currency=${currency}&page=${page}`)
      .then((r) => {
        if (!active) return;
        // A publication can disappear while the reader is on the last page.
        if (page > 0 && !r.items.length) setPage(0);
        else setData(r);
      })
      .catch((e) => active && setError(errorText(e, t)));
    return () => {
      active = false;
    };
  }, [currency, page, reload]);
  return (
    <section className="startup-leaderboard">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {t("ПРОДУКТЫ СООБЩЕСТВА", "COMMUNITY PRODUCTS")}
          </span>
          <h1>{t("Рейтинг стартапов", "Startup leaderboard")}</h1>
          <p>
            {t(
              "Опубликованные стартапы по месячной выручке. Показатели указаны основателями и не подтверждены платформой.",
              "Published startups ranked by monthly revenue. Figures are founder reported and not verified by the platform.",
            )}
          </p>
        </div>
      </div>
      <div className="leaderboard-controls">
        <label>
          {t("Валюта выручки", "Revenue currency")}
          <select
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value);
              setPage(0);
            }}
          >
            {["USD", "KZT", "RUB", "EUR"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button
          className="button white"
          onClick={() => setReload((n) => n + 1)}
        >
          <RefreshCw size={15} />
          {t("Обновить", "Refresh")}
        </button>
        <button className="button dark" onClick={onCreate}>
          <Plus size={15} />
          {t("Добавить стартап", "Add a startup")}
        </button>
      </div>
      <p className="leaderboard-note">
        {t(
          "Сравниваем только одну валюту. Пустая выручка не участвует в рейтинге; нулевая — участвует. При равенстве выше более свежая публикация.",
          "Only one currency is compared. Undisclosed revenue is excluded; zero revenue is included. Ties use the latest publication first.",
        )}
      </p>
      {error ? (
        <div className="community-empty">
          <p role="alert">{error}</p>
          <button
            className="button white"
            onClick={() => setReload((n) => n + 1)}
          >
            {t("Повторить", "Retry")}
          </button>
        </div>
      ) : !data ? (
        <p role="status">{t("Загружаем рейтинг…", "Loading leaderboard…")}</p>
      ) : !data.items.length ? (
        <div className="community-empty">
          <Trophy size={28} />
          <h2>
            {t("Первое место пока свободно", "The first place is still open")}
          </h2>
          <p>
            {t(
              `Пока нет опубликованных карточек с выручкой в ${currency}. Добавь свой стартап и отправь его на модерацию.`,
              `No published listings disclose revenue in ${currency} yet. Add your startup and submit it for review.`,
            )}
          </p>
          <button className="button dark" onClick={onCreate}>
            {t("Создать карточку", "Create a listing")}
          </button>
        </div>
      ) : (
        <>
          <ol className="live-ranking" start={page * 24 + 1}>
            {data.items.map((s, i) => (
              <li key={s.id}>
                <button onClick={() => onOpen(s.id)}>
                  <span className="live-rank">{page * 24 + i + 1}</span>
                  <span className="startup-icon">
                    {s.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="live-ranking-copy">
                    <strong>{s.name}</strong>
                    <span>{s.tagline}</span>
                  </span>
                  <span className="live-revenue">
                    <strong>
                      {new Intl.NumberFormat(t("ru-RU", "en-US")).format(
                        s.monthlyRevenue,
                      )}{" "}
                      {s.currency}
                    </strong>
                    <small>
                      {t(
                        "в месяц · со слов основателя",
                        "per month · founder reported",
                      )}
                    </small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              </li>
            ))}
          </ol>
          <div className="leaderboard-controls">
            <button
              className="button white"
              disabled={!page}
              onClick={() => setPage((p) => p - 1)}
            >
              {t("Назад", "Previous")}
            </button>
            <span>
              {page * 24 + 1}–{page * 24 + data.items.length} / {data.total}
            </span>
            <button
              className="button white"
              disabled={(page + 1) * 24 >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("Дальше", "Next")}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
