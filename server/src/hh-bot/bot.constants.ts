// Селекторы, таймауты и лимиты hh.ru.
// Все data-qa сняты с живого сайта; расшифровка и подводные камни — в README.md.

export const URLS = {
  home: "https://hh.ru/",
  login: "https://hh.ru/account/login?role=applicant&backurl=%2F&hhtmFrom=main",
  search: "https://hh.ru/search/vacancy",
} as const;

// Допустимые значения фильтров выдачи — ровно то, что hh принимает в URL
// (/search/vacancy?experience=…&work_format=…). Всё прочее отбрасывает валидация.
export const FILTER_OPTIONS = {
  // area: 113 Россия, 1 Москва, 2 Санкт-Петербург, 3 Екатеринбург,
  // 4 Новосибирск, 88 Казань, 66 Нижний Новгород
  area: ["113", "1", "2", "3", "4", "88", "66"],
  experience: ["noExperience", "between1And3", "between3And6", "moreThan6"],
  workFormat: ["ON_SITE", "REMOTE", "HYBRID", "FIELD_WORK"],
  searchField: ["name", "company_name", "description"],
  // без кадровых агентств, меньше 10 откликов, аккредитованные ИТ-компании
  label: ["not_from_agency", "low_performance", "accredited_it"],
} as const;

// Письмо, если пользователь оставил поле пустым.
export const DEFAULT_COVER_LETTER =
  "Здравствуйте! Меня заинтересовала ваша вакансия. Буду рад обсудить детали.";

export const SELECTORS = {
  login: {
    submit: '[data-qa="submit-button"]',
    // радио «Почта» кликается по label-обёртке: сам input скрыт под span
    emailRadio: 'label:has([data-qa="credential-type-email"])',
    emailInput: '[data-qa="applicant-login-input-email"]',
    passwordToggle: '[data-qa="expand-login-by-password"]',
    passwordInput: '[data-qa="applicant-login-input-password"]',
    // поле(я) кода из письма: одно общее или по клетке на цифру
    codeInput:
      'input[autocomplete="one-time-code"], input[data-qa*="otp" i], input[data-qa*="code" i]:not([type="hidden"]), input[name*="code" i]:not([type="hidden"])',
    loginLink: '[data-qa="login"]',
    // сообщения об ошибке под полями формы входа
    error: '[data-qa*="error" i], [role="alert"], [class*="negative"]',
  },
  captcha: {
    title: /пройдите капчу/i,
    input:
      'input[placeholder*="с картинки" i], input[name*="captcha" i], [data-qa*="captcha"] input',
    image: 'img[src*="captcha" i], [data-qa*="captcha"] img, img',
    refresh:
      '[data-qa*="captcha-reload"], [data-qa*="captcha-refresh"], [aria-label*="бнов" i], [aria-label*="другую" i], button:has(svg):not(:has-text("English")):not(:has-text("Отправить"))',
  },
  filters: {
    button: '[data-qa="header-search-filters-button"]', // признак входа
    cookieAccept: '[data-qa="cookies-policy-informer-accept"]',
  },
  vacancy: {
    card: '[data-qa="vacancy-serp__vacancy"]',
    response: '[data-qa="vacancy-serp__vacancy_response"]',
  },
  letter: {
    informer: '[data-qa="vacancy-response-letter-informer"]',
    toggle: '[data-qa="vacancy-response-letter-toggle"]',
    input: '[data-qa="vacancy-response-popup-form-letter-input"]',
    submit: '[data-qa="vacancy-response-letter-submit"]',
    afterSend: '[data-qa="cover-letter-after-send"]',
  },
  dialog: {
    any: '[role="dialog"], [role="alertdialog"]',
    externalCancel: '[data-qa="vacancy-response-link-advertising-cancel"]',
    popupClose: '[data-qa="response-popup-close"]',
    submit: '[data-qa="vacancy-response-submit-popup"]',
    error: '[data-qa="vacancy-response-error-notification"]',
  },
} as const;

export const TIMEOUTS = {
  appear: 3_000, // модалки, поле письма, кнопки
  letter: 6_000, // блок «Ваш отклик отправлен работодателю»
  nav: 60_000,
  cards: 20_000,
  login: 120_000, // время на ручное прохождение капчи
  poll: 100, // шаг опроса в waitForEvent
  // проверки «есть ли/что в элементе»: inputValue, innerText, isEnabled и т. п.
  // ждут появления элемента до 30 с — после навигации это 30 с простоя
  probe: 500,
} as const;

// Текст ошибки hh на форме входа: неверный пароль, неизвестный email и т. п.
export const BAD_CREDENTIALS_TEXT =
  /невер|неправил|не найден|не зарегистр|не существует|incorrect|invalid|wrong/i;

// ошибка под полем кода: «Неверный код», «Код устарел» и т. п.
export const BAD_CODE_TEXT = /невер|неправил|истек|устарел|incorrect|invalid|wrong|expired/i;

export const LIMITS = {
  // столько неверных кодов подряд — дальше прогон завершается
  codeAttempts: 5,
  // столько капч подряд после отправки формы — дальше считаем данные неверными
  loginCaptchas: 3,
  maxPages: 20,
  maxSkips: 60,
} as const;
