// Pure, versioned practice rules. Matches are textual signals, never verified facts.
export const SCORING_VERSION = 3;
const choose = (ru) => ru;
export const wordCount = (text = "") =>
  text.trim().split(/\s+/u).filter(Boolean).length;
const sentences = (text = "") =>
  text
    .trim()
    .split(/(?<=[!?;])\s*|(?<=\.)\s+|\n+/u)
    .filter(Boolean);
const denied =
  /\b(?:no|not|without|zero|haven't|don't)\b|нет(?=\s|[,.!?]|$)|не\s+(?:зна|измер|провер|получ|име|плат)|пока\s+без/iu;
const future =
  /\b(?:will|plan|target|hope|expect|forecast)\b|планир|хотим|ожида|прогноз|цел[ьи]|буд[еу]/iu;
const time =
  /\b(?:week|month|year|day|quarter)s?\b|недел|месяц|квартал|дн[яей]|день|за\s+год/iu;
const metric =
  /\d+(?:[.,]\d+)?\s*(?:%|(?:active\s+|paying\s+)?(?:users?|customers?|clients?|orders?|interviews?)\b|(?:активн\S*\s+|платящ\S*\s+)?(?:клиент|пользовател|заказ|интервью))|(?:выручк\S*|revenue|retention|удержани\S*|конверси\S*|conversion)\s*(?:\S+\s+){0,3}[$€₽₸]?\s*\d+/iu;
const money =
  /[$€₽₸]\s*\d|\d+(?:[.,]\d+)?\s*(?:[$€₽₸]|руб|тенге|доллар|евро|usd\b|eur\b|dollars?\b)|\b(?:price|subscription|pay|costs?)\s+(?:\S+\s+){0,2}\d/iu;
