import React from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Mic,
  Sparkles,
  Globe2,
  Layers,
  MessageCircle,
  Trophy,
  Play,
  Check,
} from "lucide-react";
import "./landing.css";
export default function Landing({
  t,
  lang,
  setLang,
  Brand,
  ArenaArt,
  onPlay,
  onAuth,
  onDirectory,
  account,
}) {
  return (
    <div className="landing">
      <header className="landing-nav">
        <a href="/" aria-label="Pitch Arena">
          <Brand />
        </a>
        <nav>
          <a href="#how">{t("Как играть", "How to play")}</a>
          <button onClick={onDirectory}>{t("Стартапы", "Startups")}</button>
        </nav>
        <div className="landing-controls">
          <button
            className="landing-language"
            aria-label={
              lang === "ru" ? "Switch to English" : "Переключить на русский"
            }
            onClick={() => setLang(lang === "ru" ? "en" : "ru")}
          >
            <Globe2 size={16} />
            {lang.toUpperCase()}
          </button>
          <button
            className="button white"
            onClick={account ? onPlay : () => onAuth(false)}
          >
            {account ? t("В игру", "Enter game") : t("Войти", "Sign in")}
          </button>
        </div>
      </header>
      <main>
        <section className="landing-hero">
          <div className="landing-copy">
            <span className="landing-eyebrow">
              <span />
              {t(
                "ТВОЙ ПЕРВЫЙ ШАГ К БОЛЬШОЙ СЦЕНЕ",
                "YOUR FIRST STEP TO THE BIG STAGE",
              )}
            </span>
            <h1>
              {t("Большие идеи", "Big ideas")}
              <br />
              {t("начинаются", "start with")}
              <br />
              <em>{t("с твоего голоса.", "your voice.")}</em>
            </h1>
            <p>
              {t(
                "Преврати волнение в уверенность. Питчь свой стартап, отвечай на непростые вопросы и расти от первой репетиции до венчурной арены.",
                "Turn nerves into confidence. Pitch your startup, answer tough questions and grow from your first rehearsal to the venture arena.",
              )}
            </p>
            <div className="landing-cta">
              <button
                className="button dark"
                onClick={account ? onPlay : () => onAuth(true)}
              >
                {account
                  ? t("Продолжить путь", "Continue your journey")
                  : t("Начать свой путь", "Start your journey")}
                <ArrowRight size={18} />
              </button>
              <button className="landing-guest" onClick={onPlay}>
                <Play size={16} />
                {t("Попробовать без регистрации", "Try without an account")}
              </button>
            </div>
            <div className="landing-points">
              <span>
                <Check size={13} />
                {t("Твой проект и слайды", "Your project & slides")}
              </span>
              <span>
                <Check size={13} />
                RU / EN
              </span>
              <span>
                <Check size={13} />
                {t("Вопросы после питча", "Questions after your pitch")}
              </span>
            </div>
          </div>
          <div className="landing-scene">
            <div className="scene-orbit orbit-one" />
            <div className="scene-orbit orbit-two" />
            <span className="scene-star star-one">✦</span>
            <span className="scene-star star-two">✧</span>
            <div className="scene-top-label">
              <span />
              {t("ТВОЯ СЛЕДУЮЩАЯ АРЕНА", "YOUR NEXT ARENA")}
            </div>
            <ArenaArt />
            <div className="scene-timer">
              <Mic size={20} />
              <div>
                <small>{t("ТВОЙ МОМЕНТ", "YOUR MOMENT")}</small>
                <strong>02:00</strong>
              </div>
              <div className="scene-wave">
                {[12, 23, 15, 31, 22, 37, 18, 28, 12].map((v, i) => (
                  <i key={i} style={{ height: v }} />
                ))}
              </div>
            </div>
            <div className="scene-feedback">
              <span>
                <Sparkles size={17} />
              </span>
              <div>
                <strong>
                  {t(
                    "Идея заслуживает быть услышанной",
                    "Your idea deserves to be heard",
                  )}
                </strong>
                <small>
                  {t(
                    "Начни с первой репетиции",
                    "Start with your first rehearsal",
                  )}
                </small>
              </div>
            </div>
            <div className="scene-level">
              <Trophy size={15} />
              {t("От идеи к единорогу", "From idea to unicorn")}
            </div>
          </div>
        </section>
        <section className="landing-path">
          <p>
            {t(
              "ОДИН ПИТЧ. КАЖДЫЙ РАЗ УВЕРЕННЕЕ.",
              "ONE PITCH. MORE CONFIDENT EACH TIME.",
            )}
          </p>
          <div>
            {[
              "Свои люди",
              "nFactorial",
              "Арена Единорогов",
              "Y Combinator",
              "a16z",
            ].map((v, i) => (
              <React.Fragment key={v}>
                <span className={i === 0 ? "first" : ""}>
                  <small>0{i + 1}</small>
                  {i === 0
                    ? t(v, "Friends & family")
                    : i === 2
                      ? t(v, "Unicorn Arena")
                      : v}
                </span>
                {i < 4 && <ArrowRight size={16} />}
              </React.Fragment>
            ))}
          </div>
          <small>
            {t(
              "Учебные симуляции. Реальные инвесторы не участвуют в тренировках.",
              "Learning simulations. Real investors do not participate in practice sessions.",
            )}
          </small>
        </section>
        <section id="how" className="landing-how">
          <div className="landing-section-heading">
            <span className="landing-eyebrow">
              {t(
                "ОТ «А ЧТО ЕСЛИ» ДО «Я ГОТОВ»",
                "FROM “WHAT IF” TO “I AM READY”",
              )}
            </span>
            <h2>
              {t("Репетируй. Ошибайся. Расти.", "Rehearse. Learn. Grow.")}
            </h2>
            <p>
              {t(
                "Место, где можно попробовать снова — и увидеть, что стало лучше.",
                "A place to try again, and see exactly what got better.",
              )}
            </p>
          </div>
          <div className="landing-steps">
            {[
              [
                Layers,
                "01",
                t("Принеси свою идею", "Bring your idea"),
                t(
                  "Выбери арену, загрузи слайды и задай цель. От тёплого разговора до сложной панели.",
                  "Choose an arena, upload your slides and set your goal. From a friendly conversation to a challenging panel.",
                ),
              ],
              [
                Mic,
                "02",
                t("Займи сцену", "Take the stage"),
                t(
                  "Твоё время говорить. Питчь голосом или текстом — вопросы начнутся после выступления.",
                  "Your time to speak. Pitch by voice or text. Questions begin after your presentation.",
                ),
              ],
              [
                MessageCircle,
                "03",
                t("Стань убедительнее", "Become more compelling"),
                t(
                  "Разбери ответы, найди слабые места и получи конкретную задачу для следующей попытки.",
                  "Review your answers, find gaps and get a concrete goal for your next attempt.",
                ),
              ],
            ].map(([Icon, n, title, text]) => (
              <article key={n}>
                <div>
                  <Icon size={23} />
                  <span>{n}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="landing-community">
          <div>
            <span className="landing-eyebrow">
              {t(
                "ЗА КАЖДОЙ КАРТОЧКОЙ — ЧЬЯ-ТО ИДЕЯ",
                "EVERY LISTING STARTS WITH AN IDEA",
              )}
            </span>
            <h2>{t("Строй не в одиночку.", "Build with your people.")}</h2>
            <p>
              {t(
                "Собери команду, расскажи о своём продукте и стань частью каталога стартапов. От первых набросков до работающего бизнеса.",
                "Build a team, share your product and join the startup directory. From early sketches to a working business.",
              )}
            </p>
            <button className="button white" onClick={onDirectory}>
              {t("Открыть каталог стартапов", "Explore the startup directory")}
              <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="community-orbit" aria-hidden="true">
            <span className="orbit-avatar a-one">✦</span>
            <span className="orbit-avatar a-two">↗</span>
            <span className="orbit-avatar a-three">◒</span>
            <div>
              <Globe2 size={34} />
              <strong>
                {t("Твоя команда.", "Your team.")}
                <br />
                {t("Твоя история.", "Your story.")}
              </strong>
            </div>
          </div>
        </section>
        <section className="landing-end">
          <span>✦</span>
          <h2>
            {t(
              "Следующий большой питч — твой.",
              "The next great pitch is yours.",
            )}
          </h2>
          <p>
            {t(
              "Не обязательно быть готовым. Достаточно начать.",
              "You do not have to be ready. You just have to start.",
            )}
          </p>
          <button className="button dark" onClick={onPlay}>
            {t("Попробовать первую арену", "Try your first arena")}
            <ArrowRight size={18} />
          </button>
        </section>
      </main>
      <footer className="landing-footer">
        <Brand small />
        <p>{t("Идеям нужен голос.", "Ideas need a voice.")}</p>
        <button onClick={() => onAuth(false)}>{t("Аккаунт", "Account")}</button>
        <span>© {new Date().getFullYear()} Pitch Arena</span>
      </footer>
    </div>
  );
}
