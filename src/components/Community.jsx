import React, { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Plus,
  Users,
  Globe2,
  Rocket,
  Check,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { api, errorText } from "../services/api";
import "./community.css";
export const socialNames = {
  website: "Website",
  telegram: "Telegram",
  x: "X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  youtube: "YouTube",
  github: "GitHub",
};
const categories = {
  ai: ["ИИ", "AI"],
  saas: ["SaaS", "SaaS"],
  fintech: ["Финтех", "Fintech"],
  health: ["Здоровье", "Health"],
  climate: ["Климат", "Climate"],
  education: ["Образование", "Education"],
  other: ["Другое", "Other"],
};
const stages = {
  idea: ["Идея", "Idea"],
  building: ["В разработке", "Building"],
  live: ["Работает", "Live"],
};
const statuses = {
  draft: ["Черновик", "Draft"],
  pending: ["На проверке", "In review"],
  published: ["Опубликован", "Published"],
  changes_requested: ["Нужны изменения", "Changes requested"],
};
const blankLinks = () =>
  Object.fromEntries(Object.keys(socialNames).map((k) => [k, ""]));
const emptyListing = () => ({
  name: "",
  tagline: "",
  description: "",
  category: "saas",
  stage: "building",
  region: "",
  links: blankLinks(),
  monthlyRevenue: null,
  currency: "USD",
});
export function SocialLinks({ links }) {
  return (
    <div className="social-links">
      {Object.entries(links || {})
        .filter(([, url]) => url)
        .map(([key, url]) => (
          <a key={key} href={url} target="_blank" rel="noopener noreferrer">
            {socialNames[key]}
            <ArrowUpRight size={13} />
          </a>
        ))}
    </div>
  );
}
function LinkFields({ value, onChange, t }) {
  return (
    <fieldset className="community-links">
      <legend>{t("Сайт и социальные сети", "Website & social links")}</legend>
      <p>
        {t(
          "Необязательно. Полные ссылки, начинающиеся с https://",
          "Optional. Full links starting with https://",
        )}
      </p>
      <div className="community-form-grid">
        {Object.keys(socialNames).map((k) => (
          <label key={k}>
            {socialNames[k]}
            <input
              type="url"
              pattern="https://.*"
              maxLength={2000}
              value={value[k] || ""}
              placeholder="https://"
              onChange={(e) => onChange({ ...value, [k]: e.target.value })}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
function Revenue({ data, t }) {
  return data.monthlyRevenue !== null && data.monthlyRevenue !== undefined ? (
    <div className="startup-revenue">
      <strong>
        {new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
          data.monthlyRevenue,
        )}{" "}
        {data.currency}
      </strong>
      <span>
        {t(
          "Выручка / месяц · со слов основателя",
          "Revenue / month · founder reported",
        )}
      </span>
    </div>
  ) : null;
}
function ListingContent({ data, t }) {
  return (
    <>
      <div className="community-tags">
        <span>{t(...categories[data.category])}</span>
        <span>{t(...stages[data.stage])}</span>
        {data.region && <span>{data.region}</span>}
      </div>
      <h2>{data.name}</h2>
      <p className="startup-tagline">{data.tagline}</p>
      <p className="startup-description">{data.description}</p>
      <Revenue data={data} t={t} />
      <SocialLinks links={data.links} />
    </>
  );
}
export function PublicDirectory({
  t,
  onJoin,
  detailId = null,
  onOpen,
  onBack,
}) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [page, setPage] = useState(0),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    api(
      detailId
        ? `/startups/${encodeURIComponent(detailId)}`
        : `/startups?q=${encodeURIComponent(search)}&category=${category}&page=${page}`,
    )
      .then((r) => active && setData(r))
      .catch((e) => active && setError(errorText(e, t)));
    return () => {
      active = false;
    };
  }, [detailId, search, category, page, refresh]);
  return (
    <section className="community-page public-directory">
      <div className="community-heading">
        <div>
          <span className="eyebrow">
            <Globe2 size={15} />
            {t("СОЗДАНО ОСНОВАТЕЛЯМИ", "BUILT BY FOUNDERS")}
          </span>
          <h1>
            {detailId
              ? t("История стартапа", "Startup story")
              : t("Идеи становятся бизнесом.", "Ideas become businesses.")}
          </h1>
          <p>
            {t(
              "Открывай проекты, знакомься с продуктами и расскажи о своём.",
              "Discover products, explore businesses and share what you are building.",
            )}
          </p>
        </div>
        <button className="button dark" onClick={onJoin}>
          <Plus size={16} />
          {t("Добавить стартап", "Add a startup")}
        </button>
      </div>
      {detailId ? (
        <button className="ready-text-button" onClick={onBack}>
          <ArrowLeft size={15} />
          {t("Все стартапы", "All startups")}
        </button>
      ) : (
        <form
          className="community-filters"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(query);
            setPage(0);
          }}
        >
          <input
            aria-label={t("Найти стартап", "Find a startup")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Название или идея…", "Name or idea…")}
          />
          <select
            aria-label={t("Категория", "Category")}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
          >
            <option value="">{t("Все категории", "All categories")}</option>
            {Object.entries(categories).map(([k, v]) => (
              <option key={k} value={k}>
                {t(...v)}
              </option>
            ))}
          </select>
          <button className="button white">{t("Найти", "Search")}</button>
        </form>
      )}
      {error ? (
        <div className="community-empty">
          <p role="alert">{error}</p>
          <button
            className="button white"
            onClick={() => setRefresh((v) => v + 1)}
          >
            {t("Повторить", "Retry")}
          </button>
        </div>
      ) : !data ? (
        <p role="status">{t("Загружаем…", "Loading…")}</p>
      ) : detailId ? (
        <article className="startup-detail">
          <ListingContent data={data} t={t} />
          <small>
            {t(
              "Карточка прошла модерацию содержания. Финансовые показатели не подтверждены платформой.",
              "The listing passed content moderation. Financial figures are not verified by the platform.",
            )}
          </small>
        </article>
      ) : (
        <>
          <p className="community-caption">
            {t(
              `Опубликовано: ${data.total}. Сначала новые.`,
              `Published: ${data.total}. Newest first.`,
            )}
          </p>
          {data.items.length === 0 ? (
            <div className="community-empty">
              <Rocket size={34} />
              <h2>
                {search || category
                  ? t("Пока ничего не найдено", "No matches yet")
                  : t(
                      "Здесь начинается история первых команд",
                      "The first founder stories start here",
                    )}
              </h2>
              <p>
                {t(
                  "Опубликованные после проверки карточки появятся здесь. Добавь свой стартап — от идеи до действующего бизнеса.",
                  "Listings appear here after review. Add your startup, from an early idea to an operating business.",
                )}
              </p>
              <button className="button dark" onClick={onJoin}>
                {t("Рассказать о проекте", "Share your startup")}
              </button>
            </div>
          ) : (
            <div className="startup-grid">
              {data.items.map((s) => (
                <article className="startup-card" key={s.id}>
                  <div className="startup-card-top">
                    <span className="startup-monogram">
                      {s.name.slice(0, 1)}
                    </span>
                    <span className="community-badge">
                      {t(...stages[s.stage])}
                    </span>
                  </div>
                  <h2>
                    <a
                      href={`/startups/${s.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onOpen(s.id);
                      }}
                    >
                      {s.name}
                      <ArrowUpRight size={18} />
                    </a>
                  </h2>
                  <p>{s.tagline}</p>
                  <div className="community-tags">
                    <span>{t(...categories[s.category])}</span>
                    {s.region && <span>{s.region}</span>}
                  </div>
                  <Revenue data={s} t={t} />
                  <SocialLinks links={s.links} />
                </article>
              ))}
            </div>
          )}
          {data.total > 24 && (
            <div className="community-pagination">
              <button
                className="button white"
                disabled={page === 0}
                onClick={() => setPage((v) => v - 1)}
              >
                {t("Назад", "Previous")}
              </button>
              <span>{page + 1}</span>
              <button
                className="button white"
                disabled={(page + 1) * 24 >= data.total}
                onClick={() => setPage((v) => v + 1)}
              >
                {t("Далее", "Next")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
function StartupEditor({ item, teams, t, Modal, onClose, onSave }) {
  const [data, setData] = useState(item?.data || emptyListing),
    [teamId, setTeamId] = useState(item?.teamId || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const field = (key, value) => setData((d) => ({ ...d, [key]: value }));
  return (
    <Modal
      wide
      label={t("Карточка стартапа", "Startup listing")}
      onClose={onClose}
    >
      <span className="eyebrow">
        {t("РАССКАЖИ О СВОЁМ ПРОДУКТЕ", "TELL YOUR PRODUCT STORY")}
      </span>
      <h2>
        {item
          ? t("Редактировать карточку", "Edit listing")
          : t("Новый стартап", "New startup")}
      </h2>
      <p>
        {t(
          "Материалы тренировок остаются приватными. В каталог попадёт только эта карточка после проверки.",
          "Practice materials stay private. Only this listing appears in the directory after review.",
        )}
      </p>
      <form
        className="community-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api(
              item ? `/workspace/startups/${item.id}` : "/workspace/startups",
              {
                method: item ? "PUT" : "POST",
                data: item
                  ? { revision: item.revision, data }
                  : { teamId: teamId || null, data },
              },
            );
            await onSave();
            onClose();
          } catch (e) {
            setError(errorText(e, t));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          {t("Название стартапа", "Startup name")}
          <input
            required
            minLength={2}
            maxLength={80}
            value={data.name}
            onChange={(e) => field("name", e.target.value)}
          />
        </label>
        <label>
          {t("Продукт одним предложением", "Product in one sentence")}
          <input
            required
            minLength={10}
            maxLength={160}
            value={data.tagline}
            onChange={(e) => field("tagline", e.target.value)}
          />
        </label>
        <label>
          {t("Описание продукта", "Product description")}
          <textarea
            required
            rows={4}
            minLength={20}
            maxLength={3000}
            value={data.description}
            onChange={(e) => field("description", e.target.value)}
          />
        </label>
        <div className="community-form-grid">
          <label>
            {t("Категория", "Category")}
            <select
              value={data.category}
              aria-label={t("Категория", "Category")}
              onChange={(e) => field("category", e.target.value)}
            >
              {Object.entries(categories).map(([k, v]) => (
                <option key={k} value={k}>
                  {t(...v)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("Стадия", "Stage")}
            <select
              value={data.stage}
              aria-label={t("Стадия", "Stage")}
              onChange={(e) => field("stage", e.target.value)}
            >
              {Object.entries(stages).map(([k, v]) => (
                <option key={k} value={k}>
                  {t(...v)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("Город или регион", "City or region")}
            <input
              maxLength={80}
              value={data.region}
              onChange={(e) => field("region", e.target.value)}
            />
          </label>
          <label>
            {t("Владелец карточки", "Listing owner")}
            <select
              disabled={!!item}
              aria-label={t("Владелец карточки", "Listing owner")}
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
            >
              <option value="">{t("Мой аккаунт", "My account")}</option>
              {teams
                .filter((v) => v.role !== "member")
                .map((v) => (
                  <option value={v.id} key={v.id}>
                    {v.data.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <LinkFields
          value={data.links}
          onChange={(links) => field("links", links)}
          t={t}
        />
        <fieldset className="community-links">
          <legend>
            {t("Показатели · необязательно", "Metrics · optional")}
          </legend>
          <p>
            {t(
              "Укажи месячную выручку, если хочешь сделать её публичной. Она будет отмечена «со слов основателя». Пустое поле скроет показатель.",
              "Share monthly revenue if you want it public. It will be labelled founder reported. Leave blank to hide it.",
            )}
          </p>
          <div className="community-form-grid">
            <label>
              {t("Выручка за месяц", "Monthly revenue")}
              <input
                type="number"
                min="0"
                max="1000000000000"
                step="0.01"
                value={data.monthlyRevenue ?? ""}
                onChange={(e) =>
                  field(
                    "monthlyRevenue",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            </label>
            <label>
              {t("Валюта", "Currency")}
              <select
                value={data.currency}
                aria-label={t("Валюта", "Currency")}
                onChange={(e) => field("currency", e.target.value)}
              >
                {["USD", "KZT", "RUB", "EUR"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
        {item?.published && (
          <p>
            {t(
              "До одобрения изменений в каталоге останется предыдущая версия.",
              "The previous approved version stays public until the update is approved.",
            )}
          </p>
        )}
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        <button className="button dark" disabled={busy}>
          {busy
            ? t("Сохраняем…", "Saving…")
            : t("Сохранить черновик", "Save draft")}
        </button>
      </form>
    </Modal>
  );
}
function TeamEditor({ team, t, Modal, onSave, onClose }) {
  const [data, setData] = useState(
      team?.data || { name: "", description: "", links: blankLinks() },
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal wide label={t("Команда", "Team")} onClose={onClose}>
      <h2>
        {team
          ? t("Настройки команды", "Team settings")
          : t("Собери свою команду", "Build your team")}
      </h2>
      <form
        className="community-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api(
              team ? `/workspace/teams/${team.id}` : "/workspace/teams",
              {
                method: team ? "PUT" : "POST",
                data: team ? { revision: team.revision, data } : data,
              },
            );
            await onSave();
            onClose();
          } catch (e) {
            setError(errorText(e, t));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          {t("Название команды", "Team name")}
          <input
            required
            minLength={2}
            maxLength={80}
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
          />
        </label>
        <label>
          {t("О команде", "About the team")}
          <textarea
            maxLength={600}
            rows={3}
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
          />
        </label>
        <LinkFields
          value={data.links}
          onChange={(links) => setData({ ...data, links })}
          t={t}
        />
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        <button className="button dark" disabled={busy}>
          {t("Сохранить команду", "Save team")}
        </button>
      </form>
    </Modal>
  );
}
const roleName = (role, t) =>
  t(
    ...{
      owner: ["Владелец", "Owner"],
      editor: ["Редактор", "Editor"],
      member: ["Участник", "Member"],
    }[role],
  );
export function FounderWorkspace({ account, t, Modal, onSignIn, onPublic }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(null),
    [teamEdit, setTeamEdit] = useState(null),
    [notice, setNotice] = useState("");
  const refresh = async () => {
    const [s, teams, invites] = await Promise.all([
      api("/workspace/startups"),
      api("/workspace/teams"),
      api("/workspace/invitations"),
    ]);
    setData({ items: s.items, teams: teams.teams, invites: invites.items });
  };
  useEffect(() => {
    setData(null);
    setError("");
    if (!account) return;
    let active = true;
    Promise.all([
      api("/workspace/startups"),
      api("/workspace/teams"),
      api("/workspace/invitations"),
    ])
      .then(
        ([s, t, i]) =>
          active &&
          setData({ items: s.items, teams: t.teams, invites: i.items }),
      )
      .catch((e) => active && setError(errorText(e, t)));
    return () => {
      active = false;
    };
  }, [account?.id]);
  const act = async (path, method = "POST", data = {}) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(path, { method, data });
      await refresh();
      setNotice(t("Готово. Изменения сохранены.", "Done. Changes saved."));
      return true;
    } catch (e) {
      setError(errorText(e, t));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="community-page">
      <div className="community-heading">
        <div>
          <span className="eyebrow">
            <Users size={15} />
            {t("СТРОИМ ВМЕСТЕ", "BUILD TOGETHER")}
          </span>
          <h1>{t("Стартапы и команды", "Startups & teams")}</h1>
          <p>
            {t(
              "Преврати идею в историю, которую увидят другие.",
              "Turn your idea into a story others can discover.",
            )}
          </p>
        </div>
        <button className="button white" onClick={onPublic}>
          <Globe2 size={16} />
          {t("Открыть каталог", "Explore directory")}
        </button>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      {!account ? (
        <div className="community-empty">
          <Rocket size={36} />
          <h2>
            {t(
              "Твой следующий шаг — свой стартап",
              "Your next step: your own startup",
            )}
          </h2>
          <p>
            {t(
              "Войди, чтобы создать карточку, пригласить команду и отправить проект на публикацию.",
              "Sign in to create a listing, invite your team and submit your startup for publication.",
            )}
          </p>
          <button className="button dark" onClick={onSignIn}>
            {t("Создать аккаунт или войти", "Create account or sign in")}
          </button>
        </div>
      ) : !data ? (
        <div className="community-empty">
          <p>
            {error
              ? t(
                  "Не удалось загрузить данные",
                  "Could not load your workspace",
                )
              : t("Загружаем…", "Loading…")}
          </p>
          {error && (
            <button
              className="button white"
              onClick={() => refresh().catch((e) => setError(errorText(e, t)))}
            >
              {t("Повторить", "Retry")}
            </button>
          )}
        </div>
      ) : (
        <>
          {data.invites.length > 0 && (
            <section className="team-inbox">
              <h2>{t("Тебя приглашают", "You are invited")}</h2>
              {data.invites.map((i) => (
                <div key={i.id}>
                  <span>
                    <strong>{i.teamName}</strong> · {roleName(i.role, t)}
                  </span>
                  <button
                    className="button dark"
                    disabled={busy}
                    onClick={() => act(`/workspace/invitations/${i.id}/accept`)}
                  >
                    {t("Принять", "Accept")}
                  </button>
                  <button
                    className="button white"
                    disabled={busy}
                    onClick={() =>
                      act(`/workspace/invitations/${i.id}/decline`)
                    }
                  >
                    {t("Отклонить", "Decline")}
                  </button>
                </div>
              ))}
            </section>
          )}
          <div className="community-section-title">
            <h2>{t("Мои карточки", "My listings")}</h2>
            <button className="button dark" onClick={() => setEditing({})}>
              <Plus size={15} />
              {t("Новый стартап", "New startup")}
            </button>
          </div>
          {!data.items.length ? (
            <div className="community-empty compact">
              <p>
                {t(
                  "Добавь существующий бизнес или идею. Карточка не публикуется автоматически.",
                  "Add an existing business or an idea. Listings are not published automatically.",
                )}
              </p>
            </div>
          ) : (
            <div className="startup-grid">
              {data.items.map((s) => (
                <article className="startup-card" key={s.id}>
                  <div className="community-tags">
                    <span>{t(...statuses[s.status])}</span>
                    {s.published && s.status !== "published" && (
                      <span>
                        {t("Есть публичная версия", "Public version available")}
                      </span>
                    )}
                  </div>
                  <h2>{s.data.name}</h2>
                  <p>{s.data.tagline}</p>
                  <small>
                    {s.teamId
                      ? data.teams.find((v) => v.id === s.teamId)?.data.name
                      : t("Личная карточка", "Personal listing")}
                  </small>
                  {s.moderationNote && (
                    <p className="moderation-note">
                      {t("Комментарий редактора: ", "Review note: ")}
                      {s.moderationNote}
                    </p>
                  )}
                  <div className="community-actions">
                    {s.canEdit && (
                      <>
                        <button
                          className="button white"
                          onClick={() => setEditing(s)}
                        >
                          {t("Редактировать", "Edit")}
                        </button>
                        {["draft", "changes_requested"].includes(s.status) && (
                          <button
                            className="button dark"
                            disabled={busy}
                            onClick={() =>
                              act(
                                `/workspace/startups/${s.id}/submit`,
                                "POST",
                                { revision: s.revision },
                              )
                            }
                          >
                            {t("На проверку", "Submit for review")}
                          </button>
                        )}
                        {(s.published || s.status === "pending") && (
                          <button
                            className="ready-text-button"
                            disabled={busy}
                            onClick={() =>
                              act(
                                `/workspace/startups/${s.id}/withdraw`,
                                "POST",
                                { revision: s.revision },
                              )
                            }
                          >
                            {t(
                              "Снять с публикации / проверки",
                              "Withdraw listing / review",
                            )}
                          </button>
                        )}
                      </>
                    )}
                    {!s.canEdit && (
                      <small>
                        {t(
                          "Участник: просмотр. Для изменений нужна роль редактора.",
                          "Member: read only. Editing requires an editor role.",
                        )}
                      </small>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="community-section-title">
            <div>
              <h2>{t("Мои команды", "My teams")}</h2>
              <p>
                {t(
                  "Общие карточки, участники и социальные сети.",
                  "Shared listings, members and social links.",
                )}
              </p>
            </div>
            <button className="button white" onClick={() => setTeamEdit({})}>
              <Plus size={15} />
              {t("Создать команду", "Create team")}
            </button>
          </div>
          {!data.teams.length && (
            <div className="community-empty compact">
              <p>
                {t(
                  "Собери людей, с которыми создаёшь продукт.",
                  "Bring together the people you are building with.",
                )}
              </p>
            </div>
          )}
          <div className="team-grid">
            {data.teams.map((team) => (
              <article className="team-card" key={team.id}>
                <div className="community-section-title">
                  <h2>{team.data.name}</h2>
                  <span className="community-badge">
                    {roleName(team.role, t)}
                  </span>
                </div>
                <p>{team.data.description}</p>
                <SocialLinks links={team.data.links} />
                <ul className="team-members">
                  {team.members.map((m) => (
                    <li key={m.id}>
                      <span>
                        {m.name} <small>· {roleName(m.role, t)}</small>
                      </span>
                      {team.role === "owner" && m.role !== "owner" && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            act(
                              `/workspace/teams/${team.id}/members/${m.id}`,
                              "DELETE",
                            )
                          }
                        >
                          {t("Убрать", "Remove")}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {team.role === "owner" && (
                  <>
                    <button
                      className="ready-text-button"
                      onClick={() => setTeamEdit(team)}
                    >
                      {t("Настройки команды", "Team settings")}
                    </button>
                    <form
                      className="team-invite"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = e.currentTarget,
                          f = new FormData(form);
                        if (
                          await act(
                            `/workspace/teams/${team.id}/invitations`,
                            "POST",
                            { email: f.get("email"), role: f.get("role") },
                          )
                        )
                          form.reset();
                      }}
                    >
                      <label>
                        {t("Email участника", "Member email")}
                        <input
                          name="email"
                          type="email"
                          required
                          maxLength={254}
                        />
                      </label>
                      <label>
                        {t("Права участника", "Member permissions")}
                        <select
                          name="role"
                          aria-label={t(
                            "Права участника",
                            "Member permissions",
                          )}
                        >
                          <option value="editor">
                            {t("Редактор карточек", "Listing editor")}
                          </option>
                          <option value="member">
                            {t("Только просмотр", "Read only")}
                          </option>
                        </select>
                      </label>
                      <button className="button dark" disabled={busy}>
                        {t("Пригласить", "Invite")}
                      </button>
                      <small>
                        {t(
                          "Приглашение появится в аккаунте с этим email. Письмо не отправляется.",
                          "The invitation appears in the account with this email. No email is sent.",
                        )}
                      </small>
                    </form>
                    {team.invitations.map((i) => (
                      <div className="pending-invite" key={i.id}>
                        <span>
                          {i.email} · {t("ожидает ответа", "pending")}
                        </span>
                        <button
                          disabled={busy}
                          onClick={() =>
                            act(
                              `/workspace/teams/${team.id}/invitations/${i.id}`,
                              "DELETE",
                            )
                          }
                        >
                          {t("Отменить", "Cancel")}
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </article>
            ))}
          </div>
          {editing && (
            <StartupEditor
              item={editing.id ? editing : null}
              teams={data.teams}
              {...{ t, Modal }}
              onSave={refresh}
              onClose={() => setEditing(null)}
            />
          )}
          {teamEdit && (
            <TeamEditor
              team={teamEdit.id ? teamEdit : null}
              {...{ t, Modal }}
              onSave={refresh}
              onClose={() => setTeamEdit(null)}
            />
          )}
        </>
      )}
    </section>
  );
}
export function StartupModeration({ data, t, Modal, onRefresh }) {
  const [item, setItem] = useState(null),
    [action, setAction] = useState("publish"),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <p>
        {t(
          "Сначала карточки на проверке. Одобрение публикует ровно просмотренную версию. Выручка остаётся неподтверждённой.",
          "Pending listings appear first. Approval publishes exactly the reviewed version. Revenue remains unverified.",
        )}
      </p>
      {!data.items.length ? (
        <div className="community-empty">
          <p>{t("Карточек пока нет", "No listings yet")}</p>
        </div>
      ) : (
        <div className="startup-grid">
          {data.items.map((s) => (
            <article className="startup-card" key={s.id}>
              <span className="community-badge">
                {t(...statuses[s.status])}
              </span>
              <h2>{s.data.name}</h2>
              <p>{s.data.tagline}</p>
              <button
                className="button white"
                onClick={() => {
                  setItem(s);
                  setAction(s.status === "pending" ? "publish" : "hide");
                  setReason("");
                  setError("");
                }}
              >
                {t("Посмотреть карточку", "Review listing")}
              </button>
            </article>
          ))}
        </div>
      )}
      {item && (
        <Modal
          wide
          label={t("Проверка стартапа", "Startup review")}
          onClose={() => setItem(null)}
        >
          <ListingContent data={item.data} t={t} />
          {item.status === "pending" || item.published ? (
            <form
              className="community-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await api(`/admin/startups/${item.id}`, {
                    method: "PUT",
                    data: { revision: item.revision, action, reason },
                  });
                  setItem(null);
                  onRefresh();
                } catch (e) {
                  setError(errorText(e, t));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                {t("Решение", "Decision")}
                <select
                  value={action}
                  aria-label={t("Решение", "Decision")}
                  onChange={(e) => setAction(e.target.value)}
                >
                  {item.status === "pending" && (
                    <>
                      <option value="publish">
                        {t("Опубликовать", "Publish")}
                      </option>
                      <option value="reject">
                        {t("Вернуть на доработку", "Request changes")}
                      </option>
                    </>
                  )}
                  {item.published && (
                    <option value="hide">
                      {t("Убрать публичную версию", "Hide public version")}
                    </option>
                  )}
                </select>
              </label>
              <label>
                {t("Комментарий для основателя", "Feedback for founder")}
                <textarea
                  required
                  minLength={3}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              {error && (
                <p role="alert" className="error-message">
                  {error}
                </p>
              )}
              <button className="button dark" disabled={busy}>
                {t("Сохранить решение", "Save decision")}
              </button>
            </form>
          ) : (
            <p>
              {t(
                "Черновик ещё не отправлен на проверку.",
                "This draft has not been submitted for review.",
              )}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
