// Точка входа бота: вход, применение фильтров и запуск цикла откликов.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type BrowserContext, type Locator, type Page } from "playwright";
import { config } from "../config.js";
import { BAD_CODE_TEXT, BAD_CREDENTIALS_TEXT, LIMITS, SELECTORS, TIMEOUTS, URLS } from "./bot.constants.js";
import { isCaptchaShown, solveCaptcha } from "./bot.captcha.js";
import { respondToVacancies } from "./bot.respond.js";
import { deleteSession, loadSession, saveSession } from "./bot.session.js";
import {
  BotError,
  type BotReporter,
  type CaptchaSolver,
  type CodeSolver,
  type RunConfig,
  type RunProgress,
} from "./bot.types.js";
import { bestEffort, firstLine, isVisible, openPage, searchUrl, waitVisible } from "./bot.utils.js";

type Solve = () => Promise<void>;

const CODE_WORD = /код|code/i;

// Ошибка hh на форме входа («Неверный email или пароль» и т. п.).
// Ищем только когда капчи нет: у капчи своё «неверно» про текст с картинки.
async function readLoginError(page: Page): Promise<string | null> {
  const candidates = await page.locator(SELECTORS.login.error).all();
  for (const el of candidates) {
    if (!(await el.isVisible().catch(() => false))) continue;
    const text = (await el.innerText({ timeout: TIMEOUTS.probe }).catch(() => "")).replace(/\s+/g, " ").trim();
    // «Неверный код» — не про логин/пароль: его разбирает enterEmailCode
    if (CODE_WORD.test(text)) continue;
    if (text && BAD_CREDENTIALS_TEXT.test(text)) return text.slice(0, 160);
  }
  return null;
}

async function throwIfLoginError(page: Page) {
  const error = await readLoginError(page);
  if (error) {
    throw new BotError("bad_credentials", `hh.ru: ${error}`);
  }
}

// Выполняет шаг входа, когда элемент появится. Если вместо него hh показал
// капчу — сначала отдаёт её человеку; время на капчу в таймаут не входит.
async function step(
  page: Page,
  target: Locator,
  action: (target: Locator) => Promise<void>,
  solve: Solve | undefined,
) {
  let deadline = Date.now() + TIMEOUTS.nav;
  for (;;) {
    if (solve && (await isCaptchaShown(page))) {
      await solve();
      deadline = Date.now() + TIMEOUTS.nav;
      continue;
    }
    await throwIfLoginError(page);
    if (await target.isVisible().catch(() => false)) return action(target);
    if (Date.now() > deadline) {
      throw new BotError(
        "login_timeout",
        "hh.ru login form did not respond as expected — check the login",
      );
    }
    await page.waitForTimeout(TIMEOUTS.poll);
  }
}

function leftLoginPage(page: Page): boolean {
  return !new URL(page.url()).pathname.startsWith("/account/login");
}

type Account = Pick<RunConfig, "login" | "authMode" | "password" | "sessionSecret">;

interface LoginOptions {
  timeout?: number;
  // кто решает капчу; без него (save-session) капчу проходят руками в окне
  captcha?: { solver: CaptchaSolver; signal: AbortSignal };
  // кто вводит код из письма — обязателен для режима code
  code?: { solver: CodeSolver; signal: AbortSignal };
}

const codeInputs = (page: Page) =>
  page.locator(SELECTORS.login.codeInput).filter({ visible: true });

// что сейчас набрано в поле/клетках кода
async function typedCode(page: Page): Promise<string> {
  const values = await codeInputs(page).evaluateAll((els) =>
    els.map((el) => (el as unknown as { value: string }).value),
  );
  return values.join("").replace(/[\s-]/g, "");
}

