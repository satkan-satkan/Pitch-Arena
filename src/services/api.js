export class ApiError extends Error {
  constructor(code, status) {
    super(code);
    this.status = status;
  }
}
export async function api(
  path,
  { method = "GET", data, headers = {}, raw = false } = {},
) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: {
        ...(data !== undefined && !raw
          ? { "Content-Type": "application/json" }
          : {}),
        ...headers,
      },
      body: data === undefined ? undefined : raw ? data : JSON.stringify(data),
    });
  } catch {
    throw new ApiError("SERVER_OFFLINE", 0);
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError("SERVER_OFFLINE", response.status);
  }
  if (!response.ok)
    throw new ApiError(payload.error || "SERVER_ERROR", response.status);
  return payload;
}
export function errorText(error, t) {
  const messages = {
    INVALID_IMAGE: [
      "Изображение не удалось прочитать. Загрузи JPG, PNG или WebP заново.",
      "Could not read this image. Upload a JPG, PNG or WebP again.",
    ],
    CATALOG_ID_EXISTS: [
      "Этот ID уже занят. Укажи другой.",
      "This ID already exists. Choose another.",
    ],
    INVALID_ARENA: ["Выбери существующую арену.", "Choose an existing arena."],
    INVALID_FILTER: [
      "Проверь валюту и порядок сортировки.",
      "Check the currency and sort order.",
    ],
    NOT_FOUND: [
      "Карточка недоступна или ещё не опубликована.",
      "This listing is unavailable or not published yet.",
    ],
    TEAM_ACCESS_REQUIRED: [
      "Нет прав на изменение этой карточки.",
      "You cannot edit this listing.",
    ],
    TEAM_OWNER_REQUIRED: [
      "Управлять участниками может только владелец команды.",
      "Only the team owner can manage members.",
    ],
    ALREADY_MEMBER: [
      "Этот человек уже в команде.",
      "This person is already on the team.",
    ],
    STALE_LISTING: [
      "Карточка изменилась. Закрой форму и обнови страницу перед повтором.",
      "This record changed. Close the form and reload before trying again.",
    ],
    INVALID_LISTING_STATE: [
      "Статус карточки изменился. Обнови страницу.",
      "The listing status changed. Reload the page.",
    ],
    ADMIN_REQUIRED: [
      "Доступ только для администратора.",
      "Administrator access required.",
    ],
    ACCOUNT_BLOCKED: [
      "Доступ к аккаунту приостановлен.",
      "This account is blocked.",
    ],
    STALE_ADMIN_DATA: [
      "Данные уже изменились. Закрой форму, обнови список и повтори.",
      "Data changed. Close the editor, refresh and try again.",
    ],
    SELF_LOCKOUT: [
      "Нельзя заблокировать себя или снять свою роль администратора.",
      "You cannot block yourself or remove your own admin role.",
    ],
    LAST_ADMIN: [
      "Нельзя удалить последнего активного администратора.",
      "The last active administrator must remain.",
    ],
    START_ARENA_REQUIRED: [
      "Стартовая арена должна оставаться доступной.",
      "The starting arena must remain available.",
    ],
    ARENA_UNAVAILABLE: [
      "Арена временно недоступна. Выбери другую.",
      "This arena is temporarily unavailable. Choose another.",
    ],
    SERVER_OFFLINE: [
      "Сервер недоступен. Проверь соединение и повтори. Текст остаётся на этом устройстве.",
      "Server unavailable. Check your connection and retry. Text remains on this device.",
    ],
    LOGIN_REQUIRED: ["Нужно войти в аккаунт.", "Please sign in."],
    INVALID_CREDENTIALS: [
      "Неверный email или пароль.",
      "Incorrect email or password.",
    ],
    EMAIL_IN_USE: [
      "Этот email уже зарегистрирован.",
      "This email is already registered.",
    ],
    INVALID_INPUT: [
      "Проверь введённые данные. Пароль — от 12 символов.",
      "Check your input. Passwords need at least 12 characters.",
    ],
    STALE_SESSION: [
      "Версия на сервере изменилась. Загрузка серверной версии заменит текст и этап в этой комнате.",
      "The server version has changed. Loading it will replace the text and stage in this room.",
    ],
    SESSION_CLOSED: [
      "Тренировка уже завершена. Загрузи сохранённый результат.",
      "This practice is already complete. Load the saved result.",
    ],
    SESSION_BUSY: [
      "Сервер обрабатывает тренировку. Повтори через несколько секунд.",
      "The server is processing this session. Retry in a few seconds.",
    ],
    DRAFT_EXISTS: [
      "Сначала продолжи или удали незавершённую тренировку на главной.",
      "Resume or discard the unfinished practice on the home screen first.",
    ],
    RATE_LIMITED: [
      "Слишком много запросов. Попробуй позже.",
      "Too many requests. Please try again later.",
    ],
    STORAGE_LIMIT: [
      "Лимит файлов: 40 МБ на презентацию и 100 МБ на аккаунт.",
      "File limit: 40 MB per deck and 100 MB per account.",
    ],
    INVALID_FILE_CONTENT: [
      "Файл не соответствует выбранному формату.",
      "The file contents do not match its format.",
    ],
    INCOMPLETE_SESSION: [
      "Сначала закончи все ответы.",
      "Finish all answers first.",
    ],
  };
  return t(
    ...(messages[error.message] || [
      "Не удалось сохранить действие. Повтори попытку.",
      "Could not save this action. Please retry.",
    ]),
  );
}
export function sessionClient(initial) {
  let snapshot = initial,
    queue = Promise.resolve();
  const enqueue = (task) => {
    const result = queue.catch(() => {}).then(task);
    queue = result;
    return result;
  };
  return {
    get snapshot() {
      return snapshot;
    },
    refresh() {
      return enqueue(async () => {
        snapshot = await api(`/sessions/${snapshot.id}`);
        return snapshot;
      });
    },
    call(action, data = {}, method = "POST", extra = {}) {
      return enqueue(async () => {
        const response = await api(
          `/sessions/${snapshot.id}${action ? `/${action}` : ""}`,
          {
            method,
            data,
            ...extra,
            headers: {
              ...extra.headers,
              "If-Match": String(snapshot.revision),
            },
          },
        );
        if (response.revision !== undefined)
          snapshot = { ...snapshot, ...response };
        return response;
      });
    },
    save(state) {
      return this.call(
        "draft",
        {
          phase: state.phase,
          pitch: state.pitch,
          answer: state.answer,
          slide: state.slide,
          voiceEnabled: state.voiceEnabled,
          pitchDuration: state.pitchDuration,
        },
        "PUT",
      );
    },
  };
}
export async function hydrateSession(snapshot) {
  const files = await Promise.all(
    snapshot.assets.map(async (asset) => {
      const response = await fetch(asset.url, { credentials: "same-origin" });
      if (!response.ok) throw new ApiError("SERVER_OFFLINE", response.status);
      return new File([await response.blob()], asset.name, {
        type: asset.type,
      });
    }),
  );
  return {
    ...snapshot.config,
    files,
    cloud: sessionClient(snapshot),
    restored: snapshot.state,
    startedAt: snapshot.startedAt,
    deadline: snapshot.deadline,
    id: snapshot.id,
    projectId: snapshot.projectId,
  };
}
