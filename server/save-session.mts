import { chromium } from "playwright";
import { login } from "./src/hh-bot/bot.service.js";
import { sessionFile } from "./src/hh-bot/bot.session.js";

// Запуск: HH_LOGIN=... HH_PASSWORD=... npm run session
// Открывает видимый браузер и заполняет форму входа.
// Если hh.ru попросит капчу — пройди её руками в открытом окне (есть 5 минут).
// После успешного входа сессия сохранится в sessions/ (зашифрованной паролем)
// и бот подхватит её сам, если в форме ввести тот же пароль.

const credentials = {
  login: process.env.HH_LOGIN ?? "",
  password: process.env.HH_PASSWORD ?? "",
};
if (!credentials.login || !credentials.password) {
  console.error("Задай HH_LOGIN и HH_PASSWORD (в .env или в окружении).");
  process.exit(1);
}

const browser = await chromium.launch({ headless: false });
try {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  console.log("Если появилась капча — пройди её в открытом окне браузера.");
  await login(
    page,
    ctx,
    { ...credentials, authMode: "password", sessionSecret: credentials.password },
    { timeout: 300_000 },
  );
  console.log(`Вход выполнен, сессия сохранена в ${sessionFile(credentials.login)}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