// Вводит код. Клетки по цифре заполняем каждую напрямую, а не печатью
// с переходом фокуса: виджет кода может перерисовывать клетки после каждой
// цифры, фокус теряется — и бот «застревал» на третьем символе.
async function typeCode(page: Page, code: string) {
  const cells = codeInputs(page);
  const count = await cells.count();

  if (count > 1) {
    for (let i = 0; i < Math.min(count, code.length); i++) {
      // nth каждый раз заново: после перерисовки старый элемент уже не в DOM
      await cells
        .nth(i)
        .fill(code[i]!, { timeout: TIMEOUTS.appear })
        .catch(() => {});
      if (leftLoginPage(page)) return; // форма отправилась сама после последней цифры
    }
  } else {
    await cells.first().fill(code, { timeout: TIMEOUTS.appear }).catch(() => {});
  }
  if (leftLoginPage(page)) return;

  // виджет не принял fill (слушает только клавиатуру) — печатаем как человек.
  // Ошибку прошлой попытки тут не смотрим: она может висеть до новой проверки.
  if ((await typedCode(page)) !== code) {
    const first = cells.first();
    await first.click({ timeout: TIMEOUTS.appear }).catch(() => {});
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Backspace");
    for (const digit of code) {
      if (leftLoginPage(page)) return;
      await page.keyboard.type(digit, { delay: 80 });
    }
  }
}

// Ошибка под полем кода — отдельно от ошибок логина: «неверный код» значит
// «спроси ещё раз», а не «данные неверны».
async function readCodeError(page: Page): Promise<string | null> {
  // сначала типичные контейнеры ошибок, затем любой видимый текст про код:
  // разметка ошибки у hh не стабильна
  const candidates = [
    ...(await page.locator(SELECTORS.login.error).all()),
    ...(await page.getByText(BAD_CODE_TEXT).all()).slice(0, 5),
  ];
  for (const el of candidates) {
    if (!(await el.isVisible().catch(() => false))) continue;
    const text = (await el.innerText({ timeout: TIMEOUTS.probe }).catch(() => "")).replace(/\s+/g, " ").trim();
    if (text && text.length < 200 && BAD_CODE_TEXT.test(text)) return text;
  }
  return null;
}

type CodeOutcome = "accepted" | "rejected" | "moved-on";

// Ждёт, чем кончилась отправка кода. Пока hh проверяет код, поле может
// пропасть и вернуться — это ещё не успех: успех — только уход со страницы входа.
async function waitCodeOutcome(
  page: Page,
  input: Locator,
  staleError: boolean,
  solve: Solve | undefined,
): Promise<CodeOutcome> {
  // Ошибка прошлой попытки может висеть и во время перепроверки. Считаем
  // ошибку ответом на этот код, только если hh точно проверил его заново:
  // ошибка исчезала, поле пропадало (крутилась проверка) или hh стёр код.
  let rechecked = !staleError;
  const deadline = Date.now() + TIMEOUTS.letter * 2;

  while (Date.now() < deadline) {
    if (leftLoginPage(page)) return "accepted";
    if (solve && (await isCaptchaShown(page))) {
      await solve();
      continue;
    }
    const visible = await input.isVisible().catch(() => false);
    if (!visible) {
      // поле спрятано — hh проверяет код; старая ошибка сейчас ничего не значит
      rechecked = true;
      await page.waitForTimeout(TIMEOUTS.poll * 2);
      continue;
    }
    if ((await input.inputValue({ timeout: TIMEOUTS.probe }).catch(() => "")) === "") rechecked = true; // hh стёр код
    const error = await readCodeError(page);
    if (!error) rechecked = true;
    else if (rechecked) {
      console.warn(`код не принят: ${error}`);
      return "rejected";
    }
    await page.waitForTimeout(TIMEOUTS.poll * 2);
  }

  if (await input.isVisible().catch(() => false)) {
    // поле на месте, со страницы не ушли — код не принят, хоть ошибку и не узнали;
    // сохраняем страницу, чтобы подобрать селектор ошибки
    const saved = await dumpPage(page, "code");
    console.warn(`код не принят, явной ошибки не нашёл${saved ? ` — страница: ${saved}.png` : ""}`);
    return "rejected";
  }
  return "moved-on"; // hh показал следующий шаг — его разберёт общий цикл
}

