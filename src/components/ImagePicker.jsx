import React, { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import "./images.css";

export function Avatar({ src, name = "", className = "" }) {
  return (
    <span className={`avatar-image ${className}`}>
      <span aria-hidden="true">
        {name.trim().slice(0, 2).toUpperCase() || "✦"}
      </span>
      {src && (
        <img
          key={src}
          src={src}
          alt={name}
          onError={(e) => {
            e.currentTarget.hidden = true;
          }}
        />
      )}
    </span>
  );
}

async function prepareImage(file) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error("format");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 16000000) throw new Error("size");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const size = Math.min(bitmap.width, bitmap.height);
    canvas
      .getContext("2d")
      .drawImage(
        bitmap,
        (bitmap.width - size) / 2,
        (bitmap.height - size) / 2,
        size,
        size,
        0,
        0,
        256,
        256,
      );
    for (const quality of [0.85, 0.7, 0.5]) {
      const data = canvas.toDataURL("image/webp", quality);
      if (data.length <= 64000) return data;
    }
    throw new Error("size");
  } finally {
    bitmap.close();
  }
}
export default function ImagePicker({
  value,
  onChange,
  onBusy,
  label,
  name,
  t,
  round = false,
}) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className={`image-picker ${round ? "round" : ""}`}>
      <Avatar src={value} name={name} />
      <div>
        <strong>{label}</strong>
        <p>
          {t(
            "JPG, PNG или WebP · до 5 МБ. Квадрат по центру, 256 × 256.",
            "JPG, PNG or WebP · up to 5 MB. Center square crop, 256 × 256.",
          )}
        </p>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={label}
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            onBusy?.(true);
            setError("");
            try {
              onChange(await prepareImage(file));
            } catch {
              setError(
                t(
                  "Не удалось обработать изображение. Выбери JPG, PNG или WebP до 5 МБ и 16 мегапикселей.",
                  "Could not process this image. Choose a JPG, PNG or WebP up to 5 MB and 16 megapixels.",
                ),
              );
            } finally {
              setBusy(false);
              onBusy?.(false);
            }
          }}
        />
        <div className="image-picker-actions">
          <button
            type="button"
            className="button white"
            disabled={busy}
            onClick={() => input.current.click()}
          >
            <Upload size={15} />
            {busy
              ? t("Обработка…", "Processing…")
              : t("Загрузить фото", "Upload image")}
          </button>
          {value && (
            <button
              type="button"
              className="button white"
              disabled={busy}
              onClick={() => {
                onChange("");
                setError("");
              }}
            >
              <X size={15} />
              {t("Удалить фото", "Remove image")}
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
