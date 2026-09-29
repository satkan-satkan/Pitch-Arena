import { Avatar } from "./ImagePicker";
import React, { useEffect, useState } from "react";
import { ArrowUpRight, Plus, RefreshCw } from "lucide-react";
import { api } from "../services/api";
// The board consumes only the public, moderated listing snapshots.
export default function StartupBoard({
  t,
  onDirectory,
  onOpen,
  onCreate,
  compact = false,
}) {
  const [data, setData] = useState(null),
    [error, setError] = useState(false),
    [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    setError(false);
    api("/startups?page=0")
      .then((r) => live && setData(r))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [reload]);
  return (
    <section
      className={`startup-board ${compact ? "compact" : ""}`}
      aria-label={t("Витрина стартапов", "Startup board")}
    >
      <div className="board-heading">
        <div>
          <span className="eyebrow">
            {t("СОЗДАНО ОСНОВАТЕЛЯМИ", "BUILT BY FOUNDERS")}
          </span>
          <h2>{t("На радаре", "On the radar")}</h2>
          <p>
            {t(
              "Продукты нашего сообщества. От первых пользователей к первым продажам.",
              "Community products. From first users to first sales.",
            )}
          </p>
        </div>
        <button className="button white" onClick={onDirectory}>
          {t("Все стартапы", "All startups")}
          <ArrowUpRight size={15} />
        </button>
      </div>
      {error ? (
        <div className="board-empty" role="status">
          <p>
            {t(
              "Витрина временно недоступна.",
              "The board is temporarily unavailable.",
            )}
          </p>
          <button
            className="button white"
            onClick={() => setReload((n) => n + 1)}
          >
            <RefreshCw size={14} />
            {t("Повторить", "Retry")}
          </button>
        </div>
      ) : !data ? (
        <p role="status">{t("Загружаем стартапы…", "Loading startups…")}</p>
      ) : data.items.length ? (
        <div className="board-grid">
          {data.items.slice(0, compact ? 3 : 6).map((item) => {
            const d = item;
            return (
              <button
                key={item.id}
                className="board-startup"
                onClick={() => onOpen(item.id)}
              >
                <span className="board-monogram">
                  <Avatar src={d.logo} name={d.name} />
                </span>
                <div>
                  <h3>{d.name}</h3>
                  <p>{d.tagline}</p>
                  <span>
                    {d.region || t("Глобальный продукт", "Global product")}
                  </span>
                </div>
                <ArrowUpRight size={18} />
                {d.monthlyRevenue !== null &&
                  d.monthlyRevenue !== undefined && (
                    <small>
                      {new Intl.NumberFormat(t("ru-RU", "en-US")).format(
                        d.monthlyRevenue,
                      )}{" "}
                      {d.currency} /{" "}
                      {t("мес. · со слов основателя", "mo · founder reported")}
                    </small>
                  )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="board-empty">
          <strong>
            {t(
              "Здесь появится первая история основателя.",
              "The first founder story belongs here.",
            )}
          </strong>
          <p>
            {t(
              "Добавь работающий стартап или проект в разработке. После модерации карточка появится на лендинге и в игре.",
              "Add a live startup or a project in progress. Approved profiles appear on the landing page and in the game.",
            )}
          </p>
        </div>
      )}
      <div className="board-footer">
        <span>
          {t(
            "Новые публикации · без платного ранжирования",
            "Latest publications · no paid ranking",
          )}
        </span>
        <button className="button dark" onClick={onCreate}>
          <Plus size={15} />
          {t("Добавить свой стартап", "Add your startup")}
        </button>
      </div>
    </section>
  );
}