// Режим «код из почты»: hh отправляет код на email, человек вводит его на
// странице. Неверный код — спрашиваем снова, до LIMITS.codeAttempts раз.
async function enterEmailCode(
  page: Page,
  account: Account,
  code: NonNullable<LoginOptions["code"]>,
  solve: Solve | undefined,
) {
  const input = codeInputs(page).first();
  const submit = page.locator(SELECTORS.login.submit).first();
  await step(page, input, async () => {}, solve);

  let wrong = false;
  for (let attempt = 0; attempt < LIMITS.codeAttempts; attempt++) {
    const value = await code.solver({ email: account.login, wrong, attempt }, code.signal);
    // после неверного кода поле могли перерисовать — ждём, пока оно вернётся
    await step(page, input, async () => {}, solve);
    const staleError = (await readCodeError(page)) !== null;

    await typeCode(page, value);
    // часть форм отправляется сама после последней цифры — и hh уже увёл
    // на главную; кнопку отправки тогда не ищем (её нет на новой странице)
    if (
      !leftLoginPage(page) &&
      (await submit.isEnabled({ timeout: TIMEOUTS.probe }).catch(() => false))
    ) {
      await bestEffort("отправка кода", () => submit.click({ timeout: TIMEOUTS.appear }));
    }

    const outcome = await waitCodeOutcome(page, input, staleError, solve);
    if (outcome !== "rejected") return;
    wrong = true;
  }
  throw new BotError("bad_credentials", "too many wrong codes — request a new one and try again");
}

export async function login(
  page: Page,
  ctx: BrowserContext,
  account: Account,
  options: LoginOptions = {},
) {
  const { login: sel } = SELECTORS;
  const timeout = options.timeout ?? TIMEOUTS.login;
  const captcha = options.captcha;
  const solve: Solve | undefined = captcha
    ? () => solveCaptcha(page, captcha.solver, captcha.signal)
    : undefined;
  const submit = page.locator(sel.submit).first();

  await openPage(page, URLS.login);
  await step(page, submit, (l) => l.click(), solve);
  await step(page, page.locator(sel.emailRadio), (l) => l.click(), solve);
  await step(page, page.locator(sel.emailInput), (l) => l.fill(account.login), solve);

  if (account.authMode === "code") {
    if (!options.code) throw new Error("code login needs a code solver");
    // «Дальше» без пароля — hh отправляет код на почту
    await step(page, submit, (l) => l.click(), solve);
    await enterEmailCode(page, account, options.code, solve);
  } else {
    await step(page, page.locator(sel.passwordToggle), (l) => l.click(), solve);
    await step(page, page.locator(sel.passwordInput), (l) => l.fill(account.password), solve);
    await step(page, submit, (l) => l.click(), solve);
  }

  let deadline = Date.now() + timeout;
  let captchas = 0;
  while (!leftLoginPage(page)) {
    if (solve && (await isCaptchaShown(page))) {
      // при неверном пароле hh показывает капчу снова и снова — не крутимся вечно
      if (captchas >= LIMITS.loginCaptchas) {
        throw new BotError(
          "bad_credentials",
          "hh.ru keeps asking for a captcha — the login or password is probably wrong",
        );
      }
      await solve();
      captchas++;
      deadline = Date.now() + timeout;
      await page.waitForTimeout(TIMEOUTS.appear / 2);
      if (leftLoginPage(page)) break;
      await throwIfLoginError(page);
      // после капчи hh иногда оставляет форму — отправляем её ещё раз
      if (await submit.isVisible().catch(() => false)) {
        await bestEffort("повторная отправка формы входа", () => submit.click());
      }
      continue;
    }
    await throwIfLoginError(page);
    if (Date.now() > deadline) {
      throw new BotError(
        "login_timeout",
        account.authMode === "code"
          ? "hh.ru did not accept the code in time — try again"
          : "hh.ru did not finish the login — check the password or run `npm run session`",
      );
    }
    await page.waitForTimeout(TIMEOUTS.poll * 5);
  }

  await saveSession(ctx, { login: account.login, secret: account.sessionSecret });
}

// Ждёт, пока главная станет понятной: либо ссылка «Войти», либо кнопка фильтров.
async function isLoggedIn(page: Page): Promise<boolean> {
  const loginLink = page.locator(SELECTORS.login.loginLink).first();
  const filters = page.locator(SELECTORS.filters.button).first();
  await loginLink
    .or(filters)
    .first()
    .waitFor({ state: "visible", timeout: TIMEOUTS.nav })
    .catch(() => {});
  return !(await loginLink.isVisible().catch(() => false));
}

