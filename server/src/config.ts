import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

export const config = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST ?? "127.0.0.1",
  // по умолчанию браузер видимый: так капчу можно пройти руками прямо в окне
  headless: process.env.HEADLESS === "true",
  sessionsDir: process.env.SESSIONS_DIR ?? `${root}sessions`,
  // скриншоты и HTML страницы, на которой сломался вход
  debugDir: process.env.DEBUG_DIR ?? `${root}debug`,
  // собранный фронт отдаётся тем же сервером, если он есть
  clientDir: process.env.CLIENT_DIR ?? `${root}../client/dist`,
  // Basic-авторизация на всё, кроме /healthz. Обязательна, если сервер
  // слушает не только localhost: API принимает пароль от hh.ru.
  auth:
    process.env.AUTH_USER && process.env.AUTH_PASSWORD
      ? { user: process.env.AUTH_USER, password: process.env.AUTH_PASSWORD }
      : null,
} as const;

export const isLoopback = (host: string) =>
  host === "127.0.0.1" || host === "localhost" || host === "::1";
