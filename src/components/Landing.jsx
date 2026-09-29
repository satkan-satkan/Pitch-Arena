import React from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Globe2,
  Play,
  Mic,
  Layers,
  MessageCircle,
  Users,
} from "lucide-react";
import "./landing.css";
import LandingExperience from "./LandingExperience";
import { Reveal, Tilt, MotionControls } from "../motion/Motion";
export default function Landing({
  t,
  lang,
  setLang,
  Brand,
  onPlay,
  onAuth,
  onDirectory,
  account,
  onGuide,
}) {
  return (
    <div className="landing garage-landing">
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
            <Globe2 size={15} />
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
        <section className="landing-hero garage-hero">
          <Tilt className="garage-scene">
            <img
              className="garage-image"
              src="/scenes/garage-night.png"
              alt=""
              fetchPriority="high"
            />
            <div className="garage-shade" />
          </Tilt>
          <Reveal className="landing-copy">
            <span className="landing-eyebrow">
              <i />
              {t("СИМУЛЯТОР ЖИЗНИ ОСНОВАТЕЛЯ", "THE FOUNDER SIMULATOR")}
            </span>
            <h1>
              {t("Сначала гараж.", "First, the garage.")}
              <br />
              <em>{t("Потом — раунд.", "Then, the round.")}</em>
            </h1>
            <p>
              {t(
                "Собери команду. Объясни, зачем миру твой продукт. Выдержи вопросы людей, которые уже слышали «следующий миллиардный стартап».",
                "Build your team. Explain why your product should exist. Face people who have heard “the next billion-dollar startup” before.",
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
                <ArrowRight size={17} />
              </button>
              <button className="landing-guest" onClick={onPlay}>
                <Play size={14} />
                {t("Попробовать без регистрации", "Try without an account")}
              </button>
            </div>
            <div className="garage-caption">
              <span>01 / THE GARAGE</span>
              <span>
                {t(
                  "Дальше всё зависит от твоего питча.",
                  "What happens next depends on your pitch.",
                )}
              </span>
            </div>
          </Reveal>
          <div className="garage-time">
            <span>{t("ВРЕМЯ НА ПИТЧ", "TIME TO PITCH")}</span>
            <strong>02:00</strong>
            <small>
              {t("Потом слушаешь ты.", "Then it’s your turn to listen.")}
            </small>
          </div>
        </section>
        <section className="landing-path garage-route">
          <div>
            {[
              t("Свои люди", "Friends & family"),
              "nFactorial",
              t("Арена Единорогов", "Unicorn Arena"),
              "Y Combinator",
              "a16z",
            ].map((v, i) => (
              <React.Fragment key={v}>
                <span>
                  <small>0{i + 1}</small>
                  {v}
                </span>
                {i < 4 && <ArrowRight size={14} />}
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
              {t(
                "ОТКРЫТЬ ДЕК. СОБРАТЬСЯ. НАЧАТЬ.",
                "OPEN THE DECK. TAKE A BREATH. BEGIN.",
              )}
            </span>
            <h2>
              {t("Здесь можно переснять дубль.", "You get another take here.")}
            </h2>
            <p>
              {t(
                "На настоящей встрече этой кнопки не будет.",
                "The real meeting won’t have that button.",
              )}
            </p>
          </div>
          <div className="landing-steps">
            {[
              [
                Layers,
                t("Твой проект", "Your project"),
                t(
                  "Слайды, запрос и арена. Начни с того, что уже есть.",
                  "Your deck, ask and arena. Start with what you have.",
                ),
              ],
              [
                Mic,
                t("Твой питч", "Your pitch"),
                t(
                  "Говори или печатай. Сначала выступление, затем вопросы.",
                  "Speak or type. Your pitch first, questions afterwards.",
                ),
              ],
              [
                MessageCircle,
                t("Твои ответы", "Your answers"),
                t(
                  "Рынок, спрос, экономика. Найди слабый аргумент и попробуй ещё раз.",
                  "Market, demand, economics. Find the weak argument and try again.",
                ),
              ],
            ].map(([Icon, title, copy], i) => (
              <article key={title}>
                <div>
                  <Icon size={21} />
                  <span>0{i + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </Reveal>
        <Reveal as="section" className="landing-community garage-community">
          <div>
            <span className="landing-eyebrow">
              {t("СОБИРАЕМ КОМАНДУ", "ASSEMBLE THE TEAM")}
            </span>
            <h2>
              {t("Одному можно начать.", "You can start alone.")}
              <br />
              {t("Вместе — построить.", "Build it together.")}
            </h2>
            <p>
              {t(
                "Создай команду, пригласи участников и собери общую карточку стартапа. Личные тренировки остаются твоими.",
                "Create a team, invite members and build a shared startup profile. Personal practices stay yours.",
              )}
            </p>
            <button className="button white" onClick={onDirectory}>
              {t("Открыть каталог стартапов", "Explore the startup directory")}
              <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="crew-visual" aria-hidden="true">
            <div className="crew-chair">
              <Users size={54} strokeWidth={1} />
            </div>
            <span>CO-FOUNDERS WANTED.</span>
            <div className="crew-line" />
            <small>BUILD SOMETHING PEOPLE WANT.</small>
          </div>
        </Reveal>
        <Reveal as="section" className="landing-end">
          <span className="landing-eyebrow">TAKE 01</span>
          <h2>{t("Итак. Что ты строишь?", "So. What are you building?")}</h2>
          <p>
            {t(
              "Первый питч может быть неловким. Для этого мы здесь.",
              "The first pitch might be awkward. That’s why we’re here.",
            )}
          </p>
          <button className="button dark" onClick={onPlay}>
            {t("Попробовать первую арену", "Try your first arena")}
            <ArrowRight size={17} />
          </button>
        </Reveal>
      </main>
      <footer className="landing-footer">
        <Brand small />
        <p>{t("Репетиция перед реальностью.", "Rehearsal before reality.")}</p>
        <button onClick={() => onAuth(false)}>{t("Аккаунт", "Account")}</button>
        <span>© {new Date().getFullYear()} Pitch Arena</span>
      </footer>
    </div>
  );
}