const criteria = {
  customer: {
    label: ["Клиент или сегмент", "Customer or segment"],
    hint: [
      "Назови, кто сталкивается с проблемой: роль, тип компании или ситуация.",
      "Name who has the problem: a role, company type, or situation.",
    ],
    match:
      /клиент|пользовател|магазин|врач|клиник|студент|учител|ресторан|основател|команд|customer|user|shop|doctor|clinic|student|teacher|restaurant|founder|team/iu,
  },
  pain: {
    label: ["Проблема клиента", "Customer pain"],
    hint: [
      "Опиши, что клиент теряет или не может сделать сегодня.",
      "Describe what the customer loses or cannot do today.",
    ],
    match:
      /теря|трат|сложно|проблем|не\s+мог|вручную|ошиб|дорого|час|lose|losing|waste|struggl|problem|cannot|can't|manual|error|expensive|hours/iu,
  },
  product: {
    label: ["Что делает продукт", "What the product does"],
    hint: [
      "Скажи, что именно делает продукт для клиента.",
      "Say what your product actually does for the customer.",
    ],
    match:
      /продукт|сервис|приложен|платформ|решени|product|service|app\b|platform|solution/iu,
  },
  mechanism: {
    label: ["Пример действия", "Concrete action"],
    hint: [
      "Приведи действие: клиент загружает, выбирает или получает конкретный результат.",
      "Give an action: the customer uploads, selects, or receives a specific result.",
    ],
    match:
      /загружа|выбира|получа|автомат|сокраща|отправ|брони|созда|upload|select|receive|automat|reduce|send|book|creat/iu,
  },
  observed: {
    label: ["Измеренный результат", "Observed result"],
    hint: [
      "Приведи измеренный результат с единицей: клиенты, заказы, выручка. Отдели факт от прогноза.",
      "Give an observed result with a unit: customers, orders, or revenue. Separate facts from forecasts.",
    ],
    test: (s) => metric.test(s) && !future.test(s),
  },
  context: {
    label: ["Период или источник", "Period or source"],
    hint: [
      "Укажи период измерения или источник результата: интервью, аналитика, платежи.",
      "Name the measurement period or source: interviews, analytics, or payments.",
    ],
    test: (s) =>
      !future.test(s) &&
      (metric.test(s) ||
        /измер|провер|аналитик|интервью|measur|validat|analytic|interview/iu.test(
          s,
        )) &&
      (time.test(s) ||
        /аналитик|интервью|crm\b|analytics|interview|плат[её]ж|payment/iu.test(
          s,
        )),
  },
  model: {
    label: ["Модель дохода", "Revenue model"],
    hint: [
      "Объясни, кто платит и за какую ценность: подписка, комиссия или продажа.",
      "Explain who pays for what value: subscription, commission, or sales.",
    ],
    match:
      /подписк|плат[яи]|комисси|прода|выручк|subscription|pay|commission|sales|revenue/iu,
  },
  price: {
    label: ["Цена или экономика", "Price or economics"],
    hint: [
      "Назови цену с валютой или измеренную стоимость обслуживания клиента.",
      "State a price with currency or a measured cost of serving a customer.",
    ],
    test: (s) =>
      money.test(s) &&
      /подписк|плат|цен|стоим|выручк|себесто|subscription|pay|price|cost|revenue/iu.test(
        s,
      ),
  },
  allocation: {
    label: ["Использование ресурсов", "Use of resources"],
    hint: [
      "Назови конкретное направление расходов: разработка, найм, продажи или проверка гипотезы.",
      "Name a use of funds: development, hiring, sales, or testing a hypothesis.",
    ],
    test: (s) =>
      /разработ|найм|нанять|маркетинг|продаж|провер|development|hir|marketing|sales|test/iu.test(
        s,
      ) &&
      /инвест|деньг|средств|раунд|потрат|направ|raising|fund|invest|spend|use|budget/iu.test(
        s,
      ),
  },
  milestone: {
    label: ["Цель и срок", "Milestone and deadline"],
    hint: [
      "Соедини проверяемый результат со сроком: что должно измениться и к какому моменту.",
      "Connect a measurable outcome to a deadline: what changes, and by when.",
    ],
    test: (s) =>
      time.test(s) &&
      /запуст|провер|достич|привле|получ|клиент|пользовател|выручк|launch|validat|reach|acquir|customer|user|revenue/iu.test(
        s,
      ),
  },
  experiment: {
    label: ["Способ проверки", "Validation method"],
    hint: [
      "Опиши проверку спроса: интервью, пилот, предзаказ или эксперимент с оплатой.",
      "Describe a demand test: interviews, a pilot, preorders, or a payment experiment.",
    ],
    match:
      /интервью|пилот|предзаказ|эксперимент|тест|опрос|interview|pilot|preorder|experiment|test|survey/iu,
  },
  risk: {
    label: ["Риск или альтернатива", "Risk or alternative"],
    hint: [
      "Назови конкретный риск или альтернативу, которую клиент выбирает сейчас.",
      "Name a specific risk or an alternative the customer uses today.",
    ],
    match:
      /риск|конкурент|альтернатив|скопир|risk|competitor|alternative|cop/iu,
  },
  defense: {
    label: ["Преимущество или проверка", "Advantage or test"],
    hint: [
      "Объясни преимущество через данные, доступ к клиентам, технологию или проверяемый эксперимент.",
      "Explain the advantage through data, customer access, technology, or a testable experiment.",
    ],
    match:
      /данн|доступ|технолог|патент|эксперимент|партн[её]р|data|access|technolog|patent|experiment|partner/iu,
  },
};
export const topicDefinitions = [
  {
    id: "problem",
    name: ["Проблема и клиент", "Problem & customer"],
    checks: ["customer", "pain"],
  },
  {
    id: "solution",
    name: ["Решение и продукт", "Solution & product"],
    checks: ["product", "mechanism"],
  },
  {
    id: "traction",
    name: ["Доказательства спроса", "Demand evidence"],
    checks: ["observed", "context"],
  },
  {
    id: "business",
    name: ["Бизнес-модель", "Business model"],
    checks: ["model", "price"],
  },
  {
    id: "ask",
    name: ["Запрос и план", "Ask & plan"],
    checks: ["allocation", "milestone"],
  },
];
function inspect(text, ids) {
  const parts = sentences(text);
  return ids.map((id) => {
    const rule = criteria[id];
    const evidence =
      parts.find(
        (s) =>
          wordCount(s) >= 4 &&
          !denied.test(s) &&
          (rule.test ? rule.test(s) : rule.match.test(s)),
      ) || "";
    return {
      id,
      label: rule.label,
      hint: rule.hint,
      found: !!evidence,
      quote: evidence.slice(0, 320),
    };
  });
}
export function analyzePitch(text, t = choose) {
  const topics = topicDefinitions.map((topic) => {
    const checks = inspect(text, topic.checks);
    const points = checks.filter((c) => c.found).length * 5;
    return {
      ...topic,
      checks,
      points,
      found: points > 0,
      label: t(...topic.name),
      quote: checks.find((c) => c.found)?.quote || "",
      status: points === 10 ? "supported" : points ? "partial" : "missing",
    };
  });
  return {
    version: SCORING_VERSION,
    words: wordCount(text),
    topics,
    score: topics.reduce((sum, topic) => sum + topic.points, 0),
    metrics: (
      text.match(/\d+(?:[.,]\d+)?\s*(?:%|[$€₽₸]|тыс|млн|k|million)?/giu) || []
    ).slice(0, 6),
    excerpt: sentences(text)[0]?.slice(0, 180) || "",
  };
}
export function createQuestions(text, arena, ask, t = choose) {
  const a = analyzePitch(text, t);
  const topic = (id) => a.topics.find((x) => x.id === id);
  const quote = (id) => topic(id).quote || a.excerpt;
  const hasEvidence = topic("traction").checks[0].found;
  const questions = [
    {
      id: "customer",
      topicId: "problem",
      checks: ["customer", "pain"],
      text: t(
        `Ты сказал: «${quote("problem")}». Кто твой первый клиент и что он теряет из-за этой проблемы?`,
        `You said: “${quote("problem")}”. Who is your first customer, and what does this problem cost them?`,
      ),
    },
    {
      id: "demand",
      topicId: "traction",
      checks: hasEvidence
        ? ["observed", "context"]
        : ["experiment", "milestone"],
      text: hasEvidence
        ? t(
            `В питче: «${quote("traction")}». Как измерен этот результат? Укажи число с единицей, период или источник.`,
            `Your pitch says: “${quote("traction")}”. How was that result measured? Give a number with its unit, period or source.`,
          )
        : t(
            "В тексте пока не найден измеренный спрос. Как ты проверишь его за следующие две недели: какой эксперимент и какой результат будешь считать успехом?",
            "I did not find measured demand in the text. How will you validate demand in the next two weeks: what experiment, and what outcome counts as success?",
          ),
    },
    {
      id: "economics",
      topicId: "business",
      checks: ["model", "price"],
      text: topic("business").found
        ? t(
            `Ты упомянул: «${quote("business")}». Кто платит, за какую ценность и какова цена или стоимость обслуживания клиента?`,
            `You mentioned: “${quote("business")}”. Who pays, for what value, and what is the price or cost of serving a customer?`,
          )
        : t(
            "Кто будет платить за продукт, за что и сколько? Если цена — гипотеза, скажи об этом.",
            "Who will pay for the product, for what, and how much? If the price is a hypothesis, say so.",
          ),
    },
    {
      id: "funding",
      topicId: "ask",
      checks: ["allocation", "milestone"],
      text: t(
        `В заявке $${Number(ask).toLocaleString("en-US")}. На что направишь средства и какого результата достигнешь за определённый срок?`,
        `Your funding ask is $${Number(ask).toLocaleString("en-US")}. How will you use the funds, and what milestone will you reach by a specific deadline?`,
      ),
    },
    arena.level >= 3
      ? {
          id: "risk",
          topicId: "solution",
          checks: ["risk", "defense"],
          text: t(
            `О решении прозвучало: «${quote("solution")}». Какой конкурент или риск угрожает продукту? Обоснуй преимущество или предложи эксперимент для его проверки.`,
            `About your solution: “${quote("solution")}”. What competitor or risk threatens the product? Explain your advantage or an experiment to test it.`,
          ),
        }
      : {
          id: "demo",
          topicId: "solution",
          checks: ["product", "mechanism"],
          text: t(
            `Ты сказал: «${quote("solution")}». Что уже можно попробовать в продукте? Покажи одно действие клиента и результат.`,
            `You said: “${quote("solution")}”. What can users try today? Walk through one customer action and the result.`,
          ),
        },
  ];
  // Product-first practice for nFactorial; all five dimensions remain represented.
  const ordered =
    arena.id === "nfactorial"
      ? [questions[4], ...questions.slice(0, 4)]
      : questions;
  return ordered.map((question, index) => ({
    ...question,
    speakerIndex:
      arena.id === "arena"
        ? { problem: 0, traction: 1, business: 2, ask: 2, solution: 0 }[
            question.topicId
          ]
        : index % (arena.personaIds?.length || 3),
  }));
}
export const questionsFromPitch = (text, arena, ask, t) =>
  createQuestions(text, arena, ask, t).map((q) => q.text);
