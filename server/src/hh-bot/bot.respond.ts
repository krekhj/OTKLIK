// Логика откликов: обработка выдачи, модалок, прикрепление письма, главный цикл.
import type { Locator, Page } from "playwright";
import { LIMITS, SELECTORS, TIMEOUTS } from "./bot.constants.js";
import type { BotReporter, RunConfig, RunProgress } from "./bot.types.js";
import {
  bestEffort,
  firstLine,
  isSerp,
  isVisible,
  openPage,
  searchPageUrl,
  vacancyIdFromHref,
  waitForEvent,
  waitVisible,
} from "./bot.utils.js";

// Текст, которым hh отклоняет письмо к уже просмотренному отклику.
const LETTER_VIEWED_TEXT = "text=/просмотрен работодателем/i";

type Outcome = "sent" | "skipped" | "failed";
type Result = { outcome: Outcome; note?: string };

/* ── навигация и модалки ─────────────────────────────────────────── */

async function waitForCards(page: Page, what: string) {
  await bestEffort(what, () =>
    page
      .locator(SELECTORS.vacancy.card)
      .first()
      .waitFor({ state: "visible", timeout: TIMEOUTS.cards }),
  );
}

async function returnToSerp(page: Page, serpUrl: string) {
  await bestEffort("не удалось вернуться назад", () =>
    page.goBack({ waitUntil: "commit", timeout: TIMEOUTS.nav }),
  );
  if (!isSerp(page)) {
    await bestEffort("не удалось открыть выдачу", () =>
      openPage(page, serpUrl),
    );
  }
  await waitForCards(page, "карточки не появились");
}

// Закрывает любую модалку и возвращает её текст для лога (null — модалки нет).
// По модалке не кликаем: в «Вакансии с прямым откликом» в центре окна
// основная кнопка, которая уводит на сайт работодателя.
async function closeAnyDialog(
  page: Page,
  serpUrl: string,
): Promise<string | null> {
  const dialog = page.locator(SELECTORS.dialog.any).first();
  if (!(await dialog.isVisible().catch(() => false))) return null;

  const text = (await dialog.innerText({ timeout: TIMEOUTS.probe }).catch(() => ""))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  // Нужна именно кнопка отмены, а не подтверждение: у разных окон она
  // называется по-разному, поэтому ищем по data-qa, затем по тексту.
  const byQa = dialog
    .locator(
      [
        SELECTORS.dialog.externalCancel,
        SELECTORS.dialog.popupClose,
        '[data-qa="modal-close"]',
        '[data-qa$="-cancel"]',
        '[data-qa$="-abort"]',
        '[data-qa$="-close"]',
        '[aria-label="Закрыть"]',
        '[aria-label="Close"]',
      ].join(", "),
    )
    .first();

  const byText = dialog
    .locator('button, a[role="button"]')
    .filter({ hasText: /^\s*(отмен|закрыть|понятно|не сейчас|позже)/i })
    .first();

  const closer = (await byQa.isVisible().catch(() => false))
    ? byQa
    : (await byText.isVisible().catch(() => false))
      ? byText
      : null;

  if (closer) {
    await bestEffort("клик по кнопке закрытия не прошёл", () => closer.click());
  } else {
    await bestEffort("Escape не сработал", () => page.keyboard.press("Escape"));
  }

  const closed = await bestEffort("модалка не закрылась", () =>
    dialog.waitFor({ state: "hidden", timeout: TIMEOUTS.appear }),
  );

  // Escape такие окна не закрывает — если модалка на месте, перезагружаем выдачу.
  if (!closed && (await dialog.isVisible().catch(() => false))) {
    await bestEffort("не удалось перезагрузить выдачу", () =>
      openPage(page, serpUrl),
    );
    await waitForCards(page, "карточки не появились");
  }

  return text;
}

