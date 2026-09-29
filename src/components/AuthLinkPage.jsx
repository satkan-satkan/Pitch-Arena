import React, { useEffect, useState } from "react";
import { api, errorText } from "../services/api";
import "./account-security.css";

export default function AuthLinkPage({
  mode,
  account,
  checking,
  t,
  lang,
  setLang,
  Brand,
  onLogin,
  onRefresh,
  onContinue,
}) {
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get("token") || "",
  );
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  const verify = mode === "verify-email";
  useEffect(() => {
    // Keep the bearer token only in component memory, never storage/history.
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname,
    );
  }, []);
  const valid = /^[a-f0-9]{64}$/.test(token);
  return (
    <main className="auth-link-page">
      <header>
        <a href="/" aria-label="Pitch Arena">
          <Brand />
        </a>
        <button
          className="button white"
          aria-label={
            lang === "ru" ? "Switch to English" : "Переключить на русский"
          }
          onClick={() => setLang(lang === "ru" ? "en" : "ru")}
        >
          {lang.toUpperCase()}
        </button>
      </header>
      <section className="auth-link-card">
        <span className="eyebrow">PITCH ARENA / ACCOUNT</span>
        <h1>
          {done
            ? t("Готово", "All set")
            : verify
              ? t("Подтверждение почты", "Confirm your email")
              : t("Новый пароль", "New password")}
        </h1>
        {done ? (
          <>
            <p role="status">
              {verify
                ? t(
                    "Адрес подтверждён. Теперь доступны приглашения в команды.",
                    "Email verified. Team invitations are now available.",
                  )
                : t(
                    "Пароль обновлён. Старые сеансы закрыты. Войди с новым паролем.",
                    "Password updated. Previous sessions are closed. Sign in with your new password.",
                  )}
            </p>
            <button
              className="button dark"
              onClick={verify ? onContinue : onLogin}
            >
              {verify ? t("Продолжить", "Continue") : t("Войти", "Sign in")}
            </button>
          </>
        ) : !valid ? (
          <>
            <p role="alert">
              {t(
                "В этой странице нет действующей ссылки. Открой письмо заново или запроси новое.",
                "This page has no valid link. Reopen your email or request a new one.",
              )}
            </p>
            <button className="button white" onClick={onLogin}>
              {t("Перейти ко входу", "Go to sign in")}
            </button>
          </>
        ) : checking ? (
          <p>{t("Проверяем вход…", "Checking sign-in…")}</p>
        ) : verify && !account ? (
          <>
            <p>
              {t(
                "Сначала войди в тот аккаунт, для которого пришло письмо. Подтверждай адрес только если ты сам создавал аккаунт.",
                "First sign in to the account this email was sent for. Confirm only if you created the account yourself.",
              )}
            </p>
            <button className="button dark" onClick={onLogin}>
              {t("Войти", "Sign in")}
            </button>
          </>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              if (!verify && password !== confirm) {
                setError(t("Пароли не совпадают.", "Passwords do not match."));
                return;
              }
              setBusy(true);
              try {
                await api(`/auth/${mode}`, {
                  method: "POST",
                  data: { token, ...(!verify ? { password } : {}) },
                });
                setPassword("");
                setConfirm("");
                setDone(true);
                await onRefresh();
              } catch (e) {
                setError(errorText(e, t));
              } finally {
                setBusy(false);
              }
            }}
          >
            {verify ? (
              <p>
                {t(
                  `Подтвердить адрес аккаунта ${account.email}?`,
                  `Confirm the email for ${account.email}?`,
                )}
              </p>
            ) : (
              <>
                <p>
                  {t(
                    "После сохранения все устройства выйдут из аккаунта. Проекты и тренировки останутся.",
                    "Saving signs out all devices. Projects and practice remain saved.",
                  )}
                </p>
                <label>
                  {t(
                    "Новый пароль · от 12 символов",
                    "New password · at least 12 characters",
                  )}
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <label>
                  {t("Повтори новый пароль", "Confirm new password")}
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </label>
              </>
            )}
            <button className="button dark" disabled={busy}>
              {busy
                ? t("Сохраняем…", "Saving…")
                : verify
                  ? t("Подтвердить адрес", "Confirm email")
                  : t("Сохранить новый пароль", "Save new password")}
            </button>
          </form>
        )}
        {error && (
          <>
            <p role="alert" className="error-message">
              {error}
            </p>
            <button className="ready-text-button" onClick={onLogin}>
              {t(
                "Открыть аккаунт / запросить новую ссылку",
                "Open account / request a new link",
              )}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
