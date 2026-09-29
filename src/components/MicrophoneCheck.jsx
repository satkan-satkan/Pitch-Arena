import React, { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
// This local-only recording never starts a pitch or submits audio to the server.
export default function MicrophoneCheck({ t, onActive }) {
  const [state, setState] = useState("idle"),
    [level, setLevel] = useState(0),
    [clip, setClip] = useState(null),
    [error, setError] = useState("");
  const resources = useRef({}),
    alive = useRef(true),
    version = useRef(0),
    url = useRef(null);
  const release = () => {
    const r = resources.current;
    clearTimeout(r.timer);
    cancelAnimationFrame(r.frame);
    if (r.rec?.state === "recording") r.rec.stop();
    r.stream?.getTracks().forEach((t) => t.stop());
    r.context?.close().catch(() => {});
    resources.current = {};
  };
  const stop = () => {
    version.current++;
    release();
    if (alive.current) {
      setState("done");
      setLevel(0);
      onActive(false);
    }
  };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      version.current++;
      release();
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, []);
  const start = async () => {
    const token = ++version.current;
    setState("pending");
    setError("");
    onActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current || token !== version.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      resources.current.stream = stream;
      const chunks = [],
        rec = new MediaRecorder(stream);
      resources.current.rec = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        if (!alive.current) return;
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = URL.createObjectURL(
          new Blob(chunks, { type: rec.mimeType }),
        );
        setClip(url.current);
      };
      rec.start();
      setState("recording");
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (Audio) {
        const context = new Audio();
        resources.current.context = context;
        await context.resume();
        if (!alive.current || token !== version.current) return;
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        context.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        const tick = () => {
          if (!alive.current || token !== version.current) return;
          analyser.getByteTimeDomainData(data);
          setLevel(
            Math.min(
              100,
              Math.sqrt(
                data.reduce((s, v) => s + (v - 128) ** 2, 0) / data.length,
              ) * 5,
            ),
          );
          resources.current.frame = requestAnimationFrame(tick);
        };
        tick();
      }
      resources.current.timer = setTimeout(stop, 10000);
    } catch {
      if (!alive.current || token !== version.current) return;
      release();
      if (alive.current) {
        setState("idle");
        onActive(false);
        setError(
          t(
            "Микрофон недоступен. Разреши доступ или продолжи текстом.",
            "Microphone unavailable. Allow access or continue with text.",
          ),
        );
      }
    }
  };
  return (
    <div className="microphone-check">
      <div>
        <strong>{t("Проверка перед выходом", "Before you go on")}</strong>
        <span>
          {t(
            "До 10 секунд · запись только на устройстве",
            "Up to 10 seconds · recorded on this device only",
          )}
        </span>
      </div>
      <button
        type="button"
        className="button white"
        onClick={state === "recording" || state === "pending" ? stop : start}
      >
        {state === "recording" ? <Square size={14} /> : <Mic size={14} />}{" "}
        {state === "pending"
          ? t("Отменить запрос", "Cancel request")
          : state === "recording"
            ? t("Остановить проверку", "Stop check")
            : t("Проверить микрофон", "Test microphone")}
      </button>
      <div
        className="mic-meter"
        role="meter"
        aria-label={t("Уровень микрофона", "Microphone level")}
        aria-valuenow={Math.round(level)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <i style={{ width: `${level}%` }} />
      </div>
      <p role="status">
        {error ||
          (state === "recording"
            ? t(
                "Скажи пару слов. Шкала показывает уровень сигнала.",
                "Say a few words. The meter shows your signal level.",
              )
            : state === "done" && clip
              ? t(
                  "Прослушай запись перед стартом. Таймер ещё не запущен.",
                  "Listen back before starting. The pitch timer has not started.",
                )
              : t(
                  "Проверь звук и пролистай слайды. Затем начинай.",
                  "Check your sound and browse your slides. Then begin.",
                ))}
      </p>
      {clip && state !== "recording" && <audio controls src={clip} />}
    </div>
  );
}
