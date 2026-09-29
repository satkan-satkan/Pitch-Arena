# UI: React, TypeScript, Tailwind и shadcn

Проект уже настроен. Повторно создавать приложение или запускать `shadcn init` не нужно.

## Пути

- `src/components/ui/` — переиспользуемые TSX-компоненты. Это физический путь для импорта `@/components/ui`, поскольку `@` указывает на `src`.
- `src/components/ui/profile-selector.tsx` — предоставленный владельцем ProfileSelector и ProfileIcon.
- `src/components/ui/demo.tsx` — отдельный пример с исходными URL картинок; не используется в рабочем интерфейсе.
- `src/lib/utils.ts` — `cn` через `clsx` и `tailwind-merge`.
- `src/tailwind.css` — Tailwind v4, переменные темы и utilities.
- `src/styles.css` и CSS модулей — существующие стили приложения; `src/studio.css` — оформление ночной студии, подключается последним.
- `components.json` — конфигурация shadcn и алиасы. `vite.config.js` и `tsconfig.json` согласованы по `@/*`.

Папка `components/ui` отделяет общие UI-примитивы от бизнес-компонентов (`Community`, `Landing`, `AdminPanel`). Она также даёт shadcn CLI предсказуемый путь. Создавать вторую папку `/components/ui` в корне не следует: она не соответствовала бы алиасу проекта.

Старые JSX-модули работают без переписывания. Новые `.ts`/`.tsx` проверяются строгим TypeScript; существующий JavaScript пока не проверяется типизатором (`checkJs: false`).

## Подключение предоставленного компонента

Сохранены круглые профили, адаптивная сетка, изображения или React-иконки, подъём при наведении и видимый фокус. Добавлены локализованные подписи, выбранное состояние, блокировка на время запроса и ограничение числа колонок количеством профилей.

В рабочем интерфейсе используются реальные команды и приглашения из API, инициалы команды и кнопка создания. Нажатие на приглашение открывает окно; членство появляется только после «Принять». Демо не подменяет пользовательские данные. Пример использует доступный статус вместо `alert`.

## Draggable Widget Grid в карточке стартапа

Предоставленный владельцем `draggable-widget-grid.tsx` находится в `src/components/ui/`. Импорт — `@/components/ui/draggable-widget-grid`. Сетка встроена в подробную публичную карточку через `StartupWidgets.jsx`; демонстрационные данные AI observability из вложения не используются.

В проекте уже установлен `framer-motion`, который предоставляет используемые `motion`, `MotionConfig` и `useDragControls`. Поэтому импорт `motion/react` заменён на `framer-motion`, второй пакет Motion не нужен. TypeScript, Tailwind и shadcn-алиасы уже настроены. Для токенов компонента добавлены `card`, `card-foreground` и `border` в `src/tailwind.css`.

Адаптации: одна колонка на телефоне, RU/EN-подсказки, учёт общей настройки анимаций, режим просмотра по умолчанию, прокрутка длинного текста и исключение элементов формы из начала перетаскивания. Режим «Переставить блоки» включает мышь, удержание на сенсорном экране и Alt + стрелки. «Готово» возвращает рабочие ссылки и выделение текста; «Сбросить» восстанавливает исходный порядок.

Сохраняются только ID шести блоков в `pa-startup-layout:v1:<startupId>`, отдельно для каждого стартапа. Это личная настройка браузера, не редактирование опубликованной карточки и не серверная настройка автора. Неизвестные/дублированные ID сбрасываются к исходной сетке. Публикация по-прежнему показывает только одобренные данные; выручка обозначена как неподтверждённая.

Проверка: `npm run build && npm run test:world`. Проверяются мышь, клавиатура, touch swipe, long press, восстановление порядка после перезагрузки, RU/EN и мобильная колонка.

## Запуск и проверка проекта

```sh
npm install
npm run typecheck
npm run build
npm run dev:all
```

Для воспроизведения установки в прежней Vite/React-версии нужны:

```sh
npm install clsx tailwind-merge lucide-react
npm install -D tailwindcss @tailwindcss/vite typescript @types/react @types/react-dom @types/node
```

Далее подключить `tailwindcss()` в Vite, добавить алиас, `tsconfig.json`, `components.json`, `cn` и импорт CSS — всё это уже сделано в этом репозитории. Tailwind Preflight не подключён: существующий reset остаётся владельцем глобальных стилей, чтобы внедрение utilities не меняло старые формы.

Для **нового, пустого** Vite-проекта можно использовать `npm create vite@latest my-app -- --template react-ts`, затем настройку Tailwind и `npx shadcn@latest init` по [официальной инструкции](https://ui.shadcn.com/docs/installation/vite). В готовом Pitch Arena CLI читает имеющийся `components.json`; новые компоненты добавляются командой `npx shadcn@latest add <component>`, после чего нужно проверить их семантические токены и глобальные стили.

Источники настройки: [shadcn components.json](https://ui.shadcn.com/docs/components-json), [Tailwind без Preflight](https://tailwindcss.com/docs/preflight#disabling-preflight).
