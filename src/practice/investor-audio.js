// One playback channel for prerecorded lines and the browser's neutral voice.
// Stopping invalidates pending play promises as well as active playback.
export function createInvestorAudio({
  createAudio = (src) => new Audio(src),
  synthesis = globalThis.speechSynthesis,
  createUtterance = (text) => new SpeechSynthesisUtterance(text),
} = {}) {
  let active = null;
  let revision = 0;
  const stop = () => {
    revision++;
    if (active) {
      active.onerror = null;
      active.onended = null;
      active.pause();
      active.removeAttribute("src");
      active.load();
      active = null;
    }
    synthesis?.cancel();
  };
  const play = ({ text, src, language, onError = () => {} }) => {
    stop();
    const token = revision;
    let failed = false;
    const fail = (error) => {
      if (revision !== token || failed) return;
      failed = true;
      // Never substitute a different voice after the player muted or moved on.
      stop();
      onError(error?.name === "NotAllowedError" ? "blocked" : "unavailable");
    };
    if (src) {
      try {
        const audio = createAudio(src);
        active = audio;
        audio.preload = "none";
        audio.onerror = fail;
        audio.onended = () => {
          if (revision === token) stop();
        };
        Promise.resolve(audio.play()).catch(fail);
      } catch (error) {
        fail(error);
      }
      return;
    }
    if (!synthesis) {
      fail();
      return;
    }
    try {
      const utterance = createUtterance(text);
      utterance.lang = language === "ru" ? "ru-RU" : "en-US";
      utterance.rate = 0.98;
      const voices = synthesis.getVoices();
      utterance.voice =
        voices.find((v) => v.lang.startsWith(language) && v.localService) ||
        voices.find((v) => v.lang.startsWith(language)) ||
        null;
      utterance.onerror = (event) => {
        if (!["interrupted", "canceled"].includes(event.error)) fail(event);
      };
      synthesis.speak(utterance);
    } catch (error) {
      fail(error);
    }
  };
  return { play, stop };
}