export function evaluateAnswer(text, question) {
  const checks = inspect(text, question.checks);
  return {
    questionId: question.id,
    topicId: question.topicId,
    checks,
    points: checks.filter((c) => c.found).length * 5,
    quote: text.trim().slice(0, 320),
  };
}
export function createFollowUp(answer, question, report, t = choose) {
  const missing = report.checks.find((c) => !c.found);
  if (!missing || question.followUp) return null;
  return {
    ...question,
    id: `${question.id}-followup`,
    followUp: true,
    parentId: question.id,
    text: t(
      `Уточнение к твоему ответу: «${answer.trim().slice(0, 180)}». ${missing.hint[0]}`,
      `A follow-up to your answer: “${answer.trim().slice(0, 180)}”. ${missing.hint[1]}`,
    ),
  };
}
export function evaluateSession({ pitch, questions, answers, arena }) {
  const analysis = analyzePitch(pitch);
  const answerReports = questions.map((q, i) =>
    evaluateAnswer(answers[i] || "", q),
  );
  // A follow-up can fill a missing criterion, but cannot create a sixth reward slot.
  const answerTopics = questions
    .filter((q) => !q.followUp)
    .map((q) => {
      const indices = questions.flatMap((item, i) =>
        item.id === q.id || item.parentId === q.id ? [i] : [],
      );
      const checks = q.checks.map(
        (id) =>
          indices
            .map((i) => answerReports[i].checks.find((c) => c.id === id))
            .find((c) => c?.found) ||
          answerReports[indices[0]].checks.find((c) => c.id === id),
      );
      return {
        topicId: q.topicId,
        checks,
        points: checks.filter((c) => c.found).length * 5,
      };
    });
  const dimensions = analysis.topics
    .map((topic) => ({
      id: topic.id,
      name: topic.name,
      pitchPoints: topic.points,
      answerPoints:
        answerTopics.find((a) => a.topicId === topic.id)?.points || 0,
    }))
    .map((d) => ({ ...d, points: d.pitchPoints + d.answerPoints }));
  const score = dimensions.reduce((sum, d) => sum + d.points, 0);
  const focus = [...analysis.topics].sort((a, b) => a.points - b.points)[0];
  const pitchTarget = focus.checks.find((c) => !c.found);
  const answerFocus = [...answerTopics].sort((a, b) => a.points - b.points)[0];
  const target = pitchTarget || answerFocus?.checks.find((c) => !c.found);
  const goalTopic = pitchTarget
    ? focus
    : analysis.topics.find((topic) => topic.id === answerFocus?.topicId);
  return {
    analysis,
    answerReports,
    dimensions,
    score,
    scoringVersion: SCORING_VERSION,
    coverage: answerTopics.filter((a) => a.points === 10).length,
    evidence: answerTopics.filter((a) =>
      a.checks.some((c) => c.found && ["observed", "price"].includes(c.id)),
    ).length,
    numericEvidence: answerTopics.flatMap((a) =>
      a.checks
        .filter((c) => c.found && ["observed", "price"].includes(c.id))
        .map((c) => c.id),
    ),
    words: wordCount(answers.join(" ")),
    xp: arena.xp + Math.floor(score / 10) * 5,
    stars: score >= 80 ? 3 : score >= 50 ? 2 : 1,
    nextGoal: target
      ? {
          topicId: goalTopic.id,
          criterionId: target.id,
          source: pitchTarget ? "pitch" : "answer",
          title: goalTopic.name,
          instruction: target.hint,
          quote: pitchTarget ? focus.quote : "",
        }
      : {
          topicId: "traction",
          title: ["Проверь доказательства", "Check your evidence"],
          instruction: [
            "Все элементы найдены. Проверь источники цифр и попробуй объяснить тот же результат короче.",
            "All elements were found. Check your sources and try explaining the same result more concisely.",
          ],
          quote: analysis.topics.find((a) => a.id === "traction").quote,
        },
  };
}
const projectKey = (r) =>
  r.startup?.trim().normalize("NFKC").toLocaleLowerCase() || "";
