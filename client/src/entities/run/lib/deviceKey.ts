// «Запомнить устройство» для входа по коду: случайный ключ живёт только в
// этом браузере, сервер шифрует им сессию hh. Другой браузер ключа не знает —
// ему понадобится новый код из почты.
const KEY = "otklik:device-key";

function generate(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

let fallback: string | null = null;

export function getDeviceKey(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
    const key = generate();
    localStorage.setItem(KEY, key);
    return key;
  } catch {
    // localStorage недоступен: ключ живёт до перезагрузки, вход будет по коду
    fallback ??= generate();
    return fallback;
  }
}