// Закрывает форму письма. В модалке «Сопроводительное письмо» кнопка
// «Закрыть» — обычная текстовая, без aria-label, а Escape окно не закрывает.
async function closeLetterForm(page: Page, serpUrl: string) {
  const input = page.locator(SELECTORS.letter.input).first();
  const modal = page
    .locator(SELECTORS.dialog.any)
    .filter({ has: page.locator(SELECTORS.letter.input) })
    .first();
  const scope = (await modal.isVisible().catch(() => false)) ? modal : page;

  const byText = scope
    .locator('button, a[role="button"]')
    .filter({ hasText: /^\s*(закрыть|отмен)/i })
    .first();
  const byQa = scope
    .locator('[aria-label="Закрыть"], [aria-label="Close"], [data-qa$="-close"]')
    .first();

  const closer = (await byText.isVisible().catch(() => false))
    ? byText
    : (await byQa.isVisible().catch(() => false))
      ? byQa
      : null;

  if (closer) {
    await bestEffort("закрыть форму письма", () => closer.click());
  } else {
    await bestEffort("закрыть форму письма (Escape)", () =>
      page.keyboard.press("Escape"),
    );
  }

  const closed = await bestEffort("форма письма не закрылась", () =>
    input.waitFor({ state: "hidden", timeout: TIMEOUTS.appear }),
  );

  // форма висит поверх выдачи и перехватит все клики — перезагружаем выдачу
  if (!closed) {
    await bestEffort("не удалось перезагрузить выдачу", () =>
      openPage(page, serpUrl),
    );
    await waitForCards(page, "карточки не появились");
  }
}

/* ── отклик ───────────────────────────────────────────────────────── */

// Карточку ищем по vacancyId, а не по индексу: после каждого отклика выдача
// перерисовывается и nth-локаторы начинают указывать на соседние вакансии.
function cardById(page: Page, vacancyId: string): Locator {
  return page
    .locator(SELECTORS.vacancy.card)
    .filter({
      has: page.locator(
        `[id="${vacancyId}"], a[href*="vacancyId=${vacancyId}"]`,
      ),
    })
    .first();
}

// Прикладывает письмо к уже отправленному отклику.
async function attachLetter(
  page: Page,
  card: Locator,
  coverLetter: string,
  serpUrl: string,
): Promise<boolean> {
  const toggle = card.locator(SELECTORS.letter.toggle).first();
  if (!(await waitVisible(toggle, TIMEOUTS.letter))) return false;
  if (await card.locator(SELECTORS.letter.afterSend).isVisible().catch(() => false)) {
    return true; // письмо уже есть
  }

  await toggle.click();

  const input = page.locator(SELECTORS.letter.input).first();
  if (!(await waitVisible(input, TIMEOUTS.appear))) return false;
  await input.fill(coverLetter);

  const submit = page.locator(SELECTORS.letter.submit).first();
  if (!(await waitVisible(submit, TIMEOUTS.appear))) return false;
  await submit.click();

  // Ждём исхода: форма исчезает (письмо ушло) либо появляется отказ.
  const deadline = Date.now() + TIMEOUTS.appear;
  while (Date.now() < deadline) {
    if (!(await isVisible(page, SELECTORS.letter.input))) return true; // успех

    const viewed = await page
      .locator(LETTER_VIEWED_TEXT)
      .first()
      .isVisible()
      .catch(() => false);
    if (viewed) {
      await closeLetterForm(page, serpUrl);
      return false; // отклик уже отправлен, письмо просто не прикрепилось
    }
    await page.waitForTimeout(TIMEOUTS.poll);
  }

  // форма так и не закрылась — письмо не ушло, убираем её, чтобы не мешала
  await closeLetterForm(page, serpUrl);
  return false;
}

