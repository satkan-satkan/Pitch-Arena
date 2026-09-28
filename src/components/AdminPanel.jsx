import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  Users,
  Building2,
  Compass,
  ScrollText,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Save,
  X,
  Search,
} from "lucide-react";
import { api, errorText } from "../services/api";
import "./admin.css";
import { StartupModeration } from "./Community";
const sections = [
  ["overview", ShieldCheck, ["Обзор", "Overview"]],
  ["users", Users, ["Пользователи", "Users"]],
  ["projects", Building2, ["Проекты", "Projects"]],
  ["catalog", Compass, ["Арены и инвесторы", "Arenas & investors"]],
  ["startups", Building2, ["Стартапы", "Startups"]],
  ["audit", ScrollText, ["Журнал действий", "Audit log"]],
];
const selectFields = (item, kind) =>
  Object.fromEntries(
    (kind === "arena"
      ? ["title", "description", "pitchSeconds", "level", "enabled"]
      : ["name", "role", "focus", "source", "enabled"]
    ).map((k) => [k, item[k] ?? (k === "source" ? "" : null)]),
  );
export default function AdminPanel({ account, t, onRefresh, Modal }) {
  const [section, setSection] = useState("overview"),
    [page, setPage] = useState(0),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [editing, setEditing] = useState(null),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState(""),
    [notice, setNotice] = useState("");
  const [kind, setKind] = useState("arena");
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    setData(null);
    api(`/admin/${section}?page=${page}&q=${encodeURIComponent(search)}`)
      .then((r) => {
        if (current) setData(r);
      })
      .catch((e) => {
        if (current) setError(errorText(e, t));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [section, page, search, revision]);
  const choose = (next) => {
    if (next === section) return;
    setData(null);
    setLoading(true);
    setSection(next);
    setPage(0);
    setQuery("");
    setSearch("");
    setNotice("");
  };
  const edit = (item, kind) => {
    setError("");
    setReason("");
    setEditing(
      kind === "user"
        ? {
            kind,
            id: item.id,
            label: item.email,
            data: {
              role: item.role,
              status: item.status,
              expectedRole: item.role,
              expectedStatus: item.status,
            },
          }
        : {
            kind,
            id: item.id,
            label: (item.title || item.name)[0],
            revision: item.revision,
            data: selectFields(item, kind),
          },
    );
  };
  const patch = (key, value) =>
    setEditing((e) => ({ ...e, data: { ...e.data, [key]: value } }));
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        editing.kind === "user"
          ? `/admin/users/${editing.id}`
          : `/admin/catalog/${editing.kind}/${editing.id}`,
        {
          method: "PUT",
          data:
            editing.kind === "user"
              ? { ...editing.data, reason }
              : { revision: editing.revision, data: editing.data, reason },
        },
      );
      setEditing(null);
      setNotice(
        t(
          "Изменения сохранены и записаны в журнал.",
          "Changes saved and recorded in the audit log.",
        ),
      );
      setRevision((v) => v + 1);
      await onRefresh();
    } catch (e) {
      setError(errorText(e, t));
    } finally {
      setBusy(false);
    }
  };
  const date = (value) => new Date(value).toLocaleString(t("ru-RU", "en-US"));
  const pairInputs = (key, label, multiline = false) =>
    [0, 1].map((i) => (
      <label key={`${key}-${i}`}>
        {t(...label)} · {i ? "EN" : "RU"}
        {multiline ? (
          <textarea
            rows={4}
            required
            maxLength={key === "description" ? 1400 : 200}
            value={editing.data[key][i]}
            onChange={(e) =>
              patch(
                key,
                editing.data[key].map((v, j) => (j === i ? e.target.value : v)),
              )
            }
          />
        ) : (
          <input
            required
            maxLength={80}
            value={editing.data[key][i]}
            onChange={(e) =>
              patch(
                key,
                editing.data[key].map((v, j) => (j === i ? e.target.value : v)),
              )
            }
          />
        )}
      </label>
    ));
  return (
    <section className="admin-panel">
      <div className="admin-heading">
        <div>
          <span className="eyebrow">
            <ShieldCheck size={15} />
            {t("КАБИНЕТ ВЛАДЕЛЬЦА", "OWNER WORKSPACE")}
          </span>
          <h1>{t("Пульт управления", "Control room")}</h1>
          <p>
            {t(
              "Люди, игровой мир и история изменений.",
              "People, the game world and its change history.",
            )}
          </p>
        </div>
        <button
          className="button white"
          onClick={() => setRevision((v) => v + 1)}
          disabled={loading}
        >
          <RefreshCw size={15} />
          {t("Обновить", "Refresh")}
        </button>
      </div>
      <nav
        className="admin-tabs"
        aria-label={t("Разделы админки", "Admin sections")}
      >
        {sections.map(([id, Icon, label]) => (
          <button
            key={id}
            aria-current={section === id ? "page" : undefined}
            onClick={() => choose(id)}
          >
            <Icon size={16} />
            {t(...label)}
          </button>
        ))}
      </nav>
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      {!loading && data && section === "startups" && (
        <StartupModeration
          {...{ data, t, Modal }}
          onRefresh={() => setRevision((v) => v + 1)}
        />
      )}
      {error && !editing && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {["users", "projects"].includes(section) && (
        <form
          className="admin-search"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            setSearch(query);
          }}
        >
          <Search size={16} />
          <input
            aria-label={t("Поиск в админке", "Admin search")}
            placeholder={
              section === "users"
                ? t("Найти по email", "Search by email")
                : t("Найти проект", "Search projects")
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
          />
          <button className="button white">{t("Найти", "Search")}</button>
        </form>
      )}
      {loading ? (
        <p role="status" className="admin-empty">
          {t("Загружаем данные…", "Loading data…")}
        </p>
      ) : (
        data && (
          <>
            {section === "overview" && (
              <>
                <div className="admin-stats">
                  {[
                    [t("Пользователей", "Users"), data.counts.users],
                    [t("Проектов", "Projects"), data.counts.projects],
                    [
                      t("Завершено тренировок", "Completed practices"),
                      data.counts.completed,
                    ],
                    [
                      t("Черновиков", "Drafts"),
                      data.counts.sessions - data.counts.completed,
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <div className="admin-system">
                  <ShieldCheck size={25} />
                  <div>
                    <h2>{t("Состояние системы", "System status")}</h2>
                    <dl>
                      <dt>{t("База данных", "Database")}</dt>
                      <dd>
                        {data.database === "postgres"
                          ? "PostgreSQL"
                          : t("Тестовая база", "Test database")}
                      </dd>
                      <dt>{t("ИИ-наставник", "AI coach")}</dt>
                      <dd>
                        {data.aiReady
                          ? t("Ключ настроен", "Key configured")
                          : t("Ожидает API-ключ", "Awaiting API key")}
                      </dd>
                      <dt>{t("Загружено слайдов", "Uploaded files")}</dt>
                      <dd>
                        {data.counts.assets} ·{" "}
                        {(data.counts.storageBytes / 1048576).toFixed(1)} MB
                      </dd>
                      <dt>
                        {t("Заблокировано аккаунтов", "Blocked accounts")}
                      </dt>
                      <dd>{data.counts.blocked}</dd>
                    </dl>
                    <p>
                      {t(
                        "Обзор не раскрывает тексты частных выступлений, пароли или ключи.",
                        "This overview does not expose private pitches, passwords or keys.",
                      )}
                    </p>
                  </div>
                </div>
              </>
            )}
            {section === "users" && (
              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("Пользователь", "User")}</th>
                      <th>{t("Доступ", "Access")}</th>
                      <th>{t("Регистрация", "Registered")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.name}</strong>
                          <small>{u.email}</small>
                        </td>
                        <td>
                          <span
                            className={`admin-badge ${u.status === "blocked" ? "blocked" : ""}`}
                          >
                            {u.status === "blocked"
                              ? t("Заблокирован", "Blocked")
                              : u.role === "admin"
                                ? t("Администратор", "Administrator")
                                : t("Участник", "Member")}
                          </span>
                        </td>
                        <td>{date(u.createdAt)}</td>
                        <td>
                          <button
                            className="button white"
                            onClick={() => edit(u, "user")}
                          >
                            {t("Управлять", "Manage")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.items.length && (
                  <p className="admin-empty">
                    {t("Никого не найдено.", "No users found.")}
                  </p>
                )}
              </div>
            )}
            {section === "projects" && (
              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("Проект", "Project")}</th>
                      <th>{t("Владелец", "Owner")}</th>
                      <th>{t("Тренировок", "Practices")}</th>
                      <th>{t("Создан", "Created")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.name}</strong>
                          <small>{p.industry}</small>
                        </td>
                        <td>{p.owner_email}</td>
                        <td>{p.session_count}</td>
                        <td>{date(p.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.items.length && (
                  <p className="admin-empty">
                    {t("Проектов пока нет.", "No projects yet.")}
                  </p>
                )}
              </div>
            )}
            {section === "catalog" && (
              <>
                <div className="admin-catalog-switch">
                  {["arena", "investor"].map((k) => (
                    <button
                      className={`button ${kind === k ? "dark" : "white"}`}
                      onClick={() => setKind(k)}
                      key={k}
                    >
                      {k === "arena"
                        ? t("Арены", "Arenas")
                        : t("Инвесторы", "Investors")}
                    </button>
                  ))}
                </div>
                <p className="admin-help">
                  {t(
                    "Редактируй существующие карточки. Новые настройки применяются к новым тренировкам; начатые сохраняют прежнюю версию.",
                    "Edit existing cards. New settings apply to new practices; ongoing sessions retain their original version.",
                  )}
                </p>
                <div className="admin-catalog-grid">
                  {(kind === "arena" ? data.arenas : data.investors).map(
                    (item) => (
                      <article key={item.id}>
                        <div>
                          <span className="admin-badge">
                            {t("Версия", "Version")} {item.revision}
                          </span>
                          <span
                            className={`admin-badge ${!item.enabled ? "blocked" : ""}`}
                          >
                            {item.enabled
                              ? t("Активно", "Active")
                              : t("Отключено", "Disabled")}
                          </span>
                        </div>
                        <h2>{t(...(item.title || item.name))}</h2>
                        <p>
                          {kind === "arena"
                            ? `${item.pitchSeconds} ${t("сек", "sec")} · ${t("Уровень", "Level")} ${item.level}`
                            : item.role}
                        </p>
                        <button
                          className="button white"
                          onClick={() => edit(item, kind)}
                        >
                          {t("Редактировать", "Edit")}
                        </button>
                      </article>
                    ),
                  )}
                </div>
              </>
            )}
            {section === "audit" && (
              <div className="admin-audit">
                {data.items.map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>{item.action}</strong>
                      <time>{date(item.created_at)}</time>
                    </div>
                    <p>
                      {item.actor_email ||
                        t("Серверная команда", "Server command")}{" "}
                      · {item.target_type} / {item.target_id}
                    </p>
                    <details>
                      <summary>{t("Что изменилось", "View changes")}</summary>
                      <pre>{JSON.stringify(item.details, null, 2)}</pre>
                    </details>
                  </article>
                ))}
                {!data.items.length && (
                  <p className="admin-empty">
                    {t("Изменений пока нет.", "No changes yet.")}
                  </p>
                )}
              </div>
            )}
            {data.items && (
              <div className="admin-pagination">
                <span>
                  {t("Всего", "Total")}: {data.total}
                </span>
                <button
                  className="button white"
                  disabled={page === 0}
                  onClick={() => setPage((v) => v - 1)}
                  aria-label={t("Предыдущая страница", "Previous page")}
                >
                  <ArrowLeft size={16} />
                </button>
                <span>{page + 1}</span>
                <button
                  className="button white"
                  disabled={(page + 1) * data.limit >= data.total}
                  onClick={() => setPage((v) => v + 1)}
                  aria-label={t("Следующая страница", "Next page")}
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        )
      )}
      {editing && (
        <Modal
          label={t("Изменение настроек", "Edit settings")}
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form className="admin-editor" onSubmit={save}>
            <span className="eyebrow">
              {t("ИЗМЕНЕНИЕ С ЗАПИСЬЮ В ЖУРНАЛ", "AUDITED CHANGE")}
            </span>
            <h2>{editing.label}</h2>
            {editing.kind === "user" ? (
              <>
                <label>
                  {t("Роль", "Role")}
                  <select
                    aria-label={t("Роль", "Role")}
                    value={editing.data.role}
                    disabled={editing.id === account.id}
                    onChange={(e) => patch("role", e.target.value)}
                  >
                    <option value="member">{t("Участник", "Member")}</option>
                    <option value="admin">
                      {t("Администратор", "Administrator")}
                    </option>
                  </select>
                </label>
                <label>
                  {t("Статус", "Status")}
                  <select
                    aria-label={t("Статус", "Status")}
                    value={editing.data.status}
                    disabled={editing.id === account.id}
                    onChange={(e) => patch("status", e.target.value)}
                  >
                    <option value="active">{t("Активен", "Active")}</option>
                    <option value="blocked">
                      {t("Заблокирован", "Blocked")}
                    </option>
                  </select>
                </label>
                <p className="admin-help">
                  {t(
                    "Блокировка завершает входы пользователя. Его данные сохраняются. Администратор получает доступ к этому кабинету.",
                    "Blocking signs the user out while preserving their data. Administrators gain access to this workspace.",
                  )}
                </p>
              </>
            ) : editing.kind === "arena" ? (
              <>
                {pairInputs("title", ["Название", "Name"])}
                {pairInputs("description", ["Описание", "Description"], true)}
                <div className="form-grid">
                  <label>
                    {t("Время питча, секунд", "Pitch time, seconds")}
                    <input
                      type="number"
                      min={30}
                      max={600}
                      required
                      value={editing.data.pitchSeconds}
                      onChange={(e) =>
                        patch("pitchSeconds", Number(e.target.value))
                      }
                    />
                  </label>
                  <label>
                    {t("Уровень сложности", "Difficulty level")}
                    <input
                      type="number"
                      min={1}
                      max={5}
                      required
                      value={editing.data.level}
                      onChange={(e) => patch("level", Number(e.target.value))}
                    />
                  </label>
                </div>
              </>
            ) : (
              <>
                {pairInputs("name", ["Имя", "Name"])}
                <label>
                  {t("Роль и организация", "Role and organization")}
                  <input
                    required
                    maxLength={120}
                    value={editing.data.role}
                    onChange={(e) => patch("role", e.target.value)}
                  />
                </label>
                {pairInputs(
                  "focus",
                  ["Фокус вопросов", "Question focus"],
                  true,
                )}
                <label>
                  {t("Источник профиля (HTTPS)", "Profile source (HTTPS)")}
                  <input
                    type="url"
                    value={editing.data.source}
                    onChange={(e) => patch("source", e.target.value)}
                  />
                </label>
              </>
            )}
            {editing.kind !== "user" && (
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={editing.data.enabled}
                  disabled={editing.kind === "arena" && editing.id === "family"}
                  onChange={(e) => patch("enabled", e.target.checked)}
                />
                {editing.kind === "arena"
                  ? t(
                      "Доступна для новых питчей",
                      "Available for new practices",
                    )
                  : t(
                      "Показывать в каталоге инвесторов",
                      "Show in the investor directory",
                    )}
              </label>
            )}
            <label>
              {t("Причина изменения", "Reason for change")}
              <textarea
                rows={2}
                required
                minLength={3}
                maxLength={300}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="button white"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                <X size={15} />
                {t("Отмена", "Cancel")}
              </button>
              <button className="button dark" disabled={busy}>
                <Save size={15} />
                {busy
                  ? t("Сохраняем…", "Saving…")
                  : t("Сохранить изменения", "Save changes")}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
