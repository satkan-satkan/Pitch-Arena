// Public profiles supply identities only. All dialogue and game rules are fictional.
export const investors = [
  {
    id: "oskar",
    name: ["Оскар Хартманн", "Oskar Hartmann"],
    role: "Unicorn Arena · Venture",
    initial: "OH",
    color: "lavender",
    photo: "/portraits/oskar.jpg",
    level: 3,
    region: "cis",
    arenaId: "arena",
    source: "https://arena.unicornfellowship.ru/",
    focus: ["Масштаб рынка и бизнес-модель", "Market scale & business model"],
  },
  {
    id: "arman",
    name: ["Арман Сулейменов", "Arman Suleimenov"],
    role: "nFactorial · Product · AI",
    initial: "AS",
    color: "peach",
    photo: "/portraits/arman.png",
    level: 2,
    region: "cis",
    arenaId: "nfactorial",
    source: "https://www.nfactorial.school/",
    focus: ["Продукт и первые пользователи", "Product & first users"],
  },
  {
    id: "garry",
    name: ["Гарри Тан", "Garry Tan"],
    role: "Y Combinator · Startups",
    initial: "GT",
    color: "blue",
    photo: "/portraits/garry.jpg",
    level: 4,
    region: "us",
    arenaId: "yc",
    source: "https://www.ycombinator.com/people/garry-tan",
    focus: ["Рост и потребность клиента", "Growth & customer demand"],
  },
  {
    id: "anton",
    name: ["Антон Пронин", "Anton Pronin"],
    role: "MalinaVC · Venture",
    initial: "AP",
    color: "green",
    photo: "/portraits/anton.jpg",
    level: 3,
    region: "cis",
    arenaId: "arena",
    source: "https://arena.unicornfellowship.ru/",
    focus: ["Продажи и метрики", "Sales & metrics"],
  },
  {
    id: "vitaly",
    name: ["Виталий Полехин", "Vitaly Polekhin"],
    role: "INVESTORO · Angels",
    initial: "VP",
    color: "blue",
    photo: "/portraits/vitaly.jpg",
    level: 3,
    region: "cis",
    arenaId: "arena",
    source: "https://arena.unicornfellowship.ru/",
    focus: ["Экономика и инвестиционный план", "Economics & funding plan"],
  },
];
export const photo = (id, w = 100) =>
  id?.startsWith("/") || id?.startsWith("https:")
    ? id
    : `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;
const persona = (name, initial, role) => ({
  name,
  initial,
  role,
  photo: null,
  fictional: true,
});
const family = [
  persona(["Мама", "Mom"], "М", ""),
  persona(["Папа", "Dad"], "П", ""),
  persona(["Друг", "Friend"], "Д", ""),
];
const generic = [
  persona(["Алекс", "Alex"], "A", "Market"),
  persona(["София", "Sofia"], "S", "Product"),
  persona(["Дэвид", "David"], "D", "Finance"),
];
export const panelFor = (arena) =>
  arena.personaIds
    ? arena.personaIds
        .map((id) => investors.find((v) => v.id === id))
        .filter(Boolean)
    : arena.id === "family"
      ? family
      : generic;
const definitions = [
  {
    id: "family",
    title: ["Свои люди", "Friends & family"],
    subtitle: [
      "Первый шаг большого приключения",
      "The first step of a big adventure",
    ],
    level: 1,
    difficulty: ["Разминка", "Warm-up"],
    time: 5,
    pitchSeconds: 120,
    region: "all",
    kind: "family",
    tag: ["ПЕРВЫЙ ШАГ", "THE FIRST STEP"],
    city: ["Твой дом", "Your home"],
    coordinates: null,
    mapPosition: [100, 345],
    symbol: "⌂",
    xp: 100,
    description: [
      "Расскажи идею близким. Сначала они внимательно выслушают, а потом спросят о самом главном. Здесь можно начинать с нуля.",
      "Share your idea with the people closest to you. They will listen first, then ask what matters. This is where your journey starts.",
    ],
  },
  {
    id: "nfactorial",
    title: ["nFactorial Bootcamp", "nFactorial Bootcamp"],
    subtitle: [
      "Алматы. От идеи к первому продукту.",
      "Almaty. From idea to first product.",
    ],
    level: 2,
    difficulty: ["Средний", "Intermediate"],
    time: 7,
    pitchSeconds: 180,
    region: "cis",
    kind: "nfactorial",
    tag: ["ПЕРВЫЙ DEMO DAY", "YOUR FIRST DEMO DAY"],
    city: ["Алматы, Казахстан", "Almaty, Kazakhstan"],
    coordinates: [76.89, 43.24],
    mapPosition: [735, 130],
    country: "398",
    symbol: "n!",
    xp: 180,
    personaIds: ["arman"],
    source: "https://www.nfactorial.school/",
    description: [
      "Игровой Demo Day по мотивам nFactorial. Представь продукт и первых пользователей, затем пройди разбор с симуляцией ментора Армана Сулейменова.",
      "A fictional Demo Day inspired by nFactorial. Present your product and first users, then practice with an Arman Suleimenov mentor simulation.",
    ],
  },
  {
    id: "arena",
    title: ["Арена Единорогов", "Unicorn Arena"],
    subtitle: [
      "Две минуты. Один большой шанс.",
      "Two minutes. One big opportunity.",
    ],
    level: 3,
    difficulty: ["Босс-раунд", "Boss round"],
    time: 8,
    pitchSeconds: 120,
    region: "cis",
    kind: "arena",
    tag: ["ОСКАР ХАРТМАНН", "OSKAR HARTMANN"],
    city: ["Москва, Россия", "Moscow, Russia"],
    coordinates: [37.62, 55.75],
    mapPosition: [583, 73],
    country: "643",
    symbol: "✦",
    xp: 250,
    personaIds: ["oskar", "anton", "vitaly"],
    source: "https://arena.unicornfellowship.ru/",
    description: [
      "Симуляция по мотивам «Арены Единорогов». Оскар Хартманн, Антон Пронин и Виталий Полехин — реальные прототипы панели. Все вопросы в игре придуманы, лимит 2 минуты — игровая настройка.",
      "A simulation inspired by Unicorn Arena, featuring Oskar Hartmann, Anton Pronin, and Vitaly Polekhin as real-world references. Dialogue is fictional; the 2-minute limit is a game setting.",
    ],
  },
  {
    id: "yc",
    title: ["Y Combinator", "Y Combinator"],
    subtitle: [
      "Скажи главное. Создай нужное.",
      "Say what matters. Build what people want.",
    ],
    level: 4,
    difficulty: ["Эксперт", "Expert"],
    time: 10,
    pitchSeconds: 60,
    region: "us",
    kind: "yc",
    tag: ["СЛЕДУЮЩИЙ МАСШТАБ", "THE NEXT LEVEL"],
    city: ["Сан-Франциско, США", "San Francisco, USA"],
    coordinates: [-122.42, 37.77],
    mapPosition: [197, 132],
    country: "840",
    symbol: "Y",
    xp: 320,
    personaIds: ["garry"],
    source: "https://www.ycombinator.com/people/garry-tan",
    description: [
      "Игровое интервью с симуляцией Гарри Тана. Короткий питч, конкретные метрики и вопросы о том, что нужно пользователям. Это не официальное интервью YC.",
      "A fictional interview with a Garry Tan simulation. A concise pitch, concrete metrics, and questions about what people need. This is not an official YC interview.",
    ],
  },
  {
    id: "sharks",
    title: ["Shark Tank", "Shark Tank"],
    subtitle: [
      "Убеди тех, кого сложно удивить",
      "Convince the hard to impress",
    ],
    level: 3,
    difficulty: ["Сложный", "Advanced"],
    time: 10,
    pitchSeconds: 120,
    region: "us",
    kind: "sharks",
    tag: ["ВЫСОКИЕ СТАВКИ", "HIGH STAKES"],
    city: ["Лос-Анджелес, США", "Los Angeles, USA"],
    coordinates: [-118.24, 34.05],
    mapPosition: [174, 232],
    country: "840",
    symbol: "S",
    xp: 250,
    description: [
      "Арена по мотивам инвестиционного шоу с вымышленной панелью. Докажи, что за историей стоит работающая экономика.",
      "A show-inspired arena with a fictional panel. Demonstrate the business behind your story.",
    ],
  },
  {
    id: "a16z",
    title: ["a16z", "a16z"],
    subtitle: [
      "Построй то, во что верит будущее",
      "Build what the future believes in",
    ],
    level: 5,
    difficulty: ["Финальный босс", "Final boss"],
    time: 15,
    pitchSeconds: 180,
    region: "us",
    kind: "a16z",
    tag: ["НОВЫЙ ГОРИЗОНТ", "THE NEXT HORIZON"],
    city: ["Менло-Парк, США", "Menlo Park, USA"],
    coordinates: [-122.18, 37.45],
    mapPosition: [329, 165],
    country: "840",
    symbol: "a16z",
    xp: 400,
    description: [
      "Технологическое преимущество и венчурный масштаб. Финальная тренировочная арена с вымышленными инвесторами.",
      "Technical advantage and venture-scale opportunity. The final practice arena, with fictional investors.",
    ],
  },
  {
    id: "dubai",
    title: ["Dubai Angels", "Dubai Angels"],
    subtitle: [
      "Твой выход на глобальный рынок",
      "Your gateway to a global market",
    ],
    level: 2,
    difficulty: ["Средний", "Intermediate"],
    time: 7,
    pitchSeconds: 180,
    region: "uae",
    kind: "dubai",
    tag: ["БЕЗ ГРАНИЦ", "BEYOND BORDERS"],
    city: ["Дубай, ОАЭ", "Dubai, UAE"],
    coordinates: [55.27, 25.2],
    mapPosition: [641, 250],
    country: "784",
    symbol: "D",
    xp: 180,
    description: [
      "Дополнительная миссия с вымышленной панелью бизнес-ангелов. Расскажи, как выйдешь на рынок MENA.",
      "A side mission with a fictional angel panel. Explain how you will enter the MENA market.",
    ],
  },
  {
    id: "europe",
    title: ["European Angels", "European Angels"],
    subtitle: ["Идеи с долгосрочным влиянием", "Ideas with a lasting impact"],
    level: 2,
    difficulty: ["Средний", "Intermediate"],
    time: 7,
    pitchSeconds: 180,
    region: "eu",
    kind: "europe",
    tag: ["ОТ ИДЕИ К ВЛИЯНИЮ", "IDEAS TO IMPACT"],
    city: ["Лондон, Великобритания", "London, UK"],
    coordinates: [-0.13, 51.5],
    mapPosition: [456, 172],
    country: "826",
    symbol: "eu",
    xp: 180,
    description: [
      "Дополнительная миссия с вымышленными инвесторами: продукт, устойчивый рост и стратегия на европейском рынке.",
      "A side mission with fictional investors: product, sustainable growth, and European market strategy.",
    ],
  },
];
export const arenas = definitions.map((a) => ({
  ...a,
  panel: panelFor(a).map((v) => v.name[0]),
}));
export const campaign = ["family", "nfactorial", "arena", "yc", "a16z"];
export const totalXP = (history) =>
  history.reduce((sum, h) => sum + (h.xp ?? 100), 0);
export const nextArena = (history) =>
  arenas.find(
    (a) =>
      a.id ===
      (campaign.find((id) => !history.some((h) => h.arenaId === id)) || "a16z"),
  );
export function medalsFor(history) {
  return [
    {
      id: "first",
      icon: "✦",
      name: ["Первый выход", "First on stage"],
      description: ["Заверши первый питч", "Complete your first pitch"],
      earned: history.length > 0,
    },
    {
      id: "numbers",
      icon: "↗",
      name: ["Цифры говорят", "Numbers talk"],
      description: [
        "Подкрепи спрос и экономику цифрами",
        "Add numbers to demand and economics",
      ],
      earned: history.some((h) =>
        h.scoringVersion >= 3
          ? ["observed", "price"].every((id) => h.numericEvidence?.includes(id))
          : h.evidence >= 3,
      ),
    },
    {
      id: "globe",
      icon: "◎",
      name: ["Без границ", "Beyond borders"],
      description: [
        "Пройди арены двух регионов",
        "Complete arenas in two regions",
      ],
      earned:
        new Set(
          history
            .map((h) => arenas.find((a) => a.id === h.arenaId)?.region)
            .filter((r) => r && r !== "all"),
        ).size >= 2,
    },
    {
      id: "boss",
      icon: "♜",
      name: ["Босс повержен", "Boss defeated"],
      description: [
        "Набери 70+ на Арене Единорогов",
        "Score 70+ at Unicorn Arena",
      ],
      earned: history.some((h) => h.arenaId === "arena" && h.score >= 70),
    },
    {
      id: "unicorn",
      icon: "✳",
      name: ["Путь единорога", "Unicorn journey"],
      description: [
        "Пройди все 5 глав кампании",
        "Complete all 5 campaign chapters",
      ],
      earned: campaign.every((id) => history.some((h) => h.arenaId === id)),
    },
  ];
}
// Compatibility exports for existing callers; the practice engine owns these rules.
export { analyzePitch, questionsFromPitch } from "./practice/engine.js";