export function compareAttempt(current, history) {
  const index = history.findIndex((r) => r.id === current.id);
  const older = index < 0 ? history : history.slice(index + 1);
  const candidate = older.find(
    (r) =>
      projectKey(r) === projectKey(current) &&
      r.arenaId === current.arenaId &&
      r.pitchLimit === current.pitchLimit &&
      r.scoringVersion === current.scoringVersion &&
      Array.isArray(r.dimensions) &&
      Number.isFinite(r.analysis?.score),
  );
  if (
    !candidate ||
    !current.dimensions ||
    !Number.isFinite(current.analysis?.score) ||
    current.scoringVersion !== SCORING_VERSION
  )
    return null;
  return {
    previousId: candidate.id,
    date: candidate.date,
    delta: current.score - candidate.score,
    previousScore: candidate.score,
    pitchDelta: current.analysis.score - candidate.analysis.score,
    dimensions: current.dimensions
      .map((d) => ({
        ...d,
        previous: candidate.dimensions.find((p) => p.id === d.id)?.points ?? 0,
      }))
      .map((d) => ({ ...d, delta: d.points - d.previous })),
  };
}
// Keep permitted phase transitions independent from React and media side effects.
export function transitionPhase(phase, event) {
  const next = {
    ready: { START: "pitch" },
    pitch: { STOP: "review" },
    review: { ANALYZE: "analysis" },
    analysis: { EDIT: "review", QUESTIONS: "qa" },
    qa: { COMPLETE: "completed" },
  };
  return next[phase]?.[event] || phase;
}

export function summarizeScores(history) {
  const scores = history
    .filter(
      (r) => r.scoringVersion === SCORING_VERSION && Number.isFinite(r.score),
    )
    .map((r) => r.score);
  return {
    average: scores.length
      ? Math.round(
          scores.reduce((sum, score) => sum + score, 0) / scores.length,
        )
      : null,
    best: scores.length ? Math.max(...scores) : null,
  };
}
