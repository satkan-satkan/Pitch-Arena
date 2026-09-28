import React from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Mic,
  Sparkles,
  Trophy,
  Globe2,
  Layers,
  MessageCircle,
  Play,
  Check,
} from "lucide-react";
import "./landing.css";
import LandingExperience from "./LandingExperience";
import { Reveal, Tilt, MotionControls } from "../motion/Motion";
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
  onGuide,
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
          <MotionControls t={t} />
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
          <Reveal className="landing-copy">
            <span className="landing-eyebrow">
              <span />
              {t(
                "ТРЕНИРОВКА ПЕРЕД НЕУДОБНЫМИ ВОПРОСАМИ",
                "REHEARSE THE UNCOMFORTABLE QUESTIONS",
              )}
            </span>
            <h1>
              {t("У тебя идея.", "You have an idea.")}
              <br />
              {t("У них —", "They have")}
              <br />
              <em>{t("вопросы.", "questions.")}</em>
            </h1>
            <p>
              {t(
                "Две минуты на питч. Потом — рынок, деньги и «почему именно вы?». Проверь свою историю до встречи, на которой ставки будут настоящими.",
                "Two minutes to pitch. Then it’s market, money and “why you?”. Test your story before the meeting where the stakes are real.",
              )}
            </p>
            <div className="landing-cta">
              <button
                className="button dark"
                onClick={account ? onPlay : () => onAuth(true)}
              >
                {account
                  ? t("Вернуться на сцену", "Back to the stage")
                  : t("Занять сцену", "Take the stage")}
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
          </Reveal>
          <Tilt className="landing-scene">
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
                    "Уверенность начинается с репетиции",
                    "Confidence starts with rehearsal",
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
          </Tilt>
        </section>
        <section className="landing-path">
          <p>
            {t(
              "ОДНА ИДЕЯ. РАЗНЫЕ УРОВНИ СКЕПСИСА.",
              "ONE IDEA. DIFFERENT LEVELS OF SKEPTICISM.",
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
        <LandingExperience t={t} onGuide={onGuide} />
        <Reveal as="section" id="how" className="landing-how">
          <div className="landing-section-heading">
            <span className="landing-eyebrow">
              {t("КАК ПРОХОДИТ РАУНД", "HOW THE ROUND WORKS")}
            </span>
            <h2>
              {t(
                "Питч. Вопросы. Работа над ошибками.",
                "Pitch. Questions. Revision.",
              )}
            </h2>
            <p>
              {t(
                "Слайды могут быть красивыми. Ответы тоже придётся подготовить.",
                "The deck can look great. You still need answers.",
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
        </Reveal>
        <Reveal as="section" className="landing-community">
          <div>
            <span className="landing-eyebrow">
              {t(
                "КОМАНДЫ / ПРОДУКТЫ / ПЕРВЫЕ КЛИЕНТЫ",
                "TEAMS / PRODUCTS / FIRST CUSTOMERS",
              )}
            </span>
            <h2>
              {t(
                "За питчем должен быть продукт.",
                "There should be a product behind the pitch.",
              )}
            </h2>
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
                {t("Твой продукт.", "Your product.")}
                <br />
                {t("Твоя команда.", "Your team.")}
              </strong>
            </div>
          </div>
        </Reveal>
        <Reveal as="section" className="landing-end">
          <span>✦</span>
          <h2>
            {t(
              "Лучше сложный вопрос здесь.",
              "Better to hear the hard question here.",
            )}
          </h2>
          <p>
            {t(
              "Чем неловкое молчание на настоящей встрече.",
              "Than sit in awkward silence at the real meeting.",
            )}
          </p>
          <button className="button dark" onClick={onPlay}>
            {t("Попробовать первую арену", "Try your first arena")}
            <ArrowRight size={18} />
          </button>
        </Reveal>
      </main>
      <footer className="landing-footer">
        <Brand small />
        <p>
          {t("Меньше хайпа. Больше аргументов.", "Less hype. More substance.")}
        </p>
        <button onClick={() => onAuth(false)}>{t("Аккаунт", "Account")}</button>
        <span>© {new Date().getFullYear()} Pitch Arena</span>
      </footer>
    </div>
  );
}
