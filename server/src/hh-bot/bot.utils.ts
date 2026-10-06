// Общие хелперы: навигация, ожидания, разбор URL.
import type { Locator, Page } from "playwright";
import { TIMEOUTS, URLS } from "./bot.constants.js";
import type { SearchFilters } from "./bot.types.js";

export function vacancyIdFromHref(href: string | null): string | null {
  return href ? (/vacancyId=(\d+)/.exec(href)?.[1] ?? null) : null;
}

// URL выдачи с фильтрами — так же, как его строит сам hh в панели «Фильтры».
// Несколько ключевых слов — через OR (язык запросов hh).
export function searchUrl(keywords: string[], filters: SearchFilters): string {
  const url = new URL(URLS.search);
  const q = url.searchParams;
  q.set("text", keywords.join(" OR "));
  if (filters.area) q.set("area", filters.area);
  for (const v of filters.experience) q.append("experience", v);
  for (const v of filters.workFormat) q.append("work_format", v);
  for (const v of filters.searchFields) q.append("search_field", v);
  for (const v of filters.labels) q.append("label", v);
  if (filters.salary) {
    q.set("salary", String(filters.salary));
    q.set("currency_code", "RUR");
  }
  if (filters.onlyWithSalary) q.set("only_with_salary", "true");
  if (filters.excludedText) q.set("excluded_text", filters.excludedText);
  return url.toString();
}

export function searchPageUrl(baseUrl: string, pageNum: number): string {
  const url = new URL(baseUrl);
  url.searchParams.set("page", String(pageNum));
  return url.toString();
}

export function isSerp(page: Page): boolean {
  return page.url().includes("/search/vacancy");
}

// hh.ru вечно догружает ресурсы и не отдаёт domcontentloaded,
// поэтому навигация идёт по commit, а элементы ждём явно.
export async function openPage(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "commit", timeout: TIMEOUTS.nav });
}

export async function isVisible(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).first().isVisible().catch(() => false);
}

export async function waitVisible(
  locator: Locator,
  timeout: number,
): Promise<boolean> {
  return locator
    .waitFor({ state: "visible", timeout })
    .then(() => true)
    .catch(() => false);
}

// Ждёт появления любого из локаторов либо ухода со страницы выдачи.
// Возвращает имя сработавшего локатора, "navigated" или null по таймауту.
export async function waitForEvent<K extends string>(
  page: Page,
  locators: Record<K, Locator>,
  timeout: number,
): Promise<K | "navigated" | null> {
  const entries = Object.entries(locators) as [K, Locator][];
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (!isSerp(page)) return "navigated";
    for (const [name, locator] of entries) {
      if (await locator.first().isVisible().catch(() => false)) return name;
    }
    await page.waitForTimeout(TIMEOUTS.poll);
  }
  return null;
}

// Необязательный шаг: не валит прогон, но логирует ошибку вместо тишины.
export async function bestEffort(
  what: string,
  action: () => Promise<unknown>,
): Promise<boolean> {
  try {
    await action();
    return true;
  } catch (error) {
    console.warn(`⚠️ ${what}: ${firstLine(error)}`);
    return false;
  }
}

export function firstLine(error: unknown): string {
  return String(error).split("\n")[0] ?? "ошибка";
}
