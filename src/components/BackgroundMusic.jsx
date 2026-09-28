import React, { useEffect, useRef, useState } from "react";
import { Music2, VolumeX } from "lucide-react";
const read = () => {
  try {
    return JSON.parse(localStorage.getItem("pa-audio")) || {};
  } catch {
    return {};
  }
};
export default function BackgroundMusic({ blocked, t }) {
  const [enabled, setEnabled] = useState(() => Boolean(read().enabled));
  const [volume, setVolume] = useState(() =>
    Math.min(0.6, Math.max(0, Number(read().volume ?? 0.2))),
  );
  const [open, setOpen] = useState(false),
    [error, setError] = useState(false),
    [unlocked, setUnlocked] = useState(false),
    [visible, setVisible] = useState(!document.hidden);
  const audio = useRef(null),
    fade = useRef(null);
  useEffect(() => {
    const unlock = () => setUnlocked(true);
    const visibility = () => setVisible(!document.hidden);
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("pa-audio", JSON.stringify({ enabled, volume }));
    } catch {}
  }, [enabled, volume]);
  useEffect(() => {
    const player = audio.current;
    clearInterval(fade.current);
    if (!enabled || blocked || !visible || !unlocked) {
      player.pause();
      return;
    }
    let cancelled = false;
    player.volume = 0;
    player
      .play()
      .then(() => {
        if (cancelled) {
          player.pause();
          return;
        }
        setError(false);
        let step = 0;
        fade.current = setInterval(() => {
          player.volume = volume * Math.min(1, ++step / 12);
          if (step >= 12) clearInterval(fade.current);
        }, 40);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      clearInterval(fade.current);
      player.pause();
    };
  }, [enabled, volume, blocked, visible, unlocked]);
  return (
    <div className="music-control">
      <audio
        ref={audio}
        src="/audio/inquisitive-groove.mp3"
        loop
        preload="none"
        data-testid="background-music"
      />
      <button
        className={`icon-button ${enabled ? "music-on" : ""}`}
        aria-label={t("Настройки музыки", "Music settings")}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {enabled ? <Music2 size={18} /> : <VolumeX size={18} />}
      </button>
      {open && (
        <div className="music-pop">
          <strong>{t("Музыка", "Music")}</strong>
          <p>Inquisitive Groove</p>
          <button
            className="button white"
            aria-pressed={enabled}
            onClick={() => {
              setUnlocked(true);
              setEnabled(!enabled);
            }}
          >
            {enabled
              ? t("Выключить музыку", "Turn music off")
              : t("Включить музыку", "Turn music on")}
          </button>
          <label>
            {t("Громкость", "Volume")}
            <input
              type="range"
              min="0"
              max="60"
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
            />
          </label>
          <small>
            {blocked
              ? t("Пауза на время выступления", "Paused during practice")
              : t(
                  "Музыка играет в меню и на карте",
                  "Music plays in menus and on the map",
                )}
          </small>
          {error && (
            <p role="status">
              {t(
                "Не удалось воспроизвести трек. Выключи и включи музыку ещё раз.",
                "Could not play the track. Turn music off and on to retry.",
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
