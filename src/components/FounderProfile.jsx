import React, { useState } from "react";
import { ArrowUpRight, Check, ShieldCheck, UserRound } from "lucide-react";
import ImagePicker, { Avatar } from "./ImagePicker";
import { totalXP } from "../game-data";
import "./founder-profile.css";

export default function FounderProfile({
  profile,
  setProfile,
  t,
  onSave,
  account,
  history,
  onWorkspace,
  onHistory,
}) {
  const normalize = (p) => ({
    ...p,
    name: p.name || "",
    bio: p.bio || "",
    role: p.role || "",
    location: p.location || "",
  });
  const [draft, setDraft] = useState(() => normalize(profile));
  const [saved, setSaved] = useState(() => normalize(profile));
  const [imageBusy, setImageBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const xp = totalXP(history),
    level = Math.floor(xp / 500) + 1;
  const field = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setMessage("");
  };
  return (
    <div className="founder-profile-grid">
      <form
        className="profile-form founder-profile-editor"
        onSubmit={async (e) => {
          e.preventDefault();
          if (saving || imageBusy) return;
          setSaving(true);
          setError("");
          setMessage("");
          try {
            const next = {
              ...draft,
              name: draft.name.trim(),
              role: draft.role.trim(),
              location: draft.location.trim(),
            };
            if (!(await setProfile(next))) throw new Error("save");
            setDraft(next);
            setSaved(next);
            setMessage(t("Изменения сохранены", "Changes saved"));
            onSave();
          } catch {
            setError(
              t(
                "Не удалось сохранить профиль. Изменения остались в форме — попробуй ещё раз.",
                "Could not save your profile. Your edits are still in the form — try again.",
              ),
            );
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="profile-form-top">
          <div className="founder-profile-avatar">
            <Avatar src={draft.avatar} name={draft.name} />
          </div>
          <div>
            <h2>{draft.name || t("Твоё имя", "Your name")}</h2>
            <span>{draft.role || t("Основатель", "Founder")}</span>
          </div>
          <span className="profile-local">
            <ShieldCheck size={14} />
            {account
              ? t("Личный профиль", "Personal profile")
              : t("Гостевой профиль", "Guest profile")}
          </span>
        </div>
        <p className="profile-intro">
          {t(
            "Здесь — информация о тебе. Название продукта, команда и публичная карточка редактируются в разделе «Стартапы и команды».",
            "This is about you. Manage your product, team and public listing in Startups & teams.",
          )}
        </p>
        <fieldset disabled={saving}>
          <ImagePicker
            value={draft.avatar}
            onChange={(v) => field("avatar", v)}
            onBusy={setImageBusy}
            label={t("Аватар профиля", "Profile avatar")}
            name={draft.name}
            t={t}
            round
          />
          <div className="form-grid">
            <label>
              {t("Твоё имя", "Your name")}
              <input
                required
                maxLength={60}
                autoComplete="name"
                value={draft.name}
                onChange={(e) => field("name", e.target.value)}
              />
            </label>
            <label>
              {t("Твоя роль", "Your role")}
              <input
                maxLength={80}
                placeholder={t(
                  "Основатель, разработчик, дизайнер…",
                  "Founder, developer, designer…",
                )}
                value={draft.role}
                onChange={(e) => field("role", e.target.value)}
              />
            </label>
            <label>
              {t("Город и страна", "City and country")}
              <input
                maxLength={80}
                autoComplete="address-level2"
                placeholder={t("Алматы, Казахстан", "Almaty, Kazakhstan")}
                value={draft.location}
                onChange={(e) => field("location", e.target.value)}
              />
            </label>
            <label>
              {t("Индустрия", "Industry")}
              <input
                maxLength={60}
                value={draft.industry || ""}
                placeholder="SaaS & AI"
                onChange={(e) => field("industry", e.target.value)}
              />
            </label>
          </div>
          <label>
            {t("О себе", "About you")}
            <textarea
              aria-label={t("О себе", "About you")}
              rows={4}
              maxLength={1000}
              value={draft.bio}
              placeholder={t(
                "Чем занимаешься, что умеешь и над чем хочешь работать?",
                "What do you do, what are your strengths and what would you like to build?",
              )}
              onChange={(e) => field("bio", e.target.value)}
            />
            <small className="profile-counter">{draft.bio.length} / 1000</small>
          </label>
          {!account && (
            <label>
              {t(
                "Название для гостевых тренировок",
                "Default name for guest practice",
              )}
              <input
                required
                maxLength={60}
                value={draft.startup}
                onChange={(e) => field("startup", e.target.value)}
              />
            </label>
          )}
        </fieldset>
        <p className="profile-privacy">
          <ShieldCheck size={15} />
          {t(
            "Аватар и текст профиля не публикуются в каталоге автоматически. Участники команды видят твоё имя.",
            "Your avatar and bio are not automatically published in the directory. Teammates can see your name.",
          )}
        </p>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="form-footer">
          <span role="status">
            {message ||
              (dirty
                ? t("Есть несохранённые изменения", "Unsaved changes")
                : account
                  ? t("Сохраняется в аккаунте", "Saved to your account")
                  : t("Хранится в этом браузере", "Stored in this browser"))}
          </span>
          <div className="profile-save-actions">
            {dirty && (
              <button
                type="button"
                className="button white"
                disabled={saving || imageBusy}
                onClick={() => {
                  setDraft(saved);
                  setError("");
                  setMessage("");
                }}
              >
                {t("Отменить изменения", "Discard changes")}
              </button>
            )}
            <button
              className="button dark"
              disabled={!dirty || saving || imageBusy}
            >
              {saving
                ? t("Сохраняем…", "Saving…")
                : t("Сохранить профиль", "Save profile")}
              <Check size={17} />
            </button>
          </div>
        </div>
      </form>
      <aside className="founder-profile-summary">
        <span className="eyebrow">
          <UserRound size={15} />
          {t("ТВОЙ ПУТЬ", "YOUR JOURNEY")}
        </span>
        <h2>{t(`Уровень ${level}`, `Level ${level}`)}</h2>
        <div
          className="profile-xp"
          role="progressbar"
          aria-label={t("Прогресс уровня", "Level progress")}
          aria-valuemin={0}
          aria-valuemax={500}
          aria-valuenow={xp % 500}
        >
          <span style={{ width: `${(xp % 500) / 5}%` }} />
        </div>
        <p>
          {t(
            `${500 - (xp % 500)} XP до следующего уровня`,
            `${500 - (xp % 500)} XP to the next level`,
          )}
        </p>
        <dl>
          <div>
            <dt>{t("Завершено питчей", "Completed pitches")}</dt>
            <dd>{history.length}</dd>
          </div>
          <div>
            <dt>{t("Заработано XP", "XP earned")}</dt>
            <dd>{xp}</dd>
          </div>
        </dl>
        <button type="button" className="button white full" onClick={onHistory}>
          {t("Посмотреть тренировки", "View practices")}
          <ArrowUpRight size={16} />
        </button>
        <div className="profile-workspace-link">
          <h3>{t("Что ты создаёшь?", "What are you building?")}</h3>
          <p>
            {t(
              "Добавь свой стартап. Работай самостоятельно или пригласи команду — публикация будет отдельным шагом.",
              "Add your startup. Work solo or invite a team — publishing is a separate step.",
            )}
          </p>
          <button
            type="button"
            className="button dark full"
            onClick={onWorkspace}
          >
            {t("Стартапы и команды", "Startups & teams")}
            <ArrowUpRight size={16} />
          </button>
        </div>
      </aside>
    </div>
  );
}
