import React, { useState } from "react";
import { api, errorText } from "../services/api";
import { LogIn, Cloud, Plus, LogOut } from "lucide-react";
import { EmailVerification, PasswordResetRequest } from "./AccountSecurity";
export default function AccountPanel({
  account,
  mailReady = false,
  projects,
  localHistory,
  t,
  Modal,
  onClose,
  onRefresh,
  onProject,
  onProfile,
  onWorkspace,
  registerFirst = false,
}) {
  const [register, setRegister] = useState(registerFirst),
    [forgot, setForgot] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [project, setProject] = useState(""),
    [imported, setImported] = useState(null);
  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errorText(e, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      onClose={onClose}
      label={t("Аккаунт и проекты", "Account & projects")}
    >
      <div className="modal-eyebrow">
        <Cloud size={17} />
        {t("ТВОЙ ПРОГРЕСС С ТОБОЙ", "KEEP YOUR PROGRESS")}
      </div>
      <h2>
        {account
          ? t("Мой аккаунт", "My account")
          : forgot
            ? t("Восстановить доступ", "Recover your account")
            : register
              ? t("Создать аккаунт", "Create account")
              : t("Войти в игру", "Sign in")}
      </h2>
      {account ? (
        <>
          <p className="modal-subtitle">{account.email}</p>
          <div className="community-actions">
            {onProfile && (
              <button className="button white" onClick={onProfile}>
                {t("Редактировать профиль", "Edit profile")}
              </button>
            )}
            {onWorkspace && (
              <button className="button white" onClick={onWorkspace}>
                {t("Стартапы и команды", "Startups & teams")}
              </button>
            )}
          </div>
          <EmailVerification {...{ account, mailReady, t, onRefresh }} />
          <h3>{t("Проекты тренировок", "Practice projects")}</h3>
          <p className="modal-subtitle">
            {t(
              "Приватные проекты для питчей и истории. Карточки для каталога и команда находятся в разделе «Стартапы и команды».",
              "Private projects for pitches and history. Manage directory listings and your team in Startups & teams.",
            )}
          </p>
          <div className="account-projects">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onProject(p);
                  onClose();
                }}
              >
                <strong>{p.name}</strong>
                <small>{p.industry || t("Стартап", "Startup")}</small>
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const p = await api("/projects", {
                  method: "POST",
                  data: { name: project },
                });
                setProject("");
                await onRefresh();
                onProject(p);
              });
            }}
          >
            <label>
              {t("Новый проект", "New project")}
              <input
                required
                maxLength={60}
                value={project}
                onChange={(e) => setProject(e.target.value)}
              />
            </label>
            <button className="button white" disabled={busy}>
              <Plus size={16} />
              {t("Создать проект", "Create project")}
            </button>
          </form>
          {localHistory.length > 0 && (
            <section className="import-history">
              <p>
                {t(
                  `В этом браузере есть ${localHistory.length} прежних тренировок. Можно отдельно перенести их в аккаунт.`,
                  `This browser has ${localHistory.length} previous practices. You can import them into this account.`,
                )}
              </p>
              <button
                className="button white"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const r = await api("/history/import", {
                      method: "POST",
                      data: { records: localHistory.slice(0, 200) },
                    });
                    setImported(r.count);
                    await onRefresh();
                  })
                }
              >
                {t("Перенести историю", "Import history")}
              </button>
              {imported !== null && (
                <small>
                  {t(
                    `Добавлено: ${imported}. Повторный импорт не создаёт копий.`,
                    `Imported: ${imported}. Reimporting will not create duplicates.`,
                  )}
                </small>
              )}
            </section>
          )}
          <button
            className="account-logout"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await api("/auth/logout", { method: "POST", data: {} });
                await onRefresh();
                onClose();
              })
            }
          >
            <LogOut size={16} />
            {t("Выйти из аккаунта", "Sign out")}
          </button>
        </>
      ) : forgot ? (
        <PasswordResetRequest
          {...{ t, mailReady }}
          initialEmail={email}
          onBack={() => {
            setForgot(false);
            setError("");
          }}
        />
      ) : (
        <>
          <p className="modal-subtitle">
            {t(
              "Сохраняй проекты, презентации и тренировки на сервере. Гостевой режим остаётся доступен.",
              "Save projects, decks and practices on the server. Guest mode remains available.",
            )}
          </p>
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await api(`/auth/${register ? "register" : "login"}`, {
                  method: "POST",
                  data: {
                    email,
                    password,
                    language: t("ru", "en"),
                    ...(register ? { name } : {}),
                  },
                });
                setPassword("");
                await onRefresh();
              });
            }}
          >
            {register && (
              <label>
                {t("Имя", "Name")}
                <input
                  required
                  maxLength={60}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            <label>
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              {t(
                "Пароль · от 12 символов",
                "Password · at least 12 characters",
              )}
              <input
                required
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete={register ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="button dark full" disabled={busy}>
              <LogIn size={16} />
              {busy
                ? t("Подождите…", "Please wait…")
                : register
                  ? t("Зарегистрироваться", "Create account")
                  : t("Войти", "Sign in")}
            </button>
          </form>
          {!register && (
            <button
              className="ready-text-button"
              onClick={() => {
                setForgot(true);
                setPassword("");
                setError("");
              }}
            >
              {t("Забыли пароль?", "Forgot password?")}
            </button>
          )}
          <button
            className="ready-text-button"
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register
              ? t("Уже есть аккаунт", "Already have an account")
              : t("Создать новый аккаунт", "Create a new account")}
          </button>
        </>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
