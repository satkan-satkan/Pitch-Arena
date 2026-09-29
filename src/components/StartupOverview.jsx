import React, { useState } from "react";
import { Share2, ArrowUpRight, ChevronRight } from "lucide-react";
import { Avatar } from "./ImagePicker";
import "./startup-overview.css";

export default function StartupOverview({ data, t, preview = false }) {
  const [message, setMessage] = useState(""),
    [manual, setManual] = useState("");
  const money = (value) =>
    value == null
      ? "—"
      : new Intl.NumberFormat(t("ru-RU", "en-US"), {
          style: "currency",
          currency: data.currency,
          maximumFractionDigits: 0,
        }).format(value);
  const share = async () => {
    const url = new URL(`/startups/${data.id}`, window.location.origin).href;
    setMessage("");
    setManual("");
    try {
      if (navigator.share) await navigator.share({ title: data.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setMessage(t("Ссылка скопирована", "Link copied"));
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        setManual(url);
        setMessage(t("Скопируй ссылку ниже.", "Copy the link below."));
      }
    }
  };
  return (
    <section className="startup-overview">
      {!preview && (
        <nav
          className="startup-breadcrumbs"
          aria-label={t("Навигация по каталогу", "Directory navigation")}
        >
          <a href="/">Pitch Arena</a>
          <ChevronRight size={15} />
          <a href="/startups">{t("Стартапы", "Startups")}</a>
          <ChevronRight size={15} />
          <span>{data.name}</span>
        </nav>
      )}
      <header className="startup-identity">
        <Avatar
          src={data.logo}
          name={data.name}
          className="startup-brand-image"
        />
        <div className="startup-intro">
          <div className="startup-title-row">
            {preview ? <h3>{data.name}</h3> : <h1>{data.name}</h1>}
            {!preview && (
              <div className="startup-share-actions">
                <button type="button" className="button white" onClick={share}>
                  <Share2 size={18} />
                  {t("Поделиться", "Share")}
                </button>
                {data.links?.website && (
                  <a
                    className="button dark"
                    href={data.links.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("Открыть сайт", "Visit")}
                    <ArrowUpRight size={18} />
                  </a>
                )}
              </div>
            )}
          </div>
          <p>{data.tagline}</p>
          <div className="startup-share-status" role="status">
            {message}
          </div>
          {manual && (
            <input
              aria-label={t("Ссылка на стартап", "Startup link")}
              value={manual}
              readOnly
              onFocus={(e) => e.target.select()}
            />
          )}
        </div>
      </header>
      <div className="startup-key-metrics">
        <section>
          <h3>{t("Выручка за всё время", "All-time revenue")}</h3>
          <strong>{money(data.totalRevenue)}</strong>
          <p>
            {data.totalRevenue == null
              ? t("Не раскрыта", "Undisclosed")
              : t("Со слов основателя", "Founder reported")}
          </p>
        </section>
        <section>
          <h3>
            <abbr
              title={t(
                "Ежемесячный повторяющийся доход от подписок",
                "Monthly recurring revenue from subscriptions",
              )}
            >
              MRR
            </abbr>
          </h3>
          <strong>{money(data.monthlyRecurringRevenue)}</strong>
          <p>
            {data.monthlyRecurringRevenue == null
              ? t("Данные не указаны", "Not provided")
              : t(
                  "Доход от подписок · со слов основателя",
                  "Subscriptions · founder reported",
                )}
          </p>
        </section>
        <section>
          <h3>{t("Основатель", "Founder")}</h3>
          <div className="startup-founder">
            <Avatar src={data.founderAvatar} name={data.founderName || ""} />
            <strong title={data.founderName}>{data.founderName || "—"}</strong>
          </div>
          <p>
            {data.founderName
              ? t("Указан командой", "Listed by the team")
              : t("Не указан", "Not provided")}
          </p>
        </section>
        <section>
          <h3>{t("Дата основания", "Founded")}</h3>
          <strong>
            {data.foundedMonth
              ? new Date(
                  `${data.foundedMonth}-01T12:00:00Z`,
                ).toLocaleDateString(t("ru-RU", "en-US"), {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })
              : "—"}
          </strong>
          <p>{data.region || t("Регион не указан", "Region not provided")}</p>
        </section>
      </div>
    </section>
  );
}
