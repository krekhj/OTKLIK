// Капча на входе: модалка «Пройдите капчу» с картинкой и полем ввода.
// Бот её не распознаёт — отдаёт картинку человеку и вписывает его ответ.
import type { Locator, Page } from "playwright";
import { SELECTORS, TIMEOUTS } from "./bot.constants.js";
import type { CaptchaAnswer, CaptchaSolver } from "./bot.types.js";
import { bestEffort, waitVisible } from "./bot.utils.js";

const { captcha: sel } = SELECTORS;

interface CaptchaLocators {
  input: Locator;
  image: Locator;
  submit: Locator;
  refresh: Locator;
}

// Контейнер — самый глубокий блок, где есть и заголовок, и поле ввода:
// у модалки нет стабильного data-qa, поэтому опираемся на текст.
function locate(page: Page): CaptchaLocators {
  const input = page.locator(sel.input).first();
  const box = page
    .locator("div, form, section")
    .filter({ hasText: sel.title })
    .filter({ has: page.locator(sel.input) })
    .last();

  return {
    input,
    image: box.locator(sel.image).first(),
    submit: box
      .locator('button, [role="button"]')
      .filter({ hasText: /^\s*отправить/i })
      .first(),
    refresh: box.locator(sel.refresh).first(),
  };
}

export async function isCaptchaShown(page: Page): Promise<boolean> {
  return locate(page).input.isVisible().catch(() => false);
}

type Round = "accepted" | "rejected" | "refreshed";

// Один раунд: картинка → человек → ответ в поле.
async function solveRound(
  page: Page,
  solver: CaptchaSolver,
  signal: AbortSignal,
  wrong: boolean,
): Promise<Round> {
  const c = locate(page);
  await waitVisible(c.image, TIMEOUTS.appear);
  const png = await c.image.screenshot({ timeout: TIMEOUTS.appear });
  const answer: CaptchaAnswer = await solver(
    { image: `data:image/png;base64,${png.toString("base64")}`, wrong },
    signal,
  );

  if (answer.action === "refresh") {
    const before = await c.image.getAttribute("src", { timeout: TIMEOUTS.probe }).catch(() => null);
    await bestEffort("не удалось обновить капчу", () => c.refresh.click());
    // ждём новую картинку, иначе человеку уйдёт старая
    const deadline = Date.now() + TIMEOUTS.appear;
    while (Date.now() < deadline) {
      const src = await c.image.getAttribute("src", { timeout: TIMEOUTS.probe }).catch(() => null);
      if (src !== before) break;
      await page.waitForTimeout(TIMEOUTS.poll);
    }
    await bestEffort("новая картинка капчи не загрузилась", () =>
      c.image.evaluate(
        (img) => (img as unknown as { decode?: () => Promise<void> }).decode?.(),
        undefined,
        { timeout: TIMEOUTS.appear },
      ),
    );
    return "refreshed";
  }

  await c.input.fill(answer.text);
  if (await c.submit.isVisible().catch(() => false)) {
    await c.submit.click();
  } else {
    await c.input.press("Enter");
  }

  return c.input
    .waitFor({ state: "hidden", timeout: TIMEOUTS.letter })
    .then((): Round => "accepted")
    .catch((): Round => "rejected");
}

// Решает капчу, пока она на экране. Время человека не ограничено —
// прогон прерывается только кнопкой STOP (signal).
export async function solveCaptcha(
  page: Page,
  solver: CaptchaSolver,
  signal: AbortSignal,
): Promise<void> {
  let wrong = false;
  while (await isCaptchaShown(page)) {
    signal.throwIfAborted();
    const round = await solveRound(page, solver, signal, wrong);
    if (round === "accepted") return;
    wrong = round === "rejected";
  }
}
