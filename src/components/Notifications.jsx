import React, { useEffect, useRef, useState } from "react";
import { Bell, ArrowUpRight, RefreshCw } from "lucide-react";
import { api, errorText } from "../services/api";
const statuses = {
  pending: ["На модерации", "Under review"],
  published: ["Опубликован", "Published"],
  changes_requested: ["Нужны изменения", "Changes requested"],
  hidden: ["Публикация скрыта", "Publication hidden"],
};
export default function Notifications({ t, account, onWorkspace, onSignIn }) {
  const [open, setOpen] = useState(false),
    [items, setItems] = useState([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  const key = `pa-notifications:${account?.id || "guest"}`;
  const [seen, setSeen] = useState(() => {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  });
  const ref = useRef();
  useEffect(() => {
    if (!account) return;
    let active = true;
    let requestId = 0;
    const refresh = async () => {
      if (document.hidden) return;
      const current = ++requestId;
      setLoading(true);
      setError("");
      try {
        const [invitations, startups] = await Promise.all([
          api("/workspace/invitations"),
          api("/workspace/startups"),
        ]);
        if (!active || current !== requestId) return;
        setItems([
          ...invitations.items.map((i) => ({
            id: `invitation:${i.id}`,
            name: i.teamName,
            kind: "invitation",
          })),
          ...startups.items
            .filter((s) => statuses[s.status])
            .map((s) => ({
              id: `listing:${s.id}:${s.revision}:${s.status}`,
              name: s.data.name,
              kind: s.status,
            })),
        ]);
      } catch (e) {
        if (active && current === requestId) setError(errorText(e, t));
      } finally {
        if (active && current === requestId) setLoading(false);
      }
    };
    refresh();
    window.addEventListener("focus", refresh);
    const interval = setInterval(refresh, 60000);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [account?.id, open, reload]);
  useEffect(() => {
    if (!open) return;
    const outside = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const escape = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        ref.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const mark = (ids) => {
    const next = [...new Set([...seen, ...ids])].slice(-300);
    setSeen(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  };
  const unread = items.filter((i) => !seen.includes(i.id)).length;
  return (
    <div className="notification-wrap" ref={ref}>
      <button
        className="icon-button notification-button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("Уведомления", "Notifications")}
        aria-expanded={open}
      >
        <Bell size={19} />
        {unread > 0 && <i data-testid="unread-notifications" />}
      </button>
      {open && (
        <section
          className="notification-pop notification-center"
          aria-label={t("Центр уведомлений", "Notification center")}
        >
          <strong>
            {t("Уведомления", "Notifications")}
            {unread ? ` · ${unread}` : ""}
          </strong>
          {!account ? (
            <>
              <p>
                {t(
                  "Войди, чтобы видеть приглашения в команды и статусы своих публикаций.",
                  "Sign in to see team invitations and publication updates.",
                )}
              </p>
              <button
                onClick={() => {
                  setOpen(false);
                  onSignIn();
                }}
              >
                {t("Войти", "Sign in")}
              </button>
            </>
          ) : (
            <>
              {loading && <p role="status">{t("Обновляем…", "Updating…")}</p>}
              {error ? (
                <>
                  <p role="alert">{error}</p>
                  <button onClick={() => setReload((n) => n + 1)}>
                    <RefreshCw size={14} />
                    {t("Повторить", "Retry")}
                  </button>
                </>
              ) : !items.length && !loading ? (
                <p>{t("Новых событий пока нет.", "No updates yet.")}</p>
              ) : (
                <ul>
                  {items.map((i) => (
                    <li key={i.id}>
                      <button
                        className={seen.includes(i.id) ? "read" : "unread"}
                        onClick={() => {
                          mark([i.id]);
                          setOpen(false);
                          onWorkspace();
                        }}
                      >
                        <span>
                          <strong>{i.name}</strong>
                          <small>
                            {i.kind === "invitation"
                              ? t("Приглашение в команду", "Team invitation")
                              : t(...statuses[i.kind])}
                          </small>
                        </span>
                        <ArrowUpRight size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {unread > 0 && (
                <button onClick={() => mark(items.map((i) => i.id))}>
                  {t("Отметить прочитанными", "Mark as read")}
                </button>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
