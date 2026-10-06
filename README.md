# OTKLIK

Автоотклики на hh.ru: настроить один раз на странице, бот откликается сам.

- `client/` — React + Vite, FSD
- `server/` — Node без фреймворков (`node:http`), vertical slices, бот на Playwright.
  Подробности о боте, API и ловушках hh — в [`server/README.md`](server/README.md).

## Локально

```bash
cd server && npm install && cp .env.example .env && npm run dev   # API :3000
cd client && npm install && npm run dev                           # Vite, /api → :3000
```

Перед деплоем: `cd server && npm test` и `cd client && npm run lint && npm run build`.

## Деплой на VPS (Docker)

Нужны: VPS с Docker и Compose, домен с A-записью на IP сервера, открытые порты 80 и 443.

```bash
git clone <repo> otklik && cd otklik
cp .env.example .env
# заполни DOMAIN, AUTH_USER и AUTH_PASSWORD (длинный случайный: openssl rand -base64 24)
docker compose up -d --build
docker compose logs -f otklik
```

Открой `https://<DOMAIN>`: браузер спросит логин и пароль из `AUTH_USER`/`AUTH_PASSWORD`.

Что внутри:

| Сервис | Что делает |
|---|---|
| `otklik` | образ Playwright: Node + Chromium. Сервер отдаёт и API, и собранный фронт. Chromium запускается **с окном** внутри виртуального дисплея Xvfb — без окна hh показывает другую проверку, и капча не доходит до страницы |
| `caddy` | HTTPS с автоматическим сертификатом Let's Encrypt и прокси на `otklik:3000` |

Данные:

- том `otklik-data` → `/data/sessions` (сессии hh, зашифрованы паролем пользователя) и
  `/data/debug` (скриншоты страницы, на которой сломался вход:
  `docker compose cp otklik:/data/debug ./debug`);
- тома `caddy-data`/`caddy-config` — сертификаты.

Обновление: `git pull && docker compose up -d --build`.

Защита:

- сервер не стартует, если слушает сеть без `AUTH_USER`/`AUTH_PASSWORD` или пароль
  остался заглушкой / короче 12 символов;
- наружу открыт только Caddy (80/443), `otklik` доступен лишь внутри сети compose;
- контейнер бота работает от непривилегированного `pwuser`.

Учти:

- hh.ru строже к IP дата-центров: капча будет чаще, чем дома, а зарубежный VPS hh может
  ограничивать. Лучше VPS в России;
- браузер с окном ест память: закладывай от 1 ГБ RAM на контейнер (`shm_size: 1gb` уже задан);
- бот один на сервер: одновременно идёт только один прогон.

Без Caddy (свой nginx/traefik на хосте): убери сервис `caddy` и раскомментируй
`ports: ["127.0.0.1:3000:3000"]` у `otklik`. Для `/api/run/events` (SSE) в прокси
отключи буферизацию (`proxy_buffering off` в nginx).
