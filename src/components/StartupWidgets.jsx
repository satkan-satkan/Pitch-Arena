import React, { useState } from "react";
import { Grip, RotateCcw, Check } from "lucide-react";
import { DraggableWidgetGrid } from "@/components/ui/draggable-widget-grid";
import { useArenaMotion } from "../motion/Motion";
import "./startup-widgets.css";

const definitions = [
  { id: "about", size: "wide" },
  { id: "revenue", size: "sm" },
  { id: "stage", size: "sm" },
  { id: "links", size: "wide" },
  { id: "region", size: "sm" },
  { id: "category", size: "sm" },
];
const ids = definitions.map((i) => i.id);
const readOrder = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) &&
      value.length === ids.length &&
      new Set(value).size === ids.length &&
      value.every((id) => ids.includes(id))
      ? value
      : ids;
  } catch {
    return ids;
  }
};

export default function StartupWidgets({ data, t, category, stage, links }) {
  const storageKey = `pa-startup-layout:v1:${data.id}`;
  const [order, setOrder] = useState(() => readOrder(storageKey));
  const [editing, setEditing] = useState(false);
  const [reset, setReset] = useState(0);
  const [notice, setNotice] = useState("");
  const { enabled } = useArenaMotion();
  const labels = {
    about: t("О продукте", "About the product"),
    revenue: t("Месячная выручка", "Monthly revenue"),
    stage: t("Стадия", "Stage"),
    links: t("Ссылки и соцсети", "Links & social"),
    region: t("Регион", "Region"),
    category: t("Направление", "Category"),
  };
  const items = order.map((id) => ({
    ...definitions.find((v) => v.id === id),
    label: labels[id],
  }));
  const persist = (next) => {
    setOrder(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setNotice(
        t(
          "Расположение сохранено в этом браузере.",
          "Layout saved in this browser.",
        ),
      );
    } catch {
      setNotice(
        t(
          "Расположение изменено. Браузер не разрешил сохранить его.",
          "Layout changed. Browser storage is unavailable.",
        ),
      );
    }
  };
  const content = (id) => {
    if (id === "about")
      return <p className="startup-widget-description">{data.description}</p>;
    if (id === "links")
      return Object.values(data.links || {}).some(Boolean) ? (
        links
      ) : (
        <p>
          {t(
            "Основатель пока не добавил ссылки.",
            "The founder hasn’t added links yet.",
          )}
        </p>
      );
    if (id === "revenue")
      return (
        <>
          <strong className="startup-widget-value">
            {data.monthlyRevenue == null
              ? t("Не раскрыта", "Undisclosed")
              : new Intl.NumberFormat(t("ru-RU", "en-US"), {
                  maximumFractionDigits: 0,
                }).format(data.monthlyRevenue)}
            {data.monthlyRevenue != null && (
              <small>
                {data.currency} / {t("мес.", "mo")}
              </small>
            )}
          </strong>
          <p>
            {t(
              "Со слов основателя. Не подтверждена платформой.",
              "Founder reported. Not verified by the platform.",
            )}
          </p>
        </>
      );
    return (
      <strong className="startup-widget-value">
        {id === "stage"
          ? stage
          : id === "category"
            ? category
            : data.region || t("Не указан", "Not specified")}
      </strong>
    );
  };
  return (
    <section
      className={`startup-widgets ${editing ? "is-editing" : ""}`}
      aria-label={t("Информация о стартапе", "Startup information")}
    >
      <div className="startup-widget-toolbar">
        <p>
          {editing
            ? t(
                "Перетаскивай блоки. На телефоне — удерживай. С клавиатуры — Alt + стрелки.",
                "Drag blocks. On mobile, press and hold. With a keyboard, use Alt + arrows.",
              )
            : t(
                "Расположи информацию так, как удобно тебе. Настройка только для этого браузера.",
                "Arrange the information your way. This layout is only for this browser.",
              )}
        </p>
        <button
          className="button white"
          onClick={() => setEditing((v) => !v)}
          aria-pressed={editing}
        >
          {editing ? <Check size={16} /> : <Grip size={16} />}
          {editing
            ? t("Готово", "Done")
            : t("Переставить блоки", "Arrange blocks")}
        </button>
        {editing && (
          <button
            className="button white"
            onClick={() => {
              persist(ids);
              setReset((n) => n + 1);
            }}
          >
            <RotateCcw size={15} />
            {t("Сбросить", "Reset")}
          </button>
        )}
      </div>
      <DraggableWidgetGrid
        key={`${data.id}:${t("ru", "en")}:${reset}`}
        items={items}
        onChange={(next) => persist(next.map((i) => i.id))}
        editable={editing}
        motionEnabled={enabled}
        maxColumns={4}
        listLabel={t("Блоки карточки стартапа", "Startup profile blocks")}
        instructions={t(
          "Удерживай Alt и нажимай стрелки для перестановки. На телефоне удерживай блок перед перемещением.",
          "Hold Alt and press arrow keys to rearrange. On touch screens, press and hold before dragging.",
        )}
        renderItem={(item) => {
          return (
            <div className={`startup-widget-panel widget-${item.id}`}>
              <div className="startup-widget-heading">
                <h3>{labels[item.id]}</h3>
              </div>
              <div
                className="startup-widget-body"
                tabIndex={editing ? undefined : 0}
              >
                {content(item.id)}
              </div>
            </div>
          );
        }}
      />
      <p className="startup-widget-notice" role="status">
        {notice}
      </p>
    </section>
  );
}
