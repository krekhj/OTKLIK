# syntax=docker/dockerfile:1

# ── фронт ────────────────────────────────────────────────────────────
FROM node:24-slim AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── сервер: TypeScript → dist, затем только прод-зависимости ─────────
FROM node:24-slim AS server
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/tsconfig.json server/tsconfig.build.json ./
COPY server/src ./src
RUN npm run build && npm prune --omit=dev

# ── рантайм: образ Playwright уже содержит Chromium, его системные
#    библиотеки и Xvfb. Версия образа = версии playwright в package-lock.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

# Браузер с окном внутри виртуального дисплея: без окна hh показывает
# другую проверку, и капча не доходит до страницы (см. README).
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    HEADLESS=false \
    DISPLAY=:99 \
    SESSIONS_DIR=/data/sessions \
    DEBUG_DIR=/data/debug \
    CLIENT_DIR=/app/client/dist

WORKDIR /app/server
COPY --from=server /app/server/package.json ./
COPY --from=server /app/server/node_modules ./node_modules
COPY --from=server /app/server/dist ./dist
COPY --from=client /app/client/dist /app/client/dist
# без COPY --chmod: тот требует BuildKit, а старый docker-compose v1 собирает без него
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# /data — том с сессиями; pwuser — непривилегированный пользователь образа
RUN chmod 755 /usr/local/bin/entrypoint.sh \
    && sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
    && mkdir -p /data/sessions /data/debug \
    && chown -R pwuser:pwuser /data \
    && chmod 700 /data/sessions
USER pwuser
VOLUME /data

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

ENTRYPOINT ["entrypoint.sh"]
CMD ["node", "dist/main.js"]
