import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Headphones,
  Lightbulb,
  Mic,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  Square,
  Star,
  Target,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { panelFor, photo } from "./game-data";
import {
  analyzePitch,
  createQuestions,
  evaluateAnswer,
  createFollowUp,
  evaluateSession,
  transitionPhase,
} from "./practice/engine";
import { EvidenceChecks, PracticeGoal } from "./components/PracticeFeedback";

import MicrophoneCheck from "./components/MicrophoneCheck";
import useVoice from "./hooks/useVoice";
import { errorText } from "./services/api";
import MentorFeedback from "./components/MentorFeedback";
import { GuideMessage } from "./guide/Guide";

const formatTime = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
function Portrait({ person, pick }) {
  return (
    <span className={`stage-portrait ${person.fictional ? "illustrated" : ""}`}>
      {person.photo ? (
        <img src={photo(person.photo, 180)} alt={pick(person.name)} />
      ) : (
        <span>{person.initial}</span>
      )}
    </span>
  );
}
export default function PitchRoom({
  data,
  t,
  pick,
  lang,
  onClose,
  onComplete,
  Brand,
  Modal,
  CameraPreview,
  guideEnabled = true,
}) {
  const { arena, startup, ask, files } = data,
    limit = data.pitchSeconds || arena.pitchSeconds || 120,
    panel = panelFor(arena);
  const initial = data.restored || {};
  const expired =
    initial.phase === "pitch" && data.deadline && data.deadline <= Date.now();
  const [phase, setPhase] = useState(
      expired ? "review" : initial.phase || "ready",
    ),
    [remaining, setRemaining] = useState(
      data.deadline
        ? Math.max(0, Math.ceil((data.deadline - Date.now()) / 1000))
        : limit,
    ),
    [pitch, setPitch] = useState(initial.pitch ?? ""),
    [analysis, setAnalysis] = useState(initial.analysis ?? null),
    [questions, setQuestions] = useState(initial.questions ?? []),
    [step, setStep] = useState(initial.step ?? 0),
    [answer, setAnswer] = useState(initial.answer ?? ""),
    [answers, setAnswers] = useState(initial.answers ?? []),
    [answerFeedback, setAnswerFeedback] = useState(
      initial.answerFeedback ?? null,
    ),
    [slide, setSlide] = useState(initial.slide ?? 0),
    [busy, setBusy] = useState(false),
    [confirmExit, setConfirmExit] = useState(false),
    [voiceEnabled, setVoiceEnabled] = useState(
      initial.voiceEnabled ?? data.spokenQuestions ?? true,
    ),
    [speechError, setSpeechError] = useState("");
  const [micTesting, setMicTesting] = useState(false);
  const [mentor, setMentor] = useState(initial.mentor || null),
    [answerMentor, setAnswerMentor] = useState(initial.answerMentor || null),
    [syncError, setSyncError] = useState(""),
    [saveState, setSaveState] = useState("saved");
  const [urls] = useState(() =>
    files.map((f) => ({
      url: URL.createObjectURL(f),
      type: f.type,
      name: f.name,
    })),
  );
  const phaseRef = useRef(phase),
    pitchRef = useRef(pitch),
    answerRef = useRef(answer),
    deadline = useRef(data.deadline || null),
    started = useRef(data.startedAt || null),
    pitchDuration = useRef(expired ? limit : initial.pitchDuration || 0),
    transition = useRef(false),
    mounted = useRef(true);
  phaseRef.current = phase;
  pitchRef.current = pitch;
  answerRef.current = answer;
  const stateRef = useRef(null);
  stateRef.current = {
    phase,
    pitch,
    analysis,
    questions,
    step,
    answer,
    answers,
    answerFeedback,
    slide,
    voiceEnabled,
    mentor,
    answerMentor,
    pitchDuration: pitchDuration.current,
  };
  const applySnapshot = (snapshot) => {
    const s = snapshot.state;
    started.current = snapshot.startedAt;
    deadline.current = snapshot.deadline;
    pitchDuration.current = s.pitchDuration;
    phaseRef.current = s.phase;
    setPhase(s.phase);
    pitchRef.current = s.pitch;
    setPitch(s.pitch);
    setAnalysis(s.analysis);
    setQuestions(s.questions);
    setStep(s.step);
    answerRef.current = s.answer;
    setAnswer(s.answer);
    setAnswers(s.answers);
    setAnswerFeedback(s.answerFeedback);
    setMentor(s.mentor);
    setAnswerMentor(s.answerMentor);
  };
  useEffect(() => {
    if (phase === "completed") return;
    const cached = {
      id: data.id,
      revision: data.cloud?.snapshot.revision,
      state: stateRef.current,
      config: {
        startup,
        ask,
        arenaId: arena.id,
        arena,
        pitchSeconds: limit,
        language: lang,
        spokenQuestions: voiceEnabled,
        practiceGoal: data.practiceGoal || null,
        tutorial: Boolean(data.tutorial),
      },
      startedAt: started.current,
      deadline: deadline.current,
    };
    try {
      localStorage.setItem(data.draftKey || "pa-draft", JSON.stringify(cached));
    } catch {
      setSyncError(
        t(
          "Не удалось сохранить текст на устройстве.",
          "Could not save text on this device.",
        ),
      );
    }
    if (!data.cloud) return;
    setSaveState("saving");
    const timer = setTimeout(() => {
      if (transition.current) return;
      data.cloud
        .save(stateRef.current)
        .then(() => {
          if (mounted.current) {
            setSaveState("saved");
            setSyncError("");
          }
        })
        .catch((error) => {
          if (mounted.current) {
            setSaveState("error");
            setSyncError(errorText(error, t));
          }
        });
    }, 600);
    return () => clearTimeout(timer);
  }, [
    phase,
    pitch,
    answer,
    answers,
    questions,
    step,
    slide,
    voiceEnabled,
    answerFeedback,
    analysis,
    mentor,
    answerMentor,
  ]);
  const cloudAction = async (action, payload = {}, saveFirst = true) => {
    if (transition.current) return null;
    transition.current = true;
    setBusy(true);
    setSyncError("");
    try {
      if (saveFirst) await data.cloud.save(stateRef.current);
      const snapshot = await data.cloud.call(action, payload);
      if (mounted.current && snapshot.state) applySnapshot(snapshot);
      return snapshot;
    } catch (error) {
      if (mounted.current) setSyncError(errorText(error, t));
      return null;
    } finally {
      transition.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const voice = useVoice(lang, t, (text) => {
    if (phaseRef.current === "pitch") {
      pitchRef.current = `${pitchRef.current} ${text}`.trim();
      setPitch(pitchRef.current);
    } else if (phaseRef.current === "qa") {
      answerRef.current = `${answerRef.current} ${text}`.trim();
      setAnswer(answerRef.current);
    }
  });
  const move = (event) => {
    const next = transitionPhase(phaseRef.current, event);
    phaseRef.current = next;
    setPhase(next);
  };
  const endPitchRef = useRef(null);
  const endPitch = async () => {
    if (transition.current || phaseRef.current !== "pitch") return;
    transition.current = true;
    setBusy(true);
    pitchDuration.current = Math.min(
      limit,
      Math.max(1, Math.round((Date.now() - started.current) / 1000)),
    );
    await voice.stop();
    if (!mounted.current) return;
    move("STOP");
    setBusy(false);
    transition.current = false;
  };
  endPitchRef.current = endPitch;
  useEffect(() => {
    mounted.current = true;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      mounted.current = false;
      document.body.style.overflow = previous;
      urls.forEach((f) => URL.revokeObjectURL(f.url));
      window.speechSynthesis?.cancel();
    };
  }, []);
  useEffect(() => {
    if (phase !== "pitch") return;
    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setRemaining(left);
      if (left === 0) endPitchRef.current();
    };
    tick();
    const id = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [phase]);
  const startPitch = async (withMic) => {
    if (busy || voice.pending) return;
    setBusy(true);
    if (withMic && !(await voice.start())) {
      setBusy(false);
      return;
    }
    if (!mounted.current) return;
    if (data.cloud) {
      const snapshot = await cloudAction("start", {}, false);
      if (!snapshot) {
        await voice.stop();
        setBusy(false);
        return;
      }
      setBusy(false);
      return;
    }
    if (!mounted.current) return;
    started.current = Date.now();
    deadline.current = Date.now() + limit * 1000;
    move("START");
    setBusy(false);
  };
  const review = async () => {
    const text = pitch.trim();
    if (data.cloud) {
      await cloudAction("analyze", { pitch: text });
      return;
    }
    if (text.split(/\s+/).filter(Boolean).length < 10) return;
    setAnalysis(analyzePitch(text, t));
    setQuestions(createQuestions(text, arena, ask, t));
    move("ANALYZE");
  };
  const speak = (text) => {
    setSpeechError("");
    if (!window.speechSynthesis) {
      setSpeechError(
        t(
          "Озвучивание недоступно в этом браузере.",
          "Speech playback is unavailable in this browser.",
        ),
      );
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "ru" ? "ru-RU" : "en-US";
    utterance.rate = 0.98;
    const available = window.speechSynthesis.getVoices();
    utterance.voice =
      available.find((v) => v.lang.startsWith(lang) && v.localService) ||
      available.find((v) => v.lang.startsWith(lang)) ||
      null;
    utterance.onerror = (e) => {
      if (!["interrupted", "canceled"].includes(e.error) && mounted.current)
        setSpeechError(
          t(
            "Не удалось озвучить вопрос. Прочитай его на экране.",
            "Could not play this question. Please read it on screen.",
          ),
        );
    };
    window.speechSynthesis.speak(utterance);
  };
  useEffect(() => {
    if (phase === "qa" && voiceEnabled && !answerFeedback)
      speak(questions[step].text);
    return () => window.speechSynthesis?.cancel();
  }, [phase, step, voiceEnabled, answerFeedback]);
  const send = async () => {
    if (!answer.trim() || busy || transition.current || answerFeedback) return;
    transition.current = true;
    setBusy(true);
    window.speechSynthesis?.cancel();
    await voice.stop();
    if (!mounted.current) return;
    const text = answerRef.current.trim();
    if (data.cloud) {
      transition.current = false;
      await cloudAction("answer", { step, answer: text });
      return;
    }
    const report = evaluateAnswer(text, questions[step]);
    setAnswers([...answers, text]);
    // At most one extra question per round. It uses the player's answer verbatim.
    if (!questions.some((q) => q.followUp)) {
      const followUp = createFollowUp(text, questions[step], report, t);
      if (followUp)
        setQuestions([
          ...questions.slice(0, step + 1),
          followUp,
          ...questions.slice(step + 1),
        ]);
    }
    setAnswerFeedback(report);
    setBusy(false);
    transition.current = false;
  };
  const advance = async () => {
    if (transition.current || !answerFeedback) return;
    if (data.cloud) {
      const last = step === questions.length - 1;
      const snapshot = await cloudAction(last ? "complete" : "next", {}, false);
      if (last && snapshot?.result) onComplete(snapshot.result);
      return;
    }
    transition.current = true;
    if (step < questions.length - 1) {
      answerRef.current = "";
      setAnswer("");
      setAnswerFeedback(null);
      setStep(step + 1);
      transition.current = false;
      return;
    }
    const evaluation = evaluateSession({ pitch, questions, answers, arena });
    move("COMPLETE");
    onComplete({
      ...evaluation,
      id: data.id,
      mentor,
      startup,
      arena: pick(arena.title),
      arenaId: arena.id,
      region: arena.region,
      duration: Math.max(1, Math.round((Date.now() - started.current) / 1000)),
      pitchDuration: pitchDuration.current,
      pitchLimit: limit,
      answers,
      questions: questions.map((q) => q.text),
      questionPlan: questions,
      pitchTranscript: pitch,
      ask,
      practiceGoal: data.practiceGoal || null,
      personaId: arena.personaIds?.length === 1 ? arena.personaIds[0] : null,
    });
  };
  const startQuestions = async () => {
    voice.clearError();
    if (data.cloud) {
      await cloudAction("next", {}, false);
      return;
    }
    move("QUESTIONS");
  };
  const speakerIndex = questions[step]?.speakerIndex ?? 0;
  const current = panel[speakerIndex % panel.length];
  const stagePhase = ["ready", "pitch"].includes(phase);
  const phaseIndex = stagePhase ? 0 : phase === "qa" ? 2 : 1;
  const wordCount = pitch.trim().split(/\s+/).filter(Boolean).length;
  const audioClip = voice.url ? (
    <div className="audio-playback">
      <audio controls src={voice.url} />
      <a
        href={voice.url}
        download={`${startup}-${phase === "qa" ? "answer" : "pitch"}.${voice.mime.includes("mp4") ? "m4a" : "webm"}`}
        aria-label={t("Скачать запись", "Download recording")}
      >
        <Download size={17} />
      </a>
    </div>
  ) : null;
  return (
    <div className={`pitch-room game-room phase-${phase}`}>
      <header className="room-header">
        <Brand small />
        <div className="room-title">
          <span className="status-dot" />
          {pick(arena.title)}
          <span className="room-demo">
            {t("Игровая симуляция", "Game simulation")}
          </span>
        </div>
        <div className="room-reward">
          <Zap size={14} />+{arena.xp} XP
        </div>
        <button
          className="icon-button"
          onClick={() => setConfirmExit(true)}
          aria-label={t("Выйти", "Exit")}
        >
          <X size={21} />
        </button>
      </header>
      <div className="room-save-status" role="status">
        {data.cloud
          ? saveState === "saving"
            ? t("Сохраняем на сервере…", "Saving to server…")
            : saveState === "error"
              ? t(
                  "Нет соединения · текст на устройстве",
                  "Offline · text saved on device",
                )
              : t("Сохранено в аккаунте", "Saved to account")
          : t(
              "Черновик сохраняется на этом устройстве",
              "Draft saved on this device",
            )}
      </div>
      {syncError && (
        <div className="room-sync-error" role="alert">
          {syncError}
          <button
            className="button white"
            disabled={busy}
            onClick={() =>
              data.cloud &&
              data.cloud
                .save(stateRef.current)
                .then(() => {
                  setSyncError("");
                  setSaveState("saved");
                })
                .catch((error) => setSyncError(errorText(error, t)))
            }
          >
            {t("Повторить сохранение", "Retry save")}
          </button>
        </div>
      )}
      {data.resuming && (
        <p className="resume-note">
          {t(
            "Текст восстановлен. Микрофон включается вручную; прежняя аудиозапись не сохраняется.",
            "Your text is restored. Turn the microphone on manually; the previous audio recording is not retained.",
          )}
          {!data.cloud &&
            t(
              " При необходимости загрузи презентацию заново в новой тренировке.",
              " Reattach slides in a new practice if needed.",
            )}
        </p>
      )}
      <div className="room-phase-bar">
        {[
          [Mic, t("Твой питч", "Your pitch")],
          [Sparkles, t("Разбор", "Debrief")],
          [Headphones, t("Вопросы инвесторов", "Investor questions")],
        ].map(([Icon, name], i) => (
          <div
            key={i}
            className={
              phaseIndex === i ? "active" : phaseIndex > i ? "complete" : ""
            }
          >
            <span>
              {phaseIndex > i ? <Check size={13} /> : <Icon size={13} />}
            </span>
            <strong>{name}</strong>
            <small>0{i + 1}</small>
          </div>
        ))}
      </div>
      <div className="room-content">
        <section className="room-stage">
          <div className="stage-top">
            <div>
              <span className="eyebrow">
                {stagePhase
                  ? t("СЦЕНА ТВОЯ", "THE STAGE IS YOURS")
                  : t("ПИТЧ ЗАВЕРШЁН", "PITCH COMPLETE")}
              </span>
              <h2>{startup}</h2>
            </div>
            {stagePhase ? (
              <div className={`countdown ${remaining <= 15 ? "urgent" : ""}`}>
                <Clock3 size={19} />
                <strong data-testid="pitch-countdown">
                  {formatTime(remaining)}
                </strong>
                <span>
                  {phase === "ready"
                    ? t("на твою историю", "to tell your story")
                    : t("осталось", "remaining")}
                </span>
              </div>
            ) : (
              <span className="funding-ask">
                ${ask.toLocaleString()}
                <small>{t("инвестиционный запрос", "funding ask")}</small>
              </span>
            )}
          </div>
          <div className="presentation">
            <CameraPreview t={t} />
            {urls.length ? (
              urls[slide].type === "application/pdf" ? (
                <iframe
                  title={t("Презентация", "Pitch deck")}
                  src={urls[slide].url}
                />
              ) : (
                <img
                  src={urls[slide].url}
                  alt={`${t("Слайд", "Slide")} ${slide + 1}`}
                />
              )
            ) : (
              <div className="demo-slide">
                <div className="demo-slide-label">
                  {String(slide + 1).padStart(2, "0")} / 05{" "}
                  <span>YOUR NEXT BIG THING</span>
                </div>
                <div className="slide-spark">✳</div>
                <h1>
                  {
                    [
                      startup,
                      t(
                        "Проблема.\nИ твоё решение.",
                        "The problem.\nYour solution.",
                      ),
                      t("Рынок ждёт.", "The market is waiting."),
                      t(
                        "От идеи\nк первым клиентам.",
                        "From an idea\nto your first customers.",
                      ),
                      t(
                        "Создадим будущее.\nВместе.",
                        "Let’s build the future.\nTogether.",
                      ),
                    ][slide]
                  }
                </h1>
                <p>
                  {
                    [
                      t(
                        "Две минуты могут стать началом большой истории.",
                        "A few minutes can be the start of a great story.",
                      ),
                      t(
                        "Кому ты помогаешь и что меняешь?",
                        "Who do you help, and what do you change?",
                      ),
                      t(
                        "Кто твой клиент? Почему сейчас?",
                        "Who is your customer? Why now?",
                      ),
                      t(
                        "Расскажи о бизнес-модели и росте.",
                        "Tell us about your business model and growth.",
                      ),
                      t(
                        `Раунд: $${ask.toLocaleString()} · Твой следующий большой шаг`,
                        `Raising $${ask.toLocaleString()} · Your next big step`,
                      ),
                    ][slide]
                  }
                </p>
                <div className="demo-slide-bottom">
                  {startup}
                  <ArrowUpRight size={25} />
                </div>
              </div>
            )}
            {phase === "pitch" && (
              <div className="stage-time-track">
                <span style={{ width: `${(remaining / limit) * 100}%` }} />
              </div>
            )}
          </div>
          <div className="slide-controls">
            <span>
              <FileText size={14} />
              {urls.length
                ? urls[slide].name
                : t("Тренировочная презентация", "Practice deck")}
            </span>
            {urls[slide]?.type === "application/pdf" ? (
              <small>
                {t(
                  "Страницы листаются внутри PDF",
                  "Scroll inside the PDF to change pages",
                )}
              </small>
            ) : (
              <div>
                <button
                  className="icon-button"
                  disabled={slide === 0}
                  onClick={() => setSlide((s) => s - 1)}
                  aria-label={t("Предыдущий слайд", "Previous slide")}
                >
                  <ChevronLeft size={18} />
                </button>
                <span>
                  {slide + 1} / {urls.length || 5}
                </span>
                <button
                  className="icon-button"
                  disabled={slide === (urls.length || 5) - 1}
                  onClick={() => setSlide((s) => s + 1)}
                  aria-label={t("Следующий слайд", "Next slide")}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
          <div className="panel-label">
            <Headphones size={15} />
            {phase === "pitch"
              ? t(
                  "Вся панель слушает. Тебя не перебивают.",
                  "The panel is listening. No interruptions.",
                )
              : t("По ту сторону стола", "Across the table")}
            <span>
              {arena.personaIds
                ? t(
                    "Реальные прототипы · симуляция",
                    "Real-world references · simulation",
                  )
                : t("Игровые персонажи", "Fictional characters")}
            </span>
          </div>
          <div className={`stage-panel count-${panel.length}`}>
            {panel.map((person, i) => {
              const interest =
                phase === "qa"
                  ? Math.min(
                      92,
                      25 +
                        answers.reduce(
                          (sum, a, index) =>
                            sum + evaluateAnswer(a, questions[index]).points,
                          0,
                        ) +
                        (analysis?.topics.filter((x) => x.found).length || 0) *
                          2,
                    )
                  : null;
              return (
                <div
                  key={i}
                  className={`stage-investor ${phase === "qa" && speakerIndex % panel.length === i ? "speaking" : ""}`}
                >
                  <div className="investor-seat">
                    <Portrait person={person} pick={pick} />
                    {phase === "pitch" && (
                      <span className="listening-indicator">
                        <i />
                        <i />
                        <i />
                      </span>
                    )}
                    {phase === "qa" && speakerIndex % panel.length === i && (
                      <span className="speaker-mark">
                        <Volume2 size={13} />
                      </span>
                    )}
                  </div>
                  <strong>{pick(person.name)}</strong>
                  <span>
                    {phase === "qa"
                      ? speakerIndex % panel.length === i
                        ? t("Задаёт вопрос", "Asking a question")
                        : t("Слушает ответ", "Listening")
                      : phase === "ready"
                        ? t("Готов слушать", "Ready to listen")
                        : phase === "pitch"
                          ? t("Внимательно слушает", "Listening closely")
                          : t("Знакомится с питчем", "Reviewing your pitch")}
                  </span>
                  {interest !== null && (
                    <div className="game-interest">
                      <div>
                        <span>{t("Интерес", "Interest")}</span>
                        <strong>{interest}%</strong>
                      </div>
                      <span>
                        <i style={{ width: `${interest}%` }} />
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="room-disclaimer">
            {arena.personaIds
              ? t(
                  "Учебная симуляция. Реплики придуманы, синтетический голос не имитирует реального человека.",
                  "Educational simulation. Dialogue is fictional; the synthetic voice does not imitate a real person.",
                )
              : t(
                  "Учебная симуляция с вымышленной панелью. Интерес — игровой показатель.",
                  "An educational simulation with a fictional panel. Interest is a game indicator.",
                )}
          </p>
        </section>
        <aside className="room-conversation game-conversation">
          {guideEnabled && (
            <GuideMessage
              t={t}
              phase={phase}
              busy={busy}
              error={Boolean(syncError || voice.error)}
              answered={Boolean(answerFeedback)}
              compact
            />
          )}
          {phase === "ready" && (
            <>
              <div className="ready-icon">
                <Mic size={29} />
                <span>✦</span>
              </div>
              <div className="eyebrow">
                {t("ОДНА СЦЕНА. ТВОЯ ИСТОРИЯ.", "ONE STAGE. YOUR STORY.")}
              </div>
              <h2>{t("Готов к выходу?", "Ready for your moment?")}</h2>
              <p className="phase-description">
                {t(
                  "Сначала расскажи о проекте. Инвесторы зададут вопросы только после выступления.",
                  "First, tell your story. The investors will ask questions only after you finish.",
                )}
              </p>
              <div className="ready-rules">
                <div>
                  <Clock3 size={17} />
                  <span>
                    {formatTime(limit)} {t("на питч", "to pitch")}
                  </span>
                </div>
                <div>
                  <Headphones size={17} />
                  <span>
                    {t(
                      "Без вопросов и перебиваний",
                      "No questions or interruptions",
                    )}
                  </span>
                </div>
                <div>
                  <Target size={17} />
                  <span>
                    {t(
                      "5 вопросов + до 1 уточнения",
                      "5 questions + up to 1 follow-up",
                    )}
                  </span>
                </div>
                <div>
                  <Zap size={17} />
                  <span>
                    +{arena.xp} XP +{" "}
                    {t("бонус за результат", "performance bonus")}
                  </span>
                </div>
              </div>
              <MicrophoneCheck t={t} onActive={setMicTesting} />
              <button
                className="button dark full"
                onClick={() => startPitch(true)}
                disabled={busy || voice.pending || micTesting}
              >
                {voice.pending
                  ? t("Ждём доступ к микрофону…", "Waiting for microphone…")
                  : t("Начать с микрофоном", "Start with microphone")}
                <Mic size={17} />
              </button>
              <button
                className="ready-text-button"
                onClick={() => startPitch(false)}
                disabled={busy || micTesting}
              >
                {t("Начать текстом", "Start with text")}
                <ArrowRight size={14} />
              </button>
              <div className="coach-tip">
                <Lightbulb size={17} />
                <p>
                  {t(
                    "Проблема → продукт → рынок → доказательства → запрос. Расскажи главное, как человеку напротив.",
                    "Problem → product → market → evidence → ask. Tell your story to the person across the table.",
                  )}
                </p>
              </div>
            </>
          )}
          {phase === "pitch" && (
            <>
              <div className="conversation-heading">
                <h3>{t("Твой момент", "Your moment")}</h3>
                <span className={`on-air ${voice.active ? "recording" : ""}`}>
                  <i />
                  {voice.active ? "REC" : t("ТЕКСТ", "TEXT")}
                </span>
              </div>
              <p className="phase-description">
                {t(
                  "Мы слушаем. Говори в своём темпе — вопросы будут потом.",
                  "We’re listening. Take your time — the questions come later.",
                )}
              </p>
              <label className="transcript-label" htmlFor="pitch-transcript">
                {t("Живая транскрипция", "Live transcript")}
                <span>
                  {wordCount} {t("слов", "words")}
                </span>
              </label>
              <textarea
                id="pitch-transcript"
                className="live-transcript"
                value={pitch}
                onChange={(e) => {
                  pitchRef.current = e.target.value;
                  setPitch(e.target.value);
                }}
                maxLength={12000}
                placeholder={t(
                  "Здесь появится твоя речь. Можно также печатать…",
                  "Your speech appears here. You can also type…",
                )}
              />
              {voice.interim && (
                <p className="interim-transcript">{voice.interim}</p>
              )}
              {voice.error && (
                <p className="mic-error" role="status">
                  {voice.error}
                </p>
              )}
              <div className="answer-actions">
                <button
                  className={`mic-button ${voice.active ? "recording" : ""}`}
                  onClick={voice.active ? voice.stop : voice.start}
                  disabled={voice.pending || busy}
                  aria-label={
                    voice.active
                      ? t("Остановить запись", "Stop recording")
                      : t("Включить микрофон", "Start microphone")
                  }
                >
                  {voice.active ? <Square size={19} /> : <Mic size={22} />}
                </button>
                <button
                  className="button dark"
                  onClick={endPitch}
                  disabled={busy}
                >
                  {busy
                    ? t("Сохраняем речь…", "Finishing capture…")
                    : t("Закончить питч", "Finish my pitch")}
                  <ArrowRight size={17} />
                </button>
              </div>
              <div className="listening-message">
                <span className="listening-wave">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <p>
                  {t(
                    "Пока ты говоришь, вся сцена принадлежит тебе.",
                    "While you speak, the stage is yours.",
                  )}
                </p>
              </div>
              <div className="room-privacy">
                <ShieldCheck size={13} />
                {t(
                  "Аудио не отправляется на сервер приложения. Распознавание может обрабатываться сервисом браузера.",
                  "Audio stays off our server. Transcription may use your browser’s speech service.",
                )}
              </div>
            </>
          )}
          {phase === "review" && (
            <>
              <div className="conversation-heading">
                <h3>{t("Сначала проверим слова", "Let’s check your words")}</h3>
                <CheckCircle2 size={20} />
              </div>
              <p className="phase-description">
                {remaining === 0
                  ? t(
                      "Время вышло — питч завершён. Проверь транскрипт перед разбором.",
                      "Time is up — your pitch is complete. Check your transcript before the debrief.",
                    )
                  : t(
                      "Питч завершён. Исправь ошибки распознавания, чтобы вопросы опирались на твою историю.",
                      "Pitch complete. Correct transcription errors so the questions follow your story.",
                    )}
              </p>
              {audioClip}
              <label className="transcript-label" htmlFor="review-transcript">
                {t("Транскрипт питча", "Pitch transcript")}
                <span>
                  {wordCount} {t("слов", "words")}
                </span>
              </label>
              <textarea
                id="review-transcript"
                className="live-transcript"
                value={pitch}
                onChange={(e) => {
                  pitchRef.current = e.target.value;
                  setPitch(e.target.value);
                }}
                maxLength={12000}
                placeholder={t(
                  "Если распознавание не сработало, внеси сюда текст выступления.",
                  "If speech recognition did not work, enter your pitch here.",
                )}
              />
              {wordCount < 10 && (
                <p className="transcript-warning">
                  {t(
                    "Для разбора нужно хотя бы 10 слов. Мы не будем придумывать содержание аудио.",
                    "At least 10 words are needed for a debrief. We won’t invent the contents of your audio.",
                  )}
                </p>
              )}
              <button
                className="button dark full"
                onClick={review}
                disabled={wordCount < 10 || busy}
              >
                {t("Разобрать мой питч", "Review my pitch")}
                <Sparkles size={17} />
              </button>
              <p className="analysis-disclosure">
                {t(
                  data.useAI
                    ? "ИИ разберёт смысл выступления и слайды. Учебный балл рассчитывается отдельно по правилам."
                    : "Работает локальная проверка элементов текста. ИИ-разбор можно включить перед тренировкой в аккаунте.",
                  data.useAI
                    ? "AI will review your pitch and slides. Practice points are calculated separately by game rules."
                    : "Local text checks are active. Enable AI review before a practice in your account.",
                )}
              </p>
            </>
          )}
          {data.practiceGoal && (
            <PracticeGoal goal={data.practiceGoal} t={t} compact />
          )}
          {phase === "analysis" && (
            <>
              <MentorFeedback review={mentor} t={t} />
              <div className="conversation-heading">
                <h3>{t("История услышана", "Your story was heard")}</h3>
                <Sparkles size={21} />
              </div>
              <p className="phase-description">
                {t(
                  "Вот что удалось найти в тексте. Это подсказки для следующего раунда, а не оценка бизнеса.",
                  "Here’s what we found in your text. These are prompts for the next round, not a business evaluation.",
                )}
              </p>
              <div className="debrief-metrics">
                <div>
                  <strong>{analysis.words}</strong>
                  <span>{t("слов в питче", "words in your pitch")}</span>
                </div>
                <div>
                  <strong>
                    {analysis.topics.filter((x) => x.found).length}
                    <small>/5</small>
                  </strong>
                  <span>{t("тем обнаружено", "topics found")}</span>
                </div>
              </div>
              <div className="topic-evidence-list">
                {analysis.topics.map((topic) => (
                  <details key={topic.id}>
                    <summary>
                      <span>{t(...topic.name)}</span>
                      <b>{topic.points}/10</b>
                    </summary>
                    <EvidenceChecks checks={topic.checks} t={t} />
                  </details>
                ))}
              </div>
              <div className="debrief-quote">
                <span>{t("ИЗ ТВОЕГО ПИТЧА", "FROM YOUR PITCH")}</span>
                <p>«{analysis.excerpt}»</p>
              </div>
              <button
                className="button dark full"
                onClick={startQuestions}
                disabled={busy}
              >
                {t("Перейти к вопросам", "Start investor questions")}
                <ArrowRight size={17} />
              </button>
              <button
                className="ready-text-button"
                onClick={() => {
                  setPhase("review");
                  phaseRef.current = "review";
                }}
              >
                {t("Исправить транскрипт", "Edit transcript")}
              </button>
            </>
          )}
          {phase === "qa" && (
            <>
              <div className="conversation-heading">
                <h3>{t("Теперь — вопросы", "Now, the questions")}</h3>
                <span>
                  {step + 1} / {questions.length}
                </span>
              </div>
              <div className="question-progress">
                {questions.map((_, i) => (
                  <span key={i} className={i <= step ? "done" : ""} />
                ))}
              </div>
              <div className="question-author">
                <Portrait person={current} pick={pick} />
                <div>
                  <strong>{pick(current.name)}</strong>
                  <span>{t("Симуляция собеседника", "Simulated persona")}</span>
                </div>
                <button
                  className="icon-button"
                  onClick={() => speak(questions[step].text)}
                  aria-label={t("Озвучить вопрос", "Read question aloud")}
                >
                  <Volume2 size={18} />
                </button>
              </div>
              {questions[step].followUp && (
                <span className="practice-eyebrow">
                  {t("УТОЧНЕНИЕ ПО ТВОЕМУ ОТВЕТУ", "FOLLOW-UP TO YOUR ANSWER")}
                </span>
              )}
              <div className="question-bubble">{questions[step].text}</div>
              <div className="question-voice-setting">
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  aria-pressed={voiceEnabled}
                >
                  {voiceEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}{" "}
                  {t("Озвучивание", "Read aloud")} ·{" "}
                  {voiceEnabled ? t("вкл", "on") : t("выкл", "off")}
                </button>
                <span>{t("Нейтральный голос", "Neutral voice")}</span>
              </div>
              {speechError && <p className="mic-error">{speechError}</p>}
              {answerFeedback ? (
                <section className="answer-review" aria-live="polite">
                  <MentorFeedback review={answerMentor} t={t} />
                  <h3>
                    {t("Что прозвучало в ответе", "What your answer covered")}
                  </h3>
                  <EvidenceChecks checks={answerFeedback.checks} t={t} />
                  <p className="analysis-disclosure">
                    {t(
                      "Это проверка элементов текста, а не достоверности данных. Уточнение может дополнить ответ без дополнительного слота награды.",
                      "This checks text elements, not the accuracy of your data. A follow-up can complete an answer without adding a reward slot.",
                    )}
                  </p>
                  <button
                    className="button dark full"
                    onClick={advance}
                    disabled={busy}
                  >
                    {step === questions.length - 1
                      ? t("Узнать результат", "See my results")
                      : t("Следующий вопрос", "Next question")}
                    <ArrowRight size={17} />
                  </button>
                </section>
              ) : (
                <>
                  <div className="answer-header">
                    <label htmlFor="pitch-answer">
                      {t("Твой ответ", "Your answer")}
                    </label>
                    <span>
                      {voice.active
                        ? t("Идёт запись", "Recording")
                        : t("Голосом или текстом", "Speak or type")}
                    </span>
                  </div>
                  <textarea
                    id="pitch-answer"
                    value={answer}
                    maxLength={12000}
                    onChange={(e) => {
                      answerRef.current = e.target.value;
                      setAnswer(e.target.value);
                    }}
                    placeholder={t(
                      "Ответь на вопрос — голосом или текстом…",
                      "Answer the question — speak or type…",
                    )}
                  />
                  {voice.interim && (
                    <p className="interim-transcript">{voice.interim}</p>
                  )}
                  {voice.error && (
                    <p className="mic-error" role="status">
                      {voice.error}
                    </p>
                  )}
                  <div className="answer-actions">
                    <button
                      className={`mic-button ${voice.active ? "recording" : ""}`}
                      disabled={voice.pending || busy}
                      onClick={
                        voice.active
                          ? voice.stop
                          : () => {
                              window.speechSynthesis?.cancel();
                              voice.start();
                            }
                      }
                      aria-label={
                        voice.active
                          ? t("Остановить запись", "Stop recording")
                          : t("Включить микрофон", "Start microphone")
                      }
                    >
                      {voice.active ? <Square size={19} /> : <Mic size={22} />}
                    </button>
                    <button
                      className="button dark"
                      disabled={!answer.trim() || busy}
                      onClick={send}
                    >
                      {t("Разобрать ответ", "Review answer")}
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </>
              )}
              <div className="coach-tip">
                <Lightbulb size={17} />
                <p>
                  {t(
                    "Ссылайся на факты из своего питча. Не знаешь точного числа — скажи, как его проверишь.",
                    "Refer to facts from your pitch. Don’t know a number? Explain how you’ll find it.",
                  )}
                </p>
              </div>
            </>
          )}
        </aside>
      </div>
      {confirmExit && (
        <Modal
          onClose={() => setConfirmExit(false)}
          label={t("Выйти из питча", "Leave pitch")}
        >
          <div className="modal-eyebrow">
            <Mic size={17} />
            {t("МОЖНО ПОПРОБОВАТЬ СНОВА", "YOU CAN ALWAYS TRY AGAIN")}
          </div>
          <h2>{t("Покинуть арену?", "Leave the arena?")}</h2>
          <p className="modal-subtitle">
            {t(
              "Текст и этап сохранятся как черновик. Таймер продолжает идти. Аудиозапись после выхода недоступна.",
              "Your text and stage will be saved as a draft. The timer keeps running. The audio recording is not retained after exit.",
            )}
          </p>
          <div className="modal-actions">
            <button
              className="button white"
              onClick={() => setConfirmExit(false)}
            >
              {t("Продолжить", "Keep practicing")}
            </button>
            <button
              className="button dark"
              disabled={busy}
              onClick={async () => {
                await voice.stop();
                if (data.cloud) {
                  try {
                    await data.cloud.save(stateRef.current);
                  } catch (error) {
                    setSyncError(errorText(error, t));
                  }
                }
                onClose();
              }}
            >
              {t("Выйти из миссии", "Leave mission")}
              <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
