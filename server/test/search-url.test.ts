import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SearchFilters } from "../src/hh-bot/bot.types.js";
import { searchPageUrl, searchUrl, vacancyIdFromHref } from "../src/hh-bot/bot.utils.js";

const none: SearchFilters = {
  area: null,
  experience: [],
  workFormat: [],
  salary: null,
  onlyWithSalary: false,
  searchFields: [],
  excludedText: "",
  labels: [],
};

describe("searchUrl", () => {
  it("ключевые слова через OR, без фильтров — только text", () => {
    const url = new URL(searchUrl(["React", "Frontend"], none));
    assert.equal(url.origin + url.pathname, "https://hh.ru/search/vacancy");
    assert.equal(url.searchParams.get("text"), "React OR Frontend");
    assert.deepEqual([...url.searchParams.keys()], ["text"]);
  });

  it("все фильтры — параметрами hh", () => {
    const q = new URL(
      searchUrl(["React"], {
        area: "1",
        experience: ["noExperience", "between1And3"],
        workFormat: ["REMOTE"],
        salary: 150000,
        onlyWithSalary: true,
        searchFields: ["name", "description"],
        excludedText: "senior, lead",
        labels: ["not_from_agency"],
      }),
    ).searchParams;
    assert.equal(q.get("area"), "1");
    assert.deepEqual(q.getAll("experience"), ["noExperience", "between1And3"]);
    assert.deepEqual(q.getAll("work_format"), ["REMOTE"]);
    assert.equal(q.get("salary"), "150000");
    assert.equal(q.get("currency_code"), "RUR");
    assert.equal(q.get("only_with_salary"), "true");
    assert.deepEqual(q.getAll("search_field"), ["name", "description"]);
    assert.equal(q.get("excluded_text"), "senior, lead");
    assert.deepEqual(q.getAll("label"), ["not_from_agency"]);
  });

  it("страница выдачи сохраняет фильтры", () => {
    const page2 = new URL(searchPageUrl(searchUrl(["React"], { ...none, area: "2" }), 2));
    assert.equal(page2.searchParams.get("page"), "2");
    assert.equal(page2.searchParams.get("area"), "2");
  });

  it("vacancyId из ссылки отклика", () => {
    assert.equal(vacancyIdFromHref("/applicant/vacancy_response?vacancyId=123456&hhtmFrom=x"), "123456");
    assert.equal(vacancyIdFromHref("/vacancy/1"), null);
    assert.equal(vacancyIdFromHref(null), null);
  });
});