async function respondToOne(
  page: Page,
  vacancyId: string,
  serpUrl: string,
  coverLetter: string,
): Promise<Result> {
  const card = cardById(page, vacancyId);
  await card.locator(SELECTORS.vacancy.response).first().click();

  // Блок «отклик отправлен» ищем только в своей карточке: у прошлых
  // откликов он остаётся на странице и давал бы ложный успех.
  const event = await waitForEvent(
    page,
    {
      dialog: page.locator(SELECTORS.dialog.any),
      popup: page.locator(SELECTORS.dialog.submit),
      informer: card.locator(SELECTORS.letter.informer),
      error: page.locator(SELECTORS.dialog.error),
    },
    TIMEOUTS.appear,
  );

  // ушли со страницы выдачи — это анкета работодателя
  if (event === "navigated" || !isSerp(page)) {
    await returnToSerp(page, serpUrl);
    return { outcome: "skipped", note: "анкета (страница)" };
  }

  // модалка: анкета, предупреждение или предложение сервиса
  const dialogText = await closeAnyDialog(page, serpUrl);
  if (dialogText !== null) {
    return { outcome: "skipped", note: `модалка: "${dialogText}"` };
  }

  // страховка на модалку без role="dialog"
  if (event === "popup") {
    await bestEffort("Escape не сработал", () => page.keyboard.press("Escape"));
    return { outcome: "skipped", note: "модалка отклика" };
  }

  if (event === "error") return { outcome: "failed", note: "hh вернул ошибку" };

  // за appear ничего не произошло — даём блоку «отклик отправлен» ещё время
  if (event === null) {
    const informer = card.locator(SELECTORS.letter.informer).first();
    if (!(await waitVisible(informer, TIMEOUTS.letter))) {
      return { outcome: "failed", note: "нет подтверждения отклика" };
    }
  }

  const letterOk = await attachLetter(page, card, coverLetter, serpUrl);
  return letterOk
    ? { outcome: "sent", note: "отклик + письмо" }
    : { outcome: "sent", note: "отклик без письма" };
}

// Первая вакансия на странице, на которую ещё не откликались в этом прогоне.
async function findNextVacancyId(
  page: Page,
  handled: Set<string>,
): Promise<string | null> {
  const hrefs = await page
    .locator(SELECTORS.vacancy.response)
    .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
  for (const href of hrefs) {
    const id = vacancyIdFromHref(href);
    if (id && !handled.has(id)) return id;
  }
  return null;
}

/* ── главный цикл ─────────────────────────────────────────────────── */

export async function respondToVacancies(
  page: Page,
  baseUrl: string,
  config: RunConfig,
  reporter: BotReporter,
  signal: AbortSignal,
): Promise<RunProgress> {
  const handled = new Set<string>(); // ID обработанных вакансий — от повторов
  const progress: RunProgress = { sent: 0, skipped: 0, failed: 0 };
  const done = () =>
    signal.aborted ||
    progress.sent >= config.count ||
    progress.skipped >= LIMITS.maxSkips;

  for (let pageNum = 0; pageNum < LIMITS.maxPages; pageNum++) {
    if (done()) break;

    if (pageNum > 0) {
      await openPage(page, searchPageUrl(baseUrl, pageNum));
      await waitForCards(page, "карточки на новой странице не появились");
      // пустая страница = выдача кончилась
      if ((await page.locator(SELECTORS.vacancy.response).count()) === 0) {
        reporter.log(`страница ${pageNum + 1} пуста, выдача закончилась`);
        break;
      }
      reporter.log(`страница выдачи ${pageNum + 1}`);
    }

    const serpUrl = page.url();

    while (!done()) {
      const id = await findNextVacancyId(page, handled);
      if (!id) break;
      handled.add(id);

      let result: Result;
      try {
        result = await respondToOne(page, id, serpUrl, config.coverLetter);
      } catch (error) {
        if (signal.aborted) break;
        result = { outcome: "failed", note: firstLine(error) };
        if (!isSerp(page)) {
          await returnToSerp(page, serpUrl);
        } else {
          await closeAnyDialog(page, serpUrl);
        }
      }

      progress[result.outcome]++;
      reporter.progress({ ...progress });
      reporter.log(`${id} — ${result.note ?? result.outcome}`);
    }
  }

  return progress;
}
