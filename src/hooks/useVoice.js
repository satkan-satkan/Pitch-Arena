import { useEffect, useRef, useState } from "react";

// Keeps capture, transcription, and pending permission requests scoped to this room.
export default function useVoice(lang, t, onText) {
  const [active, setActive] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [interim, setInterim] = useState(""),
    [url, setUrl] = useState(null),
    [mime, setMime] = useState("audio/webm");
  const recorder = useRef(null),
    stream = useRef(null),
    recognition = useRef(null),
    objectUrl = useRef(null),
    mounted = useRef(true),
    request = useRef(0),
    callback = useRef(onText);
  callback.current = onText;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current++;
      if (recognition.current) {
        recognition.current.onresult = null;
        recognition.current.abort();
      }
      if (recorder.current?.state === "recording") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      stream.current?.getTracks().forEach((track) => track.stop());
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);
  const stop = async () => {
    request.current++;
    setPending(false);
    const r = recognition.current;
    recognition.current = null;
    if (r) {
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 1000);
        r.addEventListener(
          "end",
          () => {
            clearTimeout(timeout);
            resolve();
          },
          { once: true },
        );
        try {
          r.stop();
        } catch {
          clearTimeout(timeout);
          resolve();
        }
      });
      r.onresult = null;
      r.onerror = null;
    }
    if (recorder.current?.state === "recording") {
      const rec = recorder.current;
      await new Promise((resolve) => {
        rec.addEventListener("stop", resolve, { once: true });
        rec.stop();
      });
    }
    stream.current?.getTracks().forEach((track) => track.stop());
    if (mounted.current) {
      setActive(false);
      setInterim("");
    }
  };
  const start = async () => {
    if (active) return true;
    if (pending) return false;
    const token = ++request.current;
    setPending(true);
    setError("");
    setInterim("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unavailable");
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || request.current !== token) {
        media.getTracks().forEach((track) => track.stop());
        return false;
      }
      stream.current = media;
      const chunks = [];
      const rec = new MediaRecorder(media);
      recorder.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        if (!mounted.current) return;
        const blob = new Blob(chunks, { type: rec.mimeType });
        if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = URL.createObjectURL(blob);
        setUrl(objectUrl.current);
        setMime(rec.mimeType);
      };
      rec.start();
      setActive(true);
      const Recognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (Recognition) {
        const r = new Recognition();
        r.lang = lang === "ru" ? "ru-RU" : "en-US";
        r.continuous = true;
        r.interimResults = true;
        r.onresult = (e) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal)
              callback.current(e.results[i][0].transcript);
            else interim += e.results[i][0].transcript;
          }
          if (mounted.current) setInterim(interim);
        };
        r.onerror = (e) => {
          if (e.error !== "aborted" && mounted.current)
            setError(
              t(
                "Распознавание речи недоступно. Аудио записывается; после питча добавь транскрипт вручную.",
                "Speech recognition is unavailable. Audio is recording; add your transcript manually after the pitch.",
              ),
            );
        };
        r.onend = () => {
          if (recognition.current === r) recognition.current = null;
        };
        recognition.current = r;
        try {
          r.start();
        } catch {
          recognition.current = null;
          setError(
            t(
              "Запись работает. Введи транскрипт вручную после питча.",
              "Recording is active. Enter your transcript manually after the pitch.",
            ),
          );
        }
      } else
        setError(
          t(
            "В этом браузере нет распознавания речи. Аудио записывается; транскрипт можно добавить вручную.",
            "This browser has no speech recognition. Audio is recording; you can add the transcript manually.",
          ),
        );
      return true;
    } catch {
      stream.current?.getTracks().forEach((track) => track.stop());
      if (mounted.current) {
        setActive(false);
        setError(
          t(
            "Микрофон недоступен. Можно продолжить текстом или разрешить доступ в браузере.",
            "Microphone unavailable. Continue with text or allow microphone access in your browser.",
          ),
        );
      }
      return false;
    } finally {
      if (mounted.current && request.current === token) setPending(false);
    }
  };
  return {
    active,
    pending,
    error,
    interim,
    url,
    mime,
    start,
    stop,
    clearError: () => setError(""),
  };
}
