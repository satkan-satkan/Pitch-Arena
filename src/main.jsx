import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Flame,
  Globe2,
  Headphones,
  LayoutDashboard,
  Lightbulb,
  LockKeyhole,
  Menu,
  Mic,
  MicOff,
  MoreHorizontal,
  Play,
  Plus,
  Radio,
  Rocket,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  UploadCloud,
  Users,
  UserRound,
  Video,
  X,
  Zap,
  FileText,
  Trash2,
  Volume2,
  StopCircle,
  Home,
  BarChart3,
} from "lucide-react";
import "./styles.css";

import {
  arenas,
  investors,
  photo,
  panelFor,
  totalXP,
  nextArena,
  medalsFor,
} from "./game-data";
import { JourneyMap, QuestStrip, TrophyShelf } from "./JourneyMap";
import PitchRoom from "./PitchRoom";
import Results from "./components/Results";
import BackgroundMusic from "./components/BackgroundMusic";
import AccountPanel from "./components/AccountPanel";
import useWorkspace from "./hooks/useWorkspace";
import { api, hydrateSession, sessionClient, errorText } from "./services/api";

import { summarizeScores } from "./practice/engine";
import { PracticeGoal } from "./components/PracticeFeedback";
const seedRanking = [
  {
    name: "Lumio",
    description: "AI workspace",
    initial: "L",
    color: "purple",
    score: 984,
    change: 3,
  },
  {
    name: "Rootly",
    description: "Climate tech",
    initial: "r",
    color: "green",
    score: 956,
    change: 1,
  },
  {
    name: "Finch",
    description: "Personal finance",
    initial: "f",
    color: "orange",
    score: 932,
    change: 2,
  },
  {
    name: "Orbit",
    description: "Future of work",
    initial: "o",
    color: "blue",
    score: 908,
    change: 5,
  },
  {
    name: "Nectar",
    description: "Health tech",
    initial: "n",
    color: "pink",
    score: 885,
    change: 2,
  },
];
const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
function Brand({ small = false }) {
  return (
    <div className={`brand ${small ? "small" : ""}`}>
      <div className="brand-icon">
        <span />
        <i />
      </div>
      <span>
        pitch<span className="brand-light">arena</span>
        <sup>✦</sup>
      </span>
    </div>
  );
}
function ArenaArt() {
  return (
    <svg
      className="arena-art"
      viewBox="0 0 620 400"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="base"
          x1="150"
          y1="160"
          x2="450"
          y2="360"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#eee8ff" />
          <stop offset="1" stopColor="#a895d9" />
        </linearGradient>
        <linearGradient
          id="screen"
          x1="244"
          y1="59"
          x2="458"
          y2="240"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fcfaff" />
          <stop offset="1" stopColor="#d8cef0" />
        </linearGradient>
        <linearGradient
          id="floor"
          x1="50"
          y1="190"
          x2="520"
          y2="330"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f7f3ff" />
          <stop offset="1" stopColor="#c9bae7" />
        </linearGradient>
        <linearGradient id="front" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#a28acc" />
          <stop offset="1" stopColor="#b9a6dc" />
        </linearGradient>
        <filter id="shadow">
          <feGaussianBlur stdDeviation="13" />
        </filter>
        <filter id="softshadow" x="-30%" y="-30%" width="170%" height="170%">
          <feDropShadow
            dx="0"
            dy="9"
            stdDeviation="9"
            floodColor="#705898"
            floodOpacity=".14"
          />
        </filter>
        <pattern
          id="grid"
          width="45"
          height="26"
          patternUnits="userSpaceOnUse"
          patternTransform="matrix(1 .52 -1 .52 340 -30)"
        >
          <path d="M45 0H0V26" stroke="#ab9bc9" strokeWidth=".55" />
        </pattern>
      </defs>
      <path fill="url(#grid)" opacity=".28" d="M0 0h620v400H0z" />
      <ellipse
        cx="337"
        cy="332"
        rx="202"
        ry="35"
        fill="#8b72b1"
        opacity=".15"
        filter="url(#shadow)"
      />
      <path d="M92 258L322 138L554 258V282L323 403L92 282Z" fill="url(#base)" />
      <path d="M92 258L322 138L554 258L323 379Z" fill="url(#floor)" />
      <path d="M92 258L323 379V403L92 282Z" fill="#c4b3df" />
      <path d="M323 379L554 258V282L323 403Z" fill="#b7a4d6" />
      <path
        d="M113 244L319 137L528 245L320 354Z"
        fill="#e7def7"
        stroke="#f5efff"
      />
      <path
        d="M136 231L319 137L506 233L321 330Z"
        fill="#eae2f8"
        stroke="#f9f5ff"
      />
      <path
        d="M159 219L319 136L483 221L321 306Z"
        fill="#f3edfc"
        stroke="#fff"
      />
      <path
        d="M229 189V58Q229 50 237 54L435 157Q443 161 443 170V296L229 189Z"
        fill="#a78eca"
      />
      <path d="M239 184V67L431 166V283L239 184Z" fill="url(#screen)" />
      <path d="M258 174V91L409 169V252L258 174Z" fill="#f6f2ff" />
      <path d="M278 162L294 170V151L278 143Z" fill="#cbbbef" />
      <path d="M303 175L319 183V146L303 138Z" fill="#b29ade" />
      <path d="M328 188L344 196V139L328 131Z" fill="#9374d0" />
      <path d="M353 201L369 209V124L353 116Z" fill="#7852b7" />
      <path
        d="M278 123L306 123L332 115L369 112"
        stroke="#8062bf"
        strokeWidth="2.5"
      />
      <path d="M361 104L372 111L367 120" stroke="#8062bf" strokeWidth="2.5" />
      <path d="M172 235L230 205L288 235V254L230 284L172 254Z" fill="#bca6d9" />
      <path d="M172 235L230 205L288 235L230 265Z" fill="#faf7ff" />
      <path d="M230 265L288 235V254L230 284Z" fill="#a58bc8" />
      <path
        d="M222 223V179Q217 175 219 170L228 162L240 168L242 203L250 224L242 229L229 204L231 227Z"
        fill="#473552"
      />
      <path
        d="M225 227L218 232L224 235L235 230M243 229L249 234L257 230L250 225"
        fill="#2d243a"
      />
      <path
        d="M218 175Q213 181 216 190L204 184L201 189L220 200Q226 196 227 186L234 174"
        fill="#716185"
      />
      <ellipse cx="231" cy="155" rx="9" ry="12" fill="#c58fa1" />
      <path
        d="M222 155Q218 137 232 142Q244 144 239 155L235 150L222 155Z"
        fill="#3e304d"
      />
      <g filter="url(#softshadow)">
        <path
          d="M300 264L323 252L346 264V290L323 302L300 290Z"
          fill="#8f76b6"
        />
        <path d="M300 264L323 252L346 264L323 276Z" fill="#bdabd9" />
        <path
          d="M313 252V239Q312 224 322 220Q333 218 336 231L337 253L324 261Z"
          fill="#463753"
        />
        <ellipse cx="324" cy="214" rx="8" ry="10" fill="#d5a9a0" />
        <path
          d="M316 214Q312 202 322 203Q335 201 332 214L326 209Z"
          fill="#5a4259"
        />
      </g>
      <g transform="translate(65 -35)">
        <path
          d="M300 264L323 252L346 264V290L323 302L300 290Z"
          fill="#9a81bf"
        />
        <path d="M300 264L323 252L346 264L323 276Z" fill="#c5b3e0" />
        <path
          d="M313 252V239Q312 224 322 220Q333 218 336 231L337 253L324 261Z"
          fill="#8c739c"
        />
        <ellipse cx="324" cy="214" rx="8" ry="10" fill="#e5bca8" />
        <path
          d="M316 215Q309 199 323 201Q338 201 333 224L329 218L326 210Z"
          fill="#4c394a"
        />
      </g>
      <g transform="translate(59 32)">
        <path
          d="M300 264L323 252L346 264V290L323 302L300 290Z"
          fill="#9e85c3"
        />
        <path d="M300 264L323 252L346 264L323 276Z" fill="#cdbde3" />
        <path
          d="M313 252V239Q312 224 322 220Q333 218 336 231L337 253L324 261Z"
          fill="#d4c5e6"
        />
        <ellipse cx="324" cy="214" rx="8" ry="10" fill="#af7982" />
        <path
          d="M316 214Q312 202 322 202Q335 201 332 214L326 209Z"
          fill="#342d42"
        />
      </g>
      <g filter="url(#softshadow)">
        <rect
          x="422"
          y="75"
          width="125"
          height="58"
          rx="14"
          fill="white"
          transform="rotate(8 422 75)"
        />
        <circle cx="446" cy="106" r="13" fill="#e9f3db" />
        <path
          d="M439 107L444 112L451 101"
          stroke="#709944"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M469 103L524 111M468 113L506 119"
          stroke="#c8bddb"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
      <g filter="url(#softshadow)" transform="rotate(-9 151 104)">
        <rect x="104" y="73" width="94" height="52" rx="14" fill="white" />
        <path
          d="M123 103L131 92L139 103L149 86"
          stroke="#8e72cb"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text x="157" y="105" fontSize="17" fontWeight="700" fill="#594676">
          +24
        </text>
      </g>
      <path
        d="M487 183L489 173L492 182L502 185L492 188L489 197L487 188L478 185Z"
        fill="#a98cd8"
      />
      <path
        d="M169 161L171 154L173 161L180 163L173 165L171 172L169 165L162 163Z"
        fill="#a88bcc"
      />
      <circle cx="516" cy="311" r="3" fill="#b9a3d7" />
    </svg>
  );
}
function FamilyArt() {
  return (
    <svg viewBox="0 0 420 168" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="fam" x2="1" y2="1">
          <stop stopColor="#f0e7da" />
          <stop offset="1" stopColor="#dfd0bc" />
        </linearGradient>
      </defs>
      <rect width="420" height="168" fill="url(#fam)" />
      <circle cx="220" cy="49" r="71" fill="#f6efe5" opacity=".6" />
      <rect x="47" y="22" width="68" height="67" rx="3" fill="#e2d2bc" />
      <rect x="52" y="27" width="58" height="57" rx="1" fill="#f7f1e7" />
      <path d="M54 75L72 51L89 64L100 47L108 74" fill="#d2c0a6" />
      <path d="M338 63V136" stroke="#84785f" strokeWidth="3" />
      <path d="M315 67L326 34H351L363 67Z" fill="#fffbf0" />
      <ellipse
        cx="224"
        cy="151"
        rx="150"
        ry="15"
        fill="#cbb9a1"
        opacity=".35"
      />
      <rect x="103" y="98" width="211" height="44" rx="12" fill="#a69681" />
      <rect x="111" y="81" width="90" height="53" rx="15" fill="#b9a892" />
      <rect x="209" y="81" width="90" height="53" rx="15" fill="#b9a892" />
      <rect x="94" y="107" width="20" height="34" rx="8" fill="#b6a18a" />
      <rect x="297" y="107" width="20" height="34" rx="8" fill="#b6a18a" />
      <path d="M113 141V150M296 141V150" stroke="#81705e" strokeWidth="5" />
      <ellipse cx="168" cy="75" rx="13" ry="15" fill="#c99273" />
      <path
        d="M155 75Q149 52 168 55Q184 53 182 76L175 65L155 71"
        fill="#5d4c43"
      />
      <path d="M150 119L148 91Q165 79 183 90L190 120" fill="#eee9dd" />
      <path
        d="M153 120L152 143L165 146L174 124L181 146L194 144L188 119"
        fill="#756d61"
      />
      <ellipse cx="248" cy="73" rx="12" ry="15" fill="#ddb493" />
      <path
        d="M236 72Q228 47 249 51Q270 52 262 86L254 74L251 63L236 70"
        fill="#765947"
      />
      <path d="M232 119L231 90Q246 79 263 90L267 119" fill="#b68366" />
      <path
        d="M233 120L225 144L239 147L249 127L257 145L270 143L265 117"
        fill="#e9ddd0"
      />
      <ellipse cx="211" cy="140" rx="47" ry="9" fill="#ccad87" />
      <path
        d="M176 142L171 164M243 143L248 164"
        stroke="#997b59"
        strokeWidth="4"
      />
      <rect x="200" y="124" width="13" height="12" rx="3" fill="#f6f1e6" />
      <path d="M214 126Q223 124 219 132H214" stroke="#f6f1e6" strokeWidth="2" />
      <path d="M357 129V112" stroke="#7c8061" strokeWidth="2" />
      <path
        d="M356 119Q337 111 342 101Q356 100 356 119M356 112Q357 92 369 95Q374 109 356 112"
        fill="#91947a"
      />
      <path d="M346 127H367L364 146H349Z" fill="#d3b697" />
    </svg>
  );
}
function SharkArt() {
  return (
    <svg viewBox="0 0 420 168" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="sea" x2="0" y2="1">
          <stop stopColor="#42656b" />
          <stop offset=".5" stopColor="#22464e" />
          <stop offset="1" stopColor="#17353c" />
        </linearGradient>
        <radialGradient id="light">
          <stop stopColor="#96bbc0" stopOpacity=".38" />
          <stop offset="1" stopColor="#49767f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="420" height="168" fill="url(#sea)" />
      <ellipse cx="230" cy="23" rx="260" ry="132" fill="url(#light)" />
      <path
        d="M54 0L119 167H141L93 0M184 0L206 168H236L220 0M322 0L292 168H311L363 0"
        fill="#9ac7cb"
        opacity=".045"
      />
      <path
        d="M108 126Q143 102 194 104L219 54Q230 83 240 101Q275 102 315 120L344 102L337 129L349 152L312 137Q249 150 195 139L165 154L174 135Q141 137 108 126Z"
        fill="#102e35"
      />
      <path d="M196 105L219 56L214 109" fill="#19373d" />
      <path
        d="M105 49Q183 36 245 49M279 27L352 32M25 83L101 77"
        stroke="#b5d0d0"
        opacity=".1"
      />
      <circle cx="289" cy="121" r="1.8" fill="#a3bebd" />
      <path
        d="M293 128L291 135M299 128L297 134M305 127L303 132"
        stroke="#597780"
        opacity=".6"
      />
    </svg>
  );
}
function Scene({ kind }) {
  if (kind === "family") return <FamilyArt />;
  if (kind === "sharks") return <SharkArt />;
  return (
    <div className={`scene-logo ${kind}`}>
      {kind === "nfactorial" ? (
        <>
          <span>n!</span>
          <small>BUILD SOMETHING REAL</small>
        </>
      ) : kind === "yc" ? (
        <span>Y</span>
      ) : kind === "arena" ? (
        <>
          <img className="arena-oskar" src="/portraits/oskar.jpg" alt="" />
          <span className="arena-a">✦</span>
          <small>UNICORN ARENA</small>
        </>
      ) : kind === "a16z" ? (
        <span>a16z</span>
      ) : kind === "dubai" ? (
        <>
          <Globe2 size={56} />
          <small>DUBAI ANGELS</small>
        </>
      ) : (
        <>
          <span>eu.</span>
          <small>EUROPEAN ANGELS</small>
        </>
      )}
    </div>
  );
}
function App() {
  const [lang, setLang] = useState(() => read("pa-lang", "ru"));
  const t = (ru, en) => (lang === "ru" ? ru : en);
  const pick = (a) => a[lang === "ru" ? 0 : 1];
  const [page, setPage] = useState("home");
  const [mobile, setMobile] = useState(false);
  const [region, setRegion] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [search, setSearch] = useState("");
  const workspace = useWorkspace();
  const [accountOpen, setAccountOpen] = useState(false);
  const [launchBusy, setLaunchBusy] = useState(false);
  const [guestDraft, setGuestDraft] = useState(() => read("pa-draft", null));
  const [guestProfile, setGuestProfile] = useState(() =>
    read("pa-profile", {
      name: "",
      startup: "Мой стартап",
      industry: "SaaS & AI",
      bio: "",
    }),
  );
  const [guestHistory, setGuestHistory] = useState(() =>
    read("pa-history", []),
  );
  const profile = workspace.account?.profile || guestProfile;
  const history = workspace.account ? workspace.history : guestHistory;
  const activeProject = workspace.projects.find(
    (p) => p.id === workspace.activeProjectId,
  );
  const savedDraft = workspace.account ? workspace.draft : guestDraft;
  const setProfile = async (next) => {
    if (!workspace.account) {
      setGuestProfile(next);
      return true;
    }
    try {
      await api("/profile", { method: "PUT", data: next });
      workspace.setAccount((user) => ({ ...user, profile: next }));
      return true;
    } catch (error) {
      setToast(errorText(error, t));
      return false;
    }
  };
  const [selected, setSelected] = useState(null);
  const [retry, setRetry] = useState(null);
  const [session, setSession] = useState(null);
  const [result, setResult] = useState(null);
  const [help, setHelp] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => {
    localStorage.setItem("pa-lang", JSON.stringify(lang));
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(
    () => localStorage.setItem("pa-profile", JSON.stringify(guestProfile)),
    [guestProfile],
  );
  useEffect(
    () => localStorage.setItem("pa-history", JSON.stringify(guestHistory)),
    [guestHistory],
  );
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3600);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") {
        setSelected(null);
        setRetry(null);
        setHelp(false);
        setNotifications(false);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const go = (p) => {
    setPage(p);
    setMobile(false);
    setSearch("");
    window.scrollTo(0, 0);
  };
  const complete = (data) => {
    const prior = medalsFor(history)
      .filter((m) => m.earned)
      .map((m) => m.id);
    const record = data.serverVerified
      ? data
      : {
          ...data,
          id: data.id || crypto.randomUUID(),
          date: new Date().toISOString(),
        };
    if (!data.serverVerified)
      record.newMedals = medalsFor([record, ...history]).filter(
        (m) => m.earned && !prior.includes(m.id),
      );
    if (workspace.account) {
      workspace.setHistory((h) => [
        record,
        ...h.filter((r) => r.id !== record.id),
      ]);
      workspace.setDraft(null);
      localStorage.removeItem(`pa-draft:${workspace.account.id}`);
    } else {
      setGuestHistory((h) => [record, ...h.filter((r) => r.id !== record.id)]);
      setGuestDraft(null);
      localStorage.removeItem("pa-draft");
    }
    setSession(null);
    setResult(record);
    setPage("history");
  };
  const draftKey = workspace.account
    ? `pa-draft:${workspace.account.id}`
    : "pa-draft";
  const launch = async (data) => {
    setLaunchBusy(true);
    try {
      if (savedDraft) throw new Error("DRAFT_EXISTS");
      if (workspace.account) {
        let projectId = data.projectId;
        if (!projectId) {
          const p = await api("/projects", {
            method: "POST",
            data: { name: data.startup, industry: profile.industry },
          });
          projectId = p.id;
        }
        const snap = await api("/sessions", {
          method: "POST",
          data: {
            projectId,
            arenaId: data.arena.id,
            ask: data.ask,
            pitchSeconds: data.pitchSeconds,
            language: lang,
            spokenQuestions: data.spokenQuestions,
            useAI: data.useAI,
            practiceGoal: data.practiceGoal || null,
          },
        });
        const cloud = sessionClient(snap);
        try {
          for (const file of data.files)
            await cloud.call("assets", file, "POST", {
              raw: true,
              headers: {
                "If-Match": String(cloud.snapshot.revision),
                "Content-Type": file.type,
                "X-File-Name": encodeURIComponent(file.name),
              },
            });
        } catch (error) {
          workspace.setDraft(cloud.snapshot);
          throw error;
        }
        workspace.setDraft(cloud.snapshot);
        setSession({
          ...data,
          id: snap.id,
          projectId,
          cloud,
          draftKey,
          restored: cloud.snapshot.state,
        });
      } else setSession({ ...data, id: crypto.randomUUID(), draftKey });
      setSelected(null);
      setRetry(null);
    } finally {
      setLaunchBusy(false);
    }
  };
  const resumeDraft = async () => {
    setLaunchBusy(true);
    try {
      if (workspace.account) {
        const snap = await api(`/sessions/${savedDraft.id}`);
        const data = await hydrateSession(snap);
        const local = read(draftKey, null);
        if (local?.id === snap.id && local.revision === snap.revision) {
          data.restored = {
            ...data.restored,
            pitch: local.state.pitch,
            answer: local.state.answer,
            slide: local.state.slide,
          };
        }
        setLang(snap.config.language);
        setSession({
          ...data,
          arena: arenas.find((a) => a.id === data.arenaId),
          draftKey,
          resuming: true,
        });
      } else {
        setLang(savedDraft.config.language || lang);
        setSession({
          ...savedDraft.config,
          id: savedDraft.id,
          arena: arenas.find((a) => a.id === savedDraft.config.arenaId),
          files: [],
          restored: savedDraft.state,
          startedAt: savedDraft.startedAt,
          deadline: savedDraft.deadline,
          draftKey,
          resuming: true,
        });
      }
    } catch (error) {
      setToast(errorText(error, t));
    } finally {
      setLaunchBusy(false);
    }
  };
  const discardDraft = async () => {
    try {
      if (workspace.account) {
        const snap = await api(`/sessions/${savedDraft.id}`);
        await sessionClient(snap).call("", {}, "DELETE");
        workspace.setDraft(null);
      } else setGuestDraft(null);
      localStorage.removeItem(draftKey);
    } catch (error) {
      setToast(errorText(error, t));
    }
  };
  const leaveSession = async () => {
    setSession(null);
    if (workspace.account) {
      try {
        await workspace.refresh();
      } catch (error) {
        setToast(errorText(error, t));
      }
    } else setGuestDraft(read("pa-draft", null));
  };
  const { average } = summarizeScores(history);
  const nav = [
    { id: "home", icon: Globe2, label: t("Моё приключение", "My adventure") },
    { id: "arenas", icon: Mic, label: t("Карта и арены", "Map & arenas") },
    { id: "investors", icon: Users, label: t("Инвесторы", "Investors") },
    {
      id: "history",
      icon: BarChart3,
      label: t("Мои выступления", "My pitches"),
    },
    {
      id: "leaderboard",
      icon: Trophy,
      label: t("Рейтинг стартапов", "Leaderboard"),
    },
  ];
  const filtered = arenas.filter(
    (a) =>
      (region === "all" || a.region === region || a.region === "all") &&
      (difficulty === "all" ||
        (difficulty === "easy" ? a.level <= 2 : a.level >= 3)) &&
      pick(a.title).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="app-shell">
      {mobile && (
        <div className="sidebar-scrim" onClick={() => setMobile(false)} />
      )}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <a
          className="brand-link"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("home");
          }}
        >
          <Brand />
        </a>
        <div className="workspace">
          <div className="workspace-icon">
            <Rocket size={18} />
          </div>
          <div>
            <strong>{t("Путь основателя", "Founder journey")}</strong>
            <span>
              {t(
                "Сезон 01 · От идеи к единорогу",
                "Season 01 · Becoming a unicorn",
              )}
            </span>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-label">
          {t("ТВОЁ ПРИКЛЮЧЕНИЕ", "YOUR ADVENTURE")}
        </div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${page === n.id ? "active" : ""}`}
              onClick={() => go(n.id)}
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              {n.id === "arenas" && (
                <span className="nav-count">{arenas.length}</span>
              )}
              {n.id === "leaderboard" && <span className="live-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="practice-tip">
            <div className="tip-icon">
              <Sparkles size={18} />
            </div>
            <strong>{t("Идеям нужен голос", "Give your ideas a voice")}</strong>
            <p>
              {t(
                "Первый питч не обязан быть идеальным. Просто начни.",
                "Your first pitch doesn’t have to be perfect. Just start.",
              )}
            </p>
            <button onClick={() => setSelected(arenas[0])}>
              {t("Попробовать питч", "Try a practice pitch")}
              <ArrowUpRight size={15} />
            </button>
          </div>
          <button className="nav-item help-link" onClick={() => setHelp(true)}>
            <CircleHelp size={19} />
            <span>{t("Как это работает", "How it works")}</span>
            <ArrowUpRight size={15} />
          </button>
          <button
            className="profile-button"
            disabled={workspace.checking}
            onClick={() =>
              workspace.account ? go("profile") : setAccountOpen(true)
            }
          >
            <div className="user-avatar">
              {workspace.account ? (
                profile.name.slice(0, 1)
              ) : (
                <UserRound size={18} />
              )}
            </div>
            <div>
              <strong>
                {workspace.checking
                  ? t("Проверяем вход…", "Checking sign-in…")
                  : workspace.account
                    ? profile.name
                    : t("Гостевой режим", "Guest mode")}
              </strong>
              <span>
                {workspace.account
                  ? t("Будущий единорог", "Future unicorn")
                  : t("Прогресс в этом браузере", "Progress in this browser")}
              </span>
            </div>
            <MoreHorizontal size={18} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Menu"
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </button>
            <span>
              {t("Твой путь к инвестициям", "Your journey to investment")}
            </span>
            <ChevronRight size={13} />
            <strong>
              {nav.find((n) => n.id === page)?.label ||
                t("Мой профиль", "My profile")}
            </strong>
          </div>
          <div className="topbar-actions">
            <BackgroundMusic blocked={Boolean(session)} t={t} />
            <button
              className="account-entry"
              disabled={workspace.checking}
              onClick={() => setAccountOpen(true)}
            >
              {workspace.checking
                ? t("Проверяем вход…", "Checking sign-in…")
                : workspace.account
                  ? t("Аккаунт", "Account")
                  : t("Войти", "Sign in")}
            </button>
            <span className="status-dot" />
            <span className="practice-mode">
              {`${totalXP(history)} XP · ${t("Уровень", "Level")} ${Math.floor(totalXP(history) / 500) + 1}`}
            </span>
            <span className="topbar-divider" />
            <button
              className="language"
              onClick={() => setLang(lang === "ru" ? "en" : "ru")}
              aria-label={t("Switch to English", "Переключить на русский")}
            >
              <Globe2 size={16} />
              {lang.toUpperCase()}
              <ChevronDown size={12} />
            </button>
            <div className="notification-wrap">
              <button
                className="icon-button notification-button"
                onClick={() => setNotifications(!notifications)}
                aria-label={t("Уведомления", "Notifications")}
              >
                <Bell size={19} />
                <i />
              </button>
              {notifications && (
                <div className="notification-pop">
                  <strong>
                    {t(
                      "Всё готово к первому питчу",
                      "Ready for your first pitch",
                    )}
                  </strong>
                  <p>
                    {t(
                      "Выбери арену и сделай первый шаг. Здесь можно ошибаться и пробовать снова.",
                      "Pick an arena and take the first step. This is a place to experiment and try again.",
                    )}
                  </p>
                  <button
                    onClick={() => {
                      setNotifications(false);
                      setSelected(arenas[0]);
                    }}
                  >
                    {t("Начать тренировку", "Start practicing")}
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
            {workspace.account && (
              <button
                className="user-avatar top-avatar"
                onClick={() => go("profile")}
                aria-label={t("Мой профиль", "My profile")}
              >
                {profile.name.slice(0, 1)}
              </button>
            )}
          </div>
        </header>
        <main>
          {savedDraft && !session && (
            <section className="resume-banner">
              <div>
                <strong>
                  {t("Продолжим тренировку?", "Continue your practice?")}
                </strong>
                <p>
                  {savedDraft.config?.startup} ·{" "}
                  {t(
                    "Текст и этап сохранены. Таймер идёт по реальному времени.",
                    "Your text and stage are saved. The timer follows real time.",
                  )}
                </p>
              </div>
              <button
                className="button dark"
                disabled={launchBusy}
                onClick={resumeDraft}
              >
                {t("Продолжить питч", "Resume pitch")}
              </button>
              <button className="button white" onClick={discardDraft}>
                {t("Удалить черновик", "Discard draft")}
              </button>
            </section>
          )}

          {page === "home" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {t(
                      "СЕЗОН 01 · ПРИКЛЮЧЕНИЕ ОСНОВАТЕЛЯ",
                      "SEASON 01 · A FOUNDER’S ADVENTURE",
                    )}
                    <span className="tiny-spark">✧</span>
                  </div>
                  <h1>
                    {t("От идеи до единорога.", "From idea to unicorn.")}{" "}
                    <span className="wave">✺</span>
                  </h1>
                  <p>
                    {t(
                      "Открывай мир, проходи арены и превращай смелость в опыт.",
                      "Explore the world, take on arenas, and turn courage into experience.",
                    )}
                  </p>
                </div>
                <button
                  className="button white small"
                  onClick={() => go("history")}
                >
                  <Clock3 size={16} />
                  {t("Мои выступления", "My pitches")}
                </button>
              </div>
              <section className="hero-grid">
                <div className="hero">
                  <div className="hero-content">
                    <div className="hero-pill">
                      <span />{" "}
                      {t("СЛЕДУЮЩАЯ МИССИЯ ЖДЁТ", "YOUR NEXT MISSION AWAITS")}
                    </div>
                    <h2>
                      {t("Большая идея.", "One big idea.")}
                      <br />
                      {t("Большое приключение.", "A bigger adventure.")}
                    </h2>
                    <p>
                      {t(
                        "От разговора на кухне до сделки с инвестором.\nРепетируй здесь. Удивляй в реальности.",
                        "From a kitchen conversation to your first investment.\nPractice here. Make an impression out there.",
                      )}
                    </p>
                    <button
                      className="button dark"
                      onClick={() => setSelected(nextArena(history))}
                    >
                      {history.length
                        ? t("Продолжить путь", "Continue journey")
                        : t("Начать приключение", "Start my adventure")}
                      <ArrowUpRight size={18} />
                    </button>
                    <div className="hero-footnote">
                      <span className="mini-avatars">
                        <img src={photo(investors[0].photo, 60)} alt="" />
                        <img src={photo(investors[1].photo, 60)} alt="" />
                        <img src={photo(investors[2].photo, 60)} alt="" />
                      </span>
                      <span>
                        {t(
                          "Без риска. С настоящим прогрессом.",
                          "Zero pressure. Real progress.",
                        )}
                      </span>
                    </div>
                  </div>
                  <ArenaArt />
                  <div className="hero-corner">PRACTICE MAKES PROGRESS ↗</div>
                </div>
                <div className="progress-card">
                  <div className="card-topline">
                    <span>{t("Твой прогресс", "Your progress")}</span>
                    <TrendingUp size={18} />
                  </div>
                  <div className="progress-main">
                    <div
                      className="progress-ring"
                      style={{
                        "--progress": `${(totalXP(history) % 500) / 5}%`,
                      }}
                    >
                      <div>
                        <Rocket size={25} />
                      </div>
                      <span className="level-orbit">
                        {Math.floor(totalXP(history) / 500) + 1}
                      </span>
                    </div>
                    <h3>
                      {history.length >= 5
                        ? t("На пути к звёздам", "Rising star")
                        : t("Начинающий основатель", "Aspiring founder")}
                    </h3>
                    <p>
                      {t(
                        "Каждый питч — шаг вперёд",
                        "Every pitch is a step forward",
                      )}
                    </p>
                  </div>
                  <div className="xp-row">
                    <span>
                      {totalXP(history)} <span>XP</span>
                    </span>
                    <span>
                      {(Math.floor(totalXP(history) / 500) + 1) * 500} XP
                    </span>
                  </div>
                  <div className="xp-track">
                    <span
                      style={{ width: `${(totalXP(history) % 500) / 5}%` }}
                    />
                  </div>
                  <div className="progress-divider" />
                  <div className="progress-stat">
                    <span>
                      <Mic size={15} />
                      {t("Выступлений", "Pitches completed")}
                    </span>
                    <strong>
                      {history.length.toString().padStart(2, "0")}
                    </strong>
                  </div>
                  <div className="progress-stat">
                    <span>
                      <Target size={15} />
                      {t("Средний балл", "Average score")}
                    </span>
                    <strong>{average !== null ? `${average}/100` : "—"}</strong>
                  </div>
                  <button
                    className="progress-link"
                    onClick={() => go("profile")}
                  >
                    {t("Посмотреть мой профиль", "View my profile")}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </section>
              <QuestStrip
                history={history}
                t={t}
                pick={pick}
                onSelect={setSelected}
              />
              <div className="section-heading">
                <div className="section-title">
                  <h2>{t("Карта твоего приключения", "Your adventure map")}</h2>
                  <span className="count-badge">{arenas.length}</span>
                </div>
                <button className="text-button" onClick={() => go("arenas")}>
                  {t("Все арены", "All arenas")}
                  <ArrowRight size={16} />
                </button>
              </div>
              <JourneyMap
                history={history}
                t={t}
                pick={pick}
                onSelect={setSelected}
              />
              <TrophyShelf history={history} t={t} pick={pick} />
              <div className="bottom-grid">
                <section className="investor-section">
                  <div className="section-heading">
                    <div className="section-title">
                      <h2>{t("По ту сторону стола", "Across the table")}</h2>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => go("investors")}
                    >
                      {t("Все инвесторы", "All investors")}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                  <p className="section-subtitle">
                    {t(
                      "Разные характеры. Непростые вопросы. Твоя практика.",
                      "Different personalities. Tough questions. Your practice.",
                    )}
                  </p>
                  <div className="investor-mini-grid">
                    {investors.slice(0, 3).map((v, i) => (
                      <button
                        className="investor-mini"
                        key={i}
                        onClick={() =>
                          setSelected({
                            ...arenas.find((a) => a.id === v.arenaId),
                            personaIds: [v.id],
                            title: v.name,
                            panel: [pick(v.name)],
                            level: v.level,
                          })
                        }
                      >
                        <div className={`investor-photo ${v.color}`}>
                          <img src={photo(v.photo, 180)} alt={pick(v.name)} />
                          <span className="online-dot" />
                        </div>
                        <strong>{pick(v.name)}</strong>
                        <span>{v.role}</span>
                        <div className="investor-level">
                          <span className="level-bars">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <i
                                key={n}
                                className={n <= v.level ? "filled" : ""}
                              />
                            ))}
                          </span>
                          {t("Ур.", "Lvl.")} {v.level}
                          <ArrowUpRight size={15} />
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="leader-preview">
                  <div className="section-heading">
                    <div className="section-title">
                      <Trophy size={17} />
                      <h2>{t("На пути к единорогу", "The next unicorns")}</h2>
                    </div>
                    <span className="week-badge">{t("Демо", "Demo")}</span>
                  </div>
                  <p className="section-subtitle">
                    {t(
                      "Идеи, которые звучат громче всех",
                      "Ideas that are making themselves heard",
                    )}
                  </p>
                  <div className="ranking-mini">
                    {seedRanking.slice(0, 3).map((r, i) => (
                      <div className="ranking-row" key={r.name}>
                        <span className={`rank rank-${i}`}>
                          {i === 0 ? (
                            <Trophy size={15} />
                          ) : (
                            String(i + 1).padStart(2, "0")
                          )}
                        </span>
                        <span className={`startup-icon ${r.color}`}>
                          {r.initial}
                        </span>
                        <div>
                          <strong>{r.name}</strong>
                          <span>{r.description}</span>
                        </div>
                        <strong className="rank-score">
                          {r.score}
                          <span>XP</span>
                        </strong>
                        <span className="rank-change">↗ {r.change}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="leader-link"
                    onClick={() => go("leaderboard")}
                  >
                    {t("Открыть рейтинг", "Explore leaderboard")}
                    <ArrowUpRight size={15} />
                  </button>
                </section>
              </div>
              <div className="dashboard-footer">
                <span>
                  <ShieldCheck size={14} />
                  {t(
                    "Безопасное место для смелых идей",
                    "A safe space for bold ideas",
                  )}
                </span>
                <span>
                  BUILT FOR THE NEXT BIG THING <span>✦</span>
                </span>
              </div>
            </>
          )}
          {page === "arenas" && (
            <>
              <PageTitle
                eyebrow={t("ВЫБЕРИ СВОЙ ВЫЗОВ", "CHOOSE YOUR CHALLENGE")}
                title={t(
                  "Выбери точку на карте.",
                  "Choose your next destination.",
                )}
                subtitle={t(
                  "Начни с простого разговора. Дойди до самых сложных вопросов.",
                  "Start with a friendly conversation. Work your way up to the toughest questions.",
                )}
              />
              <JourneyMap
                history={history}
                t={t}
                pick={pick}
                onSelect={setSelected}
              />
              <div className="section-heading">
                <div className="section-title">
                  <h2>{t("Все миссии", "All missions")}</h2>
                </div>
                <span className="text-muted">
                  {t("Свободный выбор арены", "Free choice of arena")}
                </span>
              </div>
              <div className="browse-tools">
                <div className="search-input">
                  <Search size={17} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("Найти арену…", "Search arenas…")}
                  />
                </div>
                <label className="difficulty-select">
                  <Globe2 size={16} />
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    aria-label={t("Регион", "Region")}
                  >
                    {[
                      ["all", "Весь мир", "Worldwide"],
                      ["cis", "СНГ", "CIS"],
                      ["eu", "Европа", "Europe"],
                      ["us", "Америка", "Americas"],
                      ["uae", "Эмираты", "UAE"],
                    ].map(([id, ru, en]) => (
                      <option value={id} key={id}>
                        {t(ru, en)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} />
                </label>
                <label className="difficulty-select">
                  <Settings2 size={16} />
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    aria-label={t("Сложность", "Difficulty")}
                  >
                    <option value="all">{t("Все уровни", "All levels")}</option>
                    <option value="easy">
                      {t("Для начинающих", "Beginner friendly")}
                    </option>
                    <option value="hard">{t("Продвинутые", "Advanced")}</option>
                  </select>
                </label>
              </div>
              <div className="arena-grid all-arenas">
                {filtered.map((a) => (
                  <ArenaCard
                    key={a.id}
                    arena={a}
                    {...{ t, pick }}
                    onClick={() => setSelected(a)}
                  />
                ))}
              </div>
              {!filtered.length && (
                <Empty
                  icon={Search}
                  title={t("Такой арены пока нет", "No matching arenas")}
                  text={t(
                    "Попробуй изменить поиск или фильтры.",
                    "Try a different search or filter.",
                  )}
                />
              )}
              <p className="simulation-note">
                <ShieldCheck size={15} />
                {t(
                  "Все арены — учебные симуляции. Проект не связан с указанными фондами и шоу.",
                  "All arenas are educational simulations. We are not affiliated with the named funds or shows.",
                )}
              </p>
            </>
          )}
          {page === "investors" && (
            <>
              <PageTitle
                eyebrow={t(
                  "НАЙДИ СВОЕГО СОБЕСЕДНИКА",
                  "MEET YOUR NEXT CHALLENGE",
                )}
                title={t("По ту сторону стола", "Across the table")}
                subtitle={t(
                  "Реальные прототипы, игровые диалоги. Выбери, перед кем репетировать следующий питч.",
                  "Real-world references, fictional dialogue. Choose who to rehearse your next pitch with.",
                )}
              />
              <div className="investor-full-grid">
                {investors.map((v, i) => (
                  <div className="investor-full" key={i}>
                    <div className={`investor-banner ${v.color}`}>
                      <span className="tag">
                        {t(
                          "РЕАЛЬНЫЙ ПРОТОТИП · СИМУЛЯЦИЯ",
                          "REAL-WORLD REFERENCE · SIMULATION",
                        )}
                      </span>
                      <img src={photo(v.photo, 300)} alt={pick(v.name)} />
                    </div>
                    <div className="investor-full-body">
                      <h2>{pick(v.name)}</h2>
                      <p>{v.role}</p>
                      <div className="investor-meta">
                        <span>
                          <Globe2 size={15} />
                          {v.region === "us"
                            ? t("США", "United States")
                            : v.region === "eu"
                              ? t("Европа", "Europe")
                              : v.id === "arman"
                                ? t("Алматы", "Almaty")
                                : t("Москва", "Moscow")}
                        </span>
                        <span>
                          <Zap size={15} />
                          {t("Уровень", "Level")} {v.level}
                        </span>
                      </div>
                      <p className="investor-description">
                        {t("Фокус игрового сценария: ", "Practice focus: ")}
                        {pick(v.focus)}.{" "}
                        {t(
                          "Реплики не являются цитатами реального человека.",
                          "Dialogue is not a quotation from the real person.",
                        )}
                      </p>
                      <a
                        className="persona-source"
                        href={v.source}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t(
                          "О прототипе · официальный источник",
                          "About this person · official source",
                        )}
                        <ArrowUpRight size={12} />
                      </a>
                      <button
                        className="button white"
                        onClick={() =>
                          setSelected({
                            ...arenas.find((a) => a.id === v.arenaId),
                            personaIds: [v.id],
                            title: v.name,
                            panel: [pick(v.name)],
                            level: v.level,
                          })
                        }
                      >
                        {t("Начать диалог", "Start a conversation")}
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="simulation-note">
                {t(
                  "Имена и портреты — с официальных страниц. Реплики вымышлены; проект не связан с этими людьми и организациями. Голоса — нейтральные синтетические.",
                  "Names and portraits come from official pages. Dialogue is fictional; we are not affiliated with these people or organizations. Voices are neutral and synthetic.",
                )}
              </p>
            </>
          )}
          {page === "history" && (
            <>
              <PageTitle
                eyebrow={t(
                  "КАЖДАЯ ПОПЫТКА ИМЕЕТ ЗНАЧЕНИЕ",
                  "EVERY ATTEMPT COUNTS",
                )}
                title={t("Твой рост в действии", "Your growth in action")}
                subtitle={t(
                  "Выступления, обратная связь и маленькие победы на пути к большой цели.",
                  "Pitches, feedback, and small wins on the way to something big.",
                )}
              />
              {history.length ? (
                <>
                  <div className="history-stats">
                    <Stat
                      icon={Mic}
                      label={t("Всего питчей", "Total pitches")}
                      value={history.length}
                    />
                    <Stat
                      icon={Target}
                      label={t("Средний балл", "Average score")}
                      value={average !== null ? `${average}/100` : "—"}
                    />
                    <Stat
                      icon={Zap}
                      label={t("Заработано опыта", "Experience earned")}
                      value={`${totalXP(history)} XP`}
                    />
                  </div>
                  <div className="history-list">
                    {history.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => setResult(h)}
                        className="history-item"
                      >
                        <div className="history-icon">
                          <Mic size={22} />
                        </div>
                        <div>
                          <h3>{h.startup}</h3>
                          <p>
                            {h.arena} ·{" "}
                            {new Date(h.date).toLocaleDateString(
                              lang === "ru" ? "ru-RU" : "en-US",
                            )}
                          </p>
                        </div>
                        <span className="history-duration">
                          <Clock3 size={14} />
                          {Math.floor(h.duration / 60)}:
                          {String(h.duration % 60).padStart(2, "0")}
                        </span>
                        <span className="score-chip">{h.score}/100</span>
                        <ArrowUpRight size={20} />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <Empty
                  icon={Mic}
                  title={t(
                    "Здесь начнётся твоя история",
                    "Your story starts here",
                  )}
                  text={t(
                    "Пройди первый питч — мы сохраним результат и подскажем, над чем поработать.",
                    "Complete your first pitch to save your results and find out what to work on.",
                  )}
                >
                  <button
                    className="button dark"
                    onClick={() => setSelected(arenas[0])}
                  >
                    {t("Мой первый питч", "My first pitch")}
                    <ArrowUpRight size={17} />
                  </button>
                </Empty>
              )}
            </>
          )}
          {page === "leaderboard" && (
            <>
              <PageTitle
                eyebrow={t(
                  "СООБЩЕСТВО БУДУЩИХ ЕДИНОРОГОВ",
                  "A COMMUNITY OF FUTURE UNICORNS",
                )}
                title={t("Большие идеи наверху", "Big ideas rise to the top")}
                subtitle={t(
                  "Пример будущего рейтинга сообщества. Личные результаты находятся в разделе «Мои выступления».",
                  "A preview of the community leaderboard. Your personal results are in My pitches.",
                )}
              />
              <div className="leaderboard-banner">
                <div>
                  <div className="hero-pill">
                    <Sparkles size={13} />
                    {t(
                      "КАЖДЫЙ МОЖЕТ СТАТЬ ПЕРВЫМ",
                      "EVERY FOUNDER STARTS SOMEWHERE",
                    )}
                  </div>
                  <h2>
                    {t(
                      "Следующий единорог — твой?",
                      "Is yours the next unicorn?",
                    )}
                  </h2>
                  <p>
                    {t(
                      "Репетируй, набирай опыт и улучшай свой питч.",
                      "Practice, earn experience, and make every pitch better.",
                    )}
                  </p>
                </div>
                <Trophy size={94} strokeWidth={1} />
              </div>
              <div className="leaderboard-table">
                <div className="leaderboard-table-heading">
                  <h3>{t("Демонстрационный рейтинг", "Demo leaderboard")}</h3>
                  <span className="week-badge">
                    {t("Пример данных", "Sample data")}
                  </span>
                </div>
                {seedRanking.map((r, i) => (
                  <div className="ranking-row" key={r.name}>
                    <span className={`rank rank-${i}`}>
                      {i === 0 ? (
                        <Trophy size={18} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <span className={`startup-icon ${r.color}`}>
                      {r.initial}
                    </span>
                    <div>
                      <strong>{r.name}</strong>
                      <span>{r.description}</span>
                    </div>
                    <strong className="rank-score">
                      {r.score}
                      <span>XP</span>
                    </strong>
                    <span className="rank-change">↗ {r.change}</span>
                  </div>
                ))}
                <div className="ranking-row your-ranking">
                  <span className="rank">—</span>
                  <span className="startup-icon purple">
                    {profile.startup.slice(0, 1)}
                  </span>
                  <div>
                    <strong>
                      {profile.startup}
                      <span className="you-badge">{t("Это ты", "You")}</span>
                    </strong>
                    <span>{t("Локальный прогресс", "Local progress")}</span>
                  </div>
                  <strong className="rank-score">
                    {totalXP(history)}
                    <span>XP</span>
                  </strong>
                  <Rocket size={19} />
                </div>
              </div>
            </>
          )}
          {page === "profile" && (
            <>
              <PageTitle
                eyebrow={t("ВСЁ НАЧИНАЕТСЯ С ТЕБЯ", "IT ALL STARTS WITH YOU")}
                title={t("Профиль основателя", "Founder profile")}
                subtitle={t(
                  "Расскажи немного о себе и о том, что создаёшь.",
                  "Tell us a little about yourself and what you’re building.",
                )}
              />
              <ProfileForm
                key={workspace.account?.id || "guest"}
                cloud={!!workspace.account}
                level={Math.floor(totalXP(history) / 500) + 1}
                {...{ profile, setProfile, t }}
                onSave={() => setToast(t("Профиль сохранён", "Profile saved"))}
              />
            </>
          )}
        </main>
      </div>
      {selected && (
        <Setup
          arena={selected}
          {...{ t, pick, retry, launchBusy }}
          profile={{
            ...profile,
            startup: retry?.startup || activeProject?.name || profile.startup,
          }}
          account={workspace.account}
          projects={workspace.projects}
          activeProjectId={retry?.projectId || workspace.activeProjectId}
          aiReady={workspace.aiReady}
          onClose={() => {
            setSelected(null);
            setRetry(null);
          }}
          onStart={launch}
        />
      )}
      {session && (
        <PitchRoom
          data={session}
          {...{ t, pick, lang, Brand, Modal, CameraPreview }}
          onClose={leaveSession}
          onComplete={complete}
        />
      )}
      {result && (
        <Results
          result={result}
          {...{ t, Modal, history }}
          onClose={() => setResult(null)}
          onMap={() => {
            setResult(null);
            go("home");
          }}
          onRetry={() => {
            setRetry(result);
            setResult(null);
            setSelected(
              arenas.find((a) => a.id === result.arenaId) || arenas[0],
            );
          }}
        />
      )}
      {accountOpen && (
        <AccountPanel
          account={workspace.account}
          projects={workspace.projects}
          localHistory={guestHistory}
          {...{ t, Modal }}
          onClose={() => setAccountOpen(false)}
          onRefresh={workspace.refresh}
          onProject={(project) => workspace.setActiveProjectId(project.id)}
        />
      )}
      {help && (
        <Modal
          onClose={() => setHelp(false)}
          label={t("Как это работает", "How it works")}
        >
          <div className="modal-eyebrow">
            <Sparkles size={17} />
            {t("ОТ ИДЕИ К УВЕРЕННОМУ ПИТЧУ", "FROM IDEA TO CONFIDENT PITCH")}
          </div>
          <h2>
            {t(
              "Твоя репетиция большого момента",
              "Your rehearsal for the big moment",
            )}
          </h2>
          <div className="help-steps">
            {[
              [
                UploadCloud,
                t("Подготовь историю", "Prepare your story"),
                t(
                  "Выбери арену, укажи стартап и сумму инвестиций. Загрузи PDF или слайды-картинки.",
                  "Choose an arena, enter your startup and funding ask. Upload a PDF or slide images.",
                ),
              ],
              [
                Mic,
                t("Дай идее голос", "Give your idea a voice"),
                t(
                  "Выбери длительность и расскажи о продукте без перебиваний. После таймера проверь транскрипт; затем начнутся вопросы.",
                  "Choose a duration and pitch without interruptions. After the timer, check your transcript; then the questions begin.",
                ),
              ],
              [
                TrendingUp,
                t("Становись лучше", "Get better every time"),
                t(
                  "Ответь на тренировочные вопросы и получи оценку по структуре ответов. Повтори, когда будешь готов.",
                  "Answer practice questions and get feedback on answer structure. Try again whenever you’re ready.",
                ),
              ],
            ].map(([Icon, title, text], i) => (
              <div key={i}>
                <span>
                  <Icon size={21} />
                </span>
                <section>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </section>
              </div>
            ))}
          </div>
          <p className="info-note">
            {t(
              "Баллы считаются по открытым правилам. В аккаунте можно включить ИИ-разбор: текст и слайды будут отправлены провайдеру ИИ. Аудио не отправляется на наш сервер; распознавание речи может обрабатываться сервисом браузера.",
              "Scores use transparent rules. Account users can enable AI feedback, which sends text and slides to the AI provider. Audio is not sent to our server; speech recognition may be processed by your browser’s service.",
            )}
          </p>
          <button
            className="button dark full"
            onClick={() => {
              setHelp(false);
              setSelected(arenas[0]);
            }}
          >
            {t("Попробовать", "Give it a try")}
            <ArrowRight size={17} />
          </button>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
function PageTitle({ eyebrow, title, subtitle }) {
  return (
    <div className="page-heading standalone">
      <div>
        <div className="eyebrow">
          {eyebrow}
          <span className="tiny-spark">✧</span>
        </div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
function Stat({ icon: Icon, label, value }) {
  return (
    <div className="stat">
      <span>
        <Icon size={19} />
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
function Empty({ icon: Icon, title, text, children }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={34} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      {children}
    </div>
  );
}
function ArenaCard({ arena: a, t, pick, onClick }) {
  return (
    <button className="arena-card" onClick={onClick}>
      <div className={`arena-visual ${a.kind}`}>
        <Scene kind={a.kind} />
        <span className="arena-tag">{pick(a.tag)}</span>
        {a.id === "family" && (
          <span className="recommended">
            <Sparkles size={11} />
            {t("Начни здесь", "Start here")}
          </span>
        )}
        <span className="arena-play">
          <ArrowUpRight size={19} />
        </span>
      </div>
      <div className="arena-body">
        <div className="arena-title-line">
          <h3>{pick(a.title)}</h3>
          <span className={`level-badge level-${a.level}`}>
            <i />
            {pick(a.difficulty)}
          </span>
        </div>
        <p>{pick(a.subtitle)}</p>
        <div className="arena-meta">
          <span>
            <Users size={13} />
            {panelFor(a).length} {t("в панели", "on the panel")}
          </span>
          <span>
            <Clock3 size={13} />
            {a.pitchSeconds / 60} {t("мин питч", "min pitch")}
          </span>
          <span className="arena-level">
            +{a.xp} XP
            <ChevronRight size={13} />
          </span>
        </div>
      </div>
    </button>
  );
}
function Modal({ children, onClose, label, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = ref.current?.querySelectorAll(
          'button, input, select, textarea, [tabindex="0"]',
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        tabIndex={-1}
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <button
          className="modal-close icon-button"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>
        {children}
      </section>
    </div>
  );
}
function ProfileForm({ profile, setProfile, t, onSave, level, cloud }) {
  const [draft, setDraft] = useState(profile);
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="profile-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        if (await setProfile(draft)) onSave();
        setSaving(false);
      }}
    >
      <div className="profile-form-top">
        <div className="user-avatar large">{draft.name.slice(0, 1) || "?"}</div>
        <div>
          <h2>{draft.name}</h2>
          <span>
            {t(`Основатель · Уровень ${level}`, `Founder · Level ${level}`)}
          </span>
        </div>
        <span className="profile-local">
          <ShieldCheck size={14} />
          {cloud
            ? t("Профиль аккаунта", "Account profile")
            : t("Гостевой профиль", "Guest profile")}
        </span>
      </div>
      <div className="form-grid">
        <label>
          {t("Твоё имя", "Your name")}
          <input
            required
            maxLength={40}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label>
          {t("Название стартапа", "Startup name")}
          <input
            required
            maxLength={60}
            value={draft.startup}
            onChange={(e) => setDraft({ ...draft, startup: e.target.value })}
          />
        </label>
      </div>
      <label>
        {t("Индустрия", "Industry")}
        <select
          value={draft.industry}
          onChange={(e) => setDraft({ ...draft, industry: e.target.value })}
        >
          {[
            "SaaS & AI",
            "FinTech",
            "HealthTech",
            "ClimateTech",
            "Consumer",
            "DeepTech",
            "E-commerce",
          ].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        {t("Об идее в двух словах", "Your idea in a few words")}
        <textarea
          rows={4}
          maxLength={500}
          placeholder={t(
            "Какую проблему ты решаешь?",
            "What problem are you solving?",
          )}
          value={draft.bio}
          onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
        />
      </label>
      <div className="form-footer">
        <span>
          {t(
            cloud
              ? "Данные сохраняются в аккаунте"
              : "Данные сохраняются в этом браузере",
            cloud
              ? "Your data is saved in your account"
              : "Your data is saved in this browser",
          )}
        </span>
        <button className="button dark" type="submit" disabled={saving}>
          {t("Сохранить профиль", "Save profile")}
          <Check size={17} />
        </button>
      </div>
    </form>
  );
}
function Setup({
  arena,
  t,
  pick,
  profile,
  onClose,
  onStart,
  retry,
  account,
  projects,
  activeProjectId,
  aiReady,
  launchBusy,
}) {
  const [projectId, setProjectId] = useState(
    account ? activeProjectId || "" : "",
  );
  const [useAI, setUseAI] = useState(false);
  const [startup, setStartup] = useState(retry?.startup || profile.startup);
  const [ask, setAsk] = useState(String(retry?.ask ?? 100000));
  const [pitchSeconds, setPitchSeconds] = useState(
    retry?.pitchLimit || arena.pitchSeconds || 120,
  );
  const [spokenQuestions, setSpokenQuestions] = useState(true);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef();
  const addFiles = (list) => {
    setError("");
    const incoming = Array.from(list);
    if (
      incoming.some(
        (f) =>
          ![
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/webp",
          ].includes(f.type),
      )
    ) {
      setError(
        t(
          "Поддерживаются PDF, JPG, PNG и WebP.",
          "Supported formats: PDF, JPG, PNG, and WebP.",
        ),
      );
      return;
    }
    if (incoming.some((f) => f.size > 20 * 1024 * 1024)) {
      setError(
        t(
          "Каждый файл должен быть меньше 20 МБ.",
          "Each file must be smaller than 20 MB.",
        ),
      );
      return;
    }
    const combined = [...files, ...incoming];
    if (combined.length > 20) {
      setError(
        t("Можно загрузить до 20 слайдов.", "You can upload up to 20 slides."),
      );
      return;
    }
    if (
      combined.some((f) => f.type === "application/pdf") &&
      combined.length > 1
    ) {
      setError(
        t(
          "Загрузи один PDF или несколько изображений.",
          "Upload one PDF or multiple images.",
        ),
      );
      return;
    }
    setFiles(combined);
  };
  return (
    <Modal
      onClose={onClose}
      label={t("Подготовка к питчу", "Prepare your pitch")}
    >
      <div className="modal-eyebrow">
        <Mic size={16} />
        {t("ВЫХОД НА АРЕНУ", "STEP INTO THE ARENA")}
      </div>
      <h2>{pick(arena.title)}</h2>
      <p className="modal-subtitle">{pick(arena.description)}</p>
      {retry && startup.trim() === retry.startup.trim() && (
        <PracticeGoal goal={retry.nextGoal} t={t} compact />
      )}
      {retry && (
        <p className="info-note">
          {t(
            "Настройки прошлой попытки сохранены. Презентацию при необходимости загрузи заново.",
            "Your previous settings are preserved. Upload your slides again if needed.",
          )}
        </p>
      )}
      <div className="setup-meta">
        <span>
          <Zap size={14} />
          {t("Уровень", "Level")} {arena.level}
        </span>
        <span>
          <Clock3 size={14} />
          {Number(pitchSeconds) / 60} {t("мин питч", "min pitch")}
        </span>
        <span>
          <Users size={14} />
          {arena.panel.length} {t("собеседника", "panelists")}
        </span>
      </div>
      <div className="setup-cast">
        {panelFor(arena).map((v, i) => (
          <div key={i}>
            {v.photo ? (
              <img src={photo(v.photo, 80)} alt="" />
            ) : (
              <span className="cast-initial">{v.initial}</span>
            )}
            <span>{pick(v.name)}</span>
          </div>
        ))}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            await onStart({
              projectId,
              useAI,
              arena,
              startup,
              ask: Number(ask),
              files,
              pitchSeconds: Number(pitchSeconds),
              spokenQuestions,
              practiceGoal:
                retry && startup.trim() === retry.startup.trim()
                  ? retry.nextGoal
                  : null,
            });
          } catch (error) {
            setError(errorText(error, t));
          }
        }}
      >
        {account && (
          <label>
            {t("Проект", "Project")}
            <select
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                const p = projects.find((p) => p.id === e.target.value);
                if (p) setStartup(p.name);
              }}
            >
              <option value="">
                {t("Создать новый проект", "Create a new project")}
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="ai-choice">
          <label>
            <input
              type="checkbox"
              checked={useAI}
              disabled={!account || !aiReady}
              onChange={(e) => setUseAI(e.target.checked)}
            />
            {t("Разбор с ИИ-наставником", "Review with AI coach")}
          </label>
          <small>
            {!account
              ? t(
                  "Для ИИ и сохранения на сервере войди в аккаунт.",
                  "Sign in for AI and server saves.",
                )
              : !aiReady
                ? t(
                    "ИИ ещё не настроен на сервере. Локальная тренировка доступна.",
                    "AI is not configured on the server yet. Local practice is available.",
                  )
                : t(
                    "При включении текст, ответы и загруженные слайды передаются OpenAI для разбора.",
                    "When enabled, your text, answers and uploaded slides are sent to OpenAI for review.",
                  )}
          </small>
        </div>
        <div className="pitch-settings">
          <div className="pitch-setting-heading">
            <span>
              <Clock3 size={15} />
              {t("Время на питч", "Pitch duration")}
            </span>
            <span>{t("Игровой лимит", "Game time limit")}</span>
          </div>
          <div className="duration-options">
            {[60, 120, 180, 300].map((n) => (
              <button
                type="button"
                key={n}
                className={Number(pitchSeconds) === n ? "selected" : ""}
                onClick={() => setPitchSeconds(n)}
              >
                {n / 60} {t("мин", "min")}
              </button>
            ))}
            <label className="custom-duration">
              <input
                aria-label={t(
                  "Своя длительность в секундах",
                  "Custom duration in seconds",
                )}
                type="number"
                min="30"
                max="600"
                required
                value={pitchSeconds}
                onChange={(e) => setPitchSeconds(e.target.value)}
              />
              <span>{t("сек", "sec")}</span>
            </label>
          </div>
          <label className="voice-preference">
            <input
              type="checkbox"
              checked={spokenQuestions}
              onChange={(e) => setSpokenQuestions(e.target.checked)}
            />
            <span>
              {t(
                "Озвучивать вопросы нейтральным голосом",
                "Read questions with a neutral voice",
              )}
            </span>
          </label>
        </div>
        <div className="form-grid">
          <label>
            {t("Название стартапа", "Startup name")}
            <input
              required
              maxLength={60}
              value={startup}
              readOnly={Boolean(account && projectId)}
              onChange={(e) => setStartup(e.target.value)}
              placeholder="Next big thing"
            />
          </label>
          <label>
            {t("Привлекаешь инвестиций, $", "Investment ask, $")}
            <input
              required
              type="number"
              min="1"
              max="1000000000"
              step="1"
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
            />
          </label>
        </div>
        <label className="upload-label">
          {t("Твоя презентация", "Your pitch deck")}
          <span>{t("необязательно", "optional")}</span>
        </label>
        <div
          className={`upload-zone ${dragging ? "dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
        >
          <input
            ref={input}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            multiple
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
            hidden
          />
          <button type="button" onClick={() => input.current.click()}>
            <span className="upload-icon">
              <UploadCloud size={24} />
            </span>
            <strong>
              {t(
                "Перетащи слайды или выбери файл",
                "Drop your slides or browse files",
              )}
            </strong>
            <span>
              {t(
                "PDF или изображения · до 20 МБ на файл",
                "PDF or images · up to 20 MB per file",
              )}
            </span>
          </button>
        </div>
        {files.length > 0 && (
          <div className="file-list">
            {files.map((f, i) => (
              <div key={i}>
                <FileText size={16} />
                <span>{f.name}</span>
                <small>{(f.size / 1024 / 1024).toFixed(1)} MB</small>
                <button
                  type="button"
                  aria-label={t("Удалить файл", "Remove file")}
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="setup-note">
          <Lightbulb size={18} />
          <p>
            {files.length
              ? t(
                  useAI
                    ? "Слайды будут учтены ИИ вместе с текстом выступления."
                    : "Файлы готовы к показу. Разбор ИИ выключен.",
                  useAI
                    ? "AI will review the slides alongside your pitch text."
                    : "Files are ready to present. AI review is off.",
                )
              : t(
                  "Нет слайдов? Не проблема. Начни с истории о продукте — мы покажем тренировочный экран.",
                  "No slides? No problem. Start with your product story — we’ll show a practice screen.",
                )}
          </p>
        </div>
        <button
          className="button dark full"
          type="submit"
          disabled={launchBusy}
        >
          {launchBusy
            ? t("Сохраняем…", "Saving…")
            : t("Войти на арену", "Enter the arena")}
          <ArrowUpRight size={18} />
        </button>
        <p className="setup-privacy">
          <ShieldCheck size={13} />
          {t(
            account
              ? "Презентация сохраняется приватно в твоём аккаунте"
              : "Презентация остаётся на твоём устройстве",
            account
              ? "Your deck is saved privately in your account"
              : "Your deck stays on your device",
          )}
        </p>
      </form>
    </Modal>
  );
}
function CameraPreview({ t }) {
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const video = useRef(null),
    stream = useRef(null),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  useEffect(() => {
    if (enabled && video.current) video.current.srcObject = stream.current;
  }, [enabled]);
  const toggle = async () => {
    if (enabled) {
      stream.current?.getTracks().forEach((track) => track.stop());
      setEnabled(false);
      return;
    }
    setPending(true);
    setError("");
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360 },
        audio: false,
      });
      if (!mounted.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      setEnabled(true);
    } catch {
      if (mounted.current)
        setError(
          t(
            "Камера недоступна. Проверь разрешения браузера.",
            "Camera unavailable. Check browser permissions.",
          ),
        );
    } finally {
      if (mounted.current) setPending(false);
    }
  };
  return (
    <div className={`camera-preview ${enabled ? "enabled" : ""}`}>
      {enabled && <video ref={video} autoPlay muted playsInline />}
      <button
        onClick={toggle}
        disabled={pending}
        aria-label={
          enabled
            ? t("Выключить камеру", "Turn off camera")
            : t("Включить камеру", "Turn on camera")
        }
      >
        <Video size={15} />
        {enabled
          ? t("Камера включена", "Camera on")
          : t("Включить камеру", "Turn on camera")}
        {enabled && <X size={13} />}
      </button>
      {error && <span role="status">{error}</span>}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
