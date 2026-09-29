import React, { useEffect, useState } from "react";
import { api, errorText } from "../services/api";
import "./account-security.css";

export function PasswordResetRequest({
  t,
  mailReady,
  onBack,
  initialEmail = "",
}) {
  const [email, setEmail] = useState(initialEmail),
    [busy, setBusy] = useState(false),
    [remaining, setRemaining] = useState(0),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(
      () => setRemaining((n) => Math.max(0, n - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [remaining]);
  return (
    <>
      <p className="modal-subtitle">
        {t(
          "Введи адрес аккаунта. Если он зарегистрирован и доступен, на него придёт ссылка для сброса пароля.",
          "Enter your account email. If it is registered and active, it will receive a password reset link.",
        )}
      </p>
      {!mailReady && (
        <p role="status">
          {t(
            "Отправка писем пока не настроена. Сброс пароля станет доступен после подключения почты.",
            "Email delivery is not configured yet. Password reset will be available once it is connected.",
          )}
        </p>
      )}
      <form
        className="auth-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setMessage("");
          try {
            const result = await api("/auth/forgot-password", {
              method: "POST",
              data: { email, language: t("ru", "en") },
            });
            setRemaining(result.retryAfter || 60);
            setMessage(true);
          } catch (e) {
            setError(errorText(e, t));
            if (e.message === "RATE_LIMITED") setRemaining(60);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button
          className="button dark full"
          disabled={!mailReady || busy || remaining > 0}
        >
          {remaining
            ? t(`Повторить через ${remaining} с`, `Retry in ${remaining}s`)
            : t("Получить ссылку", "Send reset link")}
        </button>
      </form>
      {message && (
        <p role="status">
          {t(
            "Запрос принят. Если аккаунт существует и доступен, письмо придёт на указанный адрес. Проверь также спам.",
            "Request accepted. If the account exists and is active, an email will arrive at that address. Check spam too.",
          )}
        </p>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <button className="ready-text-button" onClick={onBack}>
        {t("Назад ко входу", "Back to sign in")}
      </button>
    </>
  );
}

export function EmailVerification({ account, mailReady, t, onRefresh }) {
  const [busy, setBusy] = useState(false),
    [remaining, setRemaining] = useState(0),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(
      () => setRemaining((n) => Math.max(0, n - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [remaining]);
  if (account.emailVerified)
    return (
      <p className="email-verified">
        ✓ {t("Почта подтверждена", "Email verified")}
      </p>
    );
  return (
    <section className="email-verification">
      <strong>{t("Подтверди свою почту", "Confirm your email")}</strong>
      <p>
        {t(
          "Тренироваться можно уже сейчас. Приглашения в команды откроются после подтверждения адреса.",
          "You can practice now. Team invitations become available after you confirm your address.",
        )}
      </p>
      {!mailReady && (
        <p role="status">
          {t(
            "Отправка писем пока не настроена. Аккаунт и тренировки продолжают работать.",
            "Email delivery is not configured yet. Your account and practice still work.",
          )}
        </p>
      )}
      <button
        type="button"
        className="button white"
        disabled={!mailReady || busy || remaining > 0}
        onClick={async () => {
          setBusy(true);
          setError("");
          setMessage("");
          try {
            const result = await api("/auth/resend-verification", {
              method: "POST",
              data: { language: t("ru", "en") },
            });
            if (result.verified) {
              await onRefresh?.();
              return;
            }
            setRemaining(result.retryAfter || 60);
            setMessage(true);
          } catch (e) {
            setError(errorText(e, t));
            if (e.message === "RATE_LIMITED") setRemaining(60);
          } finally {
            setBusy(false);
          }
        }}
      >
        {remaining
          ? t(`Повторить через ${remaining} с`, `Retry in ${remaining}s`)
          : busy
            ? t("Отправляем…", "Sending…")
            : t("Отправить письмо подтверждения", "Send verification email")}
      </button>
      {message && (
        <p role="status">
          {t(
            "Запрос принят. Проверь входящие и спам. Если письмо не придёт, повтори отправку через минуту.",
            "Request accepted. Check your inbox and spam. If the email does not arrive, retry in a minute.",
          )}
        </p>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
    </section>
  );
}

export default function AccountSecurity({ account, mailReady, onRefresh, t }) {
  const [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  return (
    <section className="account-security">
      <h2>{t("Доступ к аккаунту", "Account security")}</h2>
      <p>{account.email}</p>
      <EmailVerification {...{ account, mailReady, t, onRefresh }} />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setMessage("");
          if (password !== confirm) {
            setError(
              t("Новые пароли не совпадают.", "New passwords do not match."),
            );
            return;
          }
          setBusy(true);
          try {
            await api("/auth/change-password", {
              method: "POST",
              data: { currentPassword: current, password },
            });
            setCurrent("");
            setPassword("");
            setConfirm("");
            setMessage(true);
            await onRefresh();
          } catch (e) {
            setError(errorText(e, t));
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>{t("Изменить пароль", "Change password")}</h3>
        <label>
          {t("Текущий пароль", "Current password")}
          <input
            type="password"
            autoComplete="current-password"
            required
            minLength={12}
            maxLength={128}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label>
          {t(
            "Новый пароль · от 12 символов",
            "New password · at least 12 characters",
          )}
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label>
          {t("Повтори новый пароль", "Confirm new password")}
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        <button className="button dark" disabled={busy}>
          {t("Сменить пароль", "Update password")}
        </button>
      </form>
      {message && (
        <p role="status">
          {t(
            "Пароль изменён. Все остальные устройства вышли из аккаунта.",
            "Password changed. All other devices are signed out.",
          )}
        </p>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <div className="security-signout">
        <p>
          {t(
            "Завершить все сеансы, включая этот браузер. Сохранённые проекты и тренировки останутся в аккаунте.",
            "End every session, including this browser. Saved projects and practice remain in your account.",
          )}
        </p>
        <button
          type="button"
          className="button white"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            setMessage("");
            try {
              await api("/auth/logout-all", { method: "POST", data: {} });
              await onRefresh();
            } catch (e) {
              setError(errorText(e, t));
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("Выйти на всех устройствах", "Sign out everywhere")}
        </button>
      </div>
    </section>
  );
}