// Выдачу открываем сразу по URL с фильтрами: дровер «Фильтры» у залогиненного
// пользователя рисуется иначе, и чекбоксы опыта в нём не находились.
async function openSearch(page: Page, run: RunConfig): Promise<string> {
  await openPage(page, searchUrl(run.keywords, run.filters));
  if (await isVisible(page, SELECTORS.filters.cookieAccept)) {
    await page.locator(SELECTORS.filters.cookieAccept).first().click();
  }

  const found = await waitVisible(
    page.locator(SELECTORS.vacancy.card).first(),
    TIMEOUTS.cards,
  );
  if (!found) {
    throw new BotError("no_results", "no vacancies match these keywords and filters");
  }
  return page.url();
}

// Сохраняет то, что сейчас на экране: по скриншоту видно, что показал hh.
// Пароль в HTML не попадает — значение input в разметку не пишется.
async function dumpPage(page: Page, name: string): Promise<string | null> {
  try {
    await mkdir(config.debugDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const base = join(config.debugDir, `${name}-${stamp}`);
    await page.screenshot({ path: `${base}.png`, fullPage: true });
    await writeFile(`${base}.html`, await page.content());
    return base;
  } catch (error) {
    console.warn(`⚠️ не удалось сохранить страницу: ${firstLine(error)}`);
    return null;
  }
}

export async function runBot(
  run: RunConfig,
  reporter: BotReporter,
  signal: AbortSignal,
): Promise<RunProgress> {
  const browser = await chromium.launch({ headless: config.headless });
  let ctx: BrowserContext | null = null;
  let loggedIn = false;

  // hh обновляет cookies во время прогона — сохраняем их, чтобы сессия жила дольше
  const persist = async () => {
    if (!ctx || !loggedIn) return;
    await saveSession(ctx, { login: run.login, secret: run.sessionSecret }).catch((error: unknown) =>
      console.warn(`⚠️ не удалось сохранить сессию: ${firstLine(error)}`),
    );
  };

  // STOP: закрытие браузера прерывает любое ожидание Playwright
  const onAbort = () => void persist().finally(() => browser.close().catch(() => {}));
  signal.addEventListener("abort", onAbort, { once: true });

  try {
    // сохранённая сессия избавляет от входа и капчи на каждом запуске;
    // расшифруется она только с тем же паролем или ключом устройства
    const stored = await loadSession({ login: run.login, secret: run.sessionSecret });
    ctx = await browser.newContext(stored ? { storageState: stored } : {});
    const page = await ctx.newPage();

    reporter.stage("opening hh.ru");
    await openPage(page, URLS.home);

    if (await isLoggedIn(page)) {
      loggedIn = true;
    } else {
      if (stored) {
        // расшифровалась, но hh её не принял — протухла, больше не нужна
        await deleteSession(run.login);
        reporter.log("сохранённая сессия устарела — вхожу заново");
      }
      reporter.stage("logging in");
      try {
        await login(page, ctx, run, {
          captcha: { solver: reporter.solveCaptcha, signal },
          code: { solver: reporter.enterCode, signal },
        });
        loggedIn = true;
      } catch (error) {
        if (!signal.aborted) {
          const saved = await dumpPage(page, "login");
          if (saved) reporter.log(`страница входа сохранена: ${saved}.png / .html`);
        }
        throw error;
      }
    }

    reporter.stage("opening search");
    const serpUrl = await openSearch(page, run);
    reporter.log(`ищу «${run.keywords.join(", ")}», нужно откликов: ${run.count}`);

    reporter.stage("applying to matching vacancies");
    const result = await respondToVacancies(page, serpUrl, run, reporter, signal);
    reporter.log(
      `готово: отправлено ${result.sent}, пропущено ${result.skipped}, ошибок ${result.failed}`,
    );
    return result;
  } finally {
    signal.removeEventListener("abort", onAbort);
    if (!signal.aborted) await persist();
    await browser.close().catch(() => {});
  }
}
