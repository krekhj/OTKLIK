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

Нужны VPS с Docker и Compose и домен (поддомен) с A-записью на IP сервера.
Контейнер слушает только `127.0.0.1:${APP_PORT}` (по умолчанию 3100) — снаружи
сайт открывается через reverse proxy, который уже стоит на VPS.

```bash
git clone <repo> otklik && cd otklik
cp .env.example .env
# AUTH_USER, AUTH_PASSWORD (длинный случайный: openssl rand -base64 24),
# APP_PORT — любой свободный порт на хосте (проверить: ss -ltn | grep :3100)
docker compose up -d --build
docker compose logs -f otklik        # ждём «auth on · headless false»
curl -s 127.0.0.1:3100/healthz       # {"ok":true}
```

### nginx на VPS (порты 80/443 заняты им)

Готовый конфиг — [`docker/nginx.conf.example`](docker/nginx.conf.example):

```bash
sudo cp docker/nginx.conf.example /etc/nginx/sites-available/otklik
sudoedit /etc/nginx/sites-available/otklik      # домен; порт, если менял APP_PORT
sudo ln -s /etc/nginx/sites-available/otklik /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d otklik.example.com      # HTTPS
```

Важно для `/api/run/events` (живой прогресс, SSE): `proxy_buffering off` и
длинный `proxy_read_timeout` — в примере уже есть. Другой прокси (Traefik,
Caddy на хосте, Nginx Proxy Manager) — проксируй домен на `127.0.0.1:3100` и
отключи буферизацию для `/api/run/events`.

### Если 80/443 свободны — встроенный Caddy

В `.env` задай `DOMAIN`, затем `docker compose --profile caddy up -d --build`:
Caddy сам получит сертификат Let's Encrypt.

### Что внутри

| Сервис | Что делает |
|---|---|
| `otklik` | образ Playwright: Node + Chromium. Сервер отдаёт и API, и собранный фронт. Chromium запускается **с окном** внутри виртуального дисплея Xvfb — без окна hh показывает другую проверку, и капча не доходит до страницы |
| `caddy` | необязательный (профиль `caddy`): HTTPS и прокси на `otklik:3000` |

Данные — том `otklik-data`: `/data/sessions` (сессии hh, зашифрованы) и
`/data/debug` (скриншоты страницы, на которой сломался вход:
`docker compose cp otklik:/data/debug ./debug`).

Обновление: `git pull && docker compose up -d --build`.

Защита:

- сервер не стартует, если слушает сеть без `AUTH_USER`/`AUTH_PASSWORD` или пароль
  остался заглушкой / короче 12 символов;
- порт контейнера проброшен только на `127.0.0.1` — напрямую из интернета не виден;
- контейнер бота работает от непривилегированного `pwuser`.

Учти:

- hh.ru строже к IP дата-центров: капча будет чаще, чем дома, а зарубежный VPS hh может
  ограничивать. Лучше VPS в России;
- браузер с окном ест память: закладывай от 1 ГБ RAM на контейнер (`shm_size: 1gb` уже задан);
- бот один на сервер: одновременно идёт только один прогон.
