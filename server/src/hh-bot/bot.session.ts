// Сессии hh.ru: по файлу на логин, зашифрованные паролем пользователя.
//
// Секрет — пароль от hh (режим «пароль») или случайный ключ устройства,
// который хранит браузер (режим «код из почты»). Ключ — scrypt(секрет, соль), шифр — AES-256-GCM, логин — дополнительные
// аутентифицированные данные (AAD). Отсюда:
// - без пароля файл бесполезен: cookies не лежат на диске открытым текстом;
// - чужой email с любым паролем не даст чужую сессию — файл не расшифруется,
//   и бот пойдёт на обычный вход, где пароль или код проверит сам hh;
// - файл одного логина нельзя подложить под другой: AAD не совпадёт.
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scrypt,
  type ScryptOptions,
} from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BrowserContext, BrowserContextOptions } from "playwright";
import { config } from "../config.js";

type Credentials = { login: string; secret: string };
type StorageState = Exclude<BrowserContextOptions["storageState"], string | undefined>;

interface SessionFile {
  v: 1;
  kdf: { salt: string; N: number; r: number; p: number };
  iv: string;
  tag: string;
  data: string;
}

const KDF = { N: 2 ** 15, r: 8, p: 1 } as const;
// scrypt берёт 128·N·r байт (32 МиБ) — чуть больше лимита по умолчанию
const MAXMEM = 64 * 1024 * 1024;

const normalize = (login: string) => login.trim().toLowerCase();

function deriveKey(secret: string, salt: Buffer, kdf: { N: number; r: number; p: number }) {
  const options: ScryptOptions = { ...kdf, maxmem: MAXMEM };
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(secret, salt, 32, options, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export function sessionFile(login: string): string {
  const key = createHash("sha256").update(normalize(login)).digest("hex").slice(0, 16);
  return join(config.sessionsDir, `${key}.session`);
}

// Сохранённое состояние браузера или null: файла нет, секрет не тот,
// файл повреждён. Неудачная расшифровка файл НЕ удаляет — иначе любой
// стёр бы чужую сессию, введя чужой email с неверным паролем.
export async function loadSession(credentials: Credentials): Promise<StorageState | null> {
  let file: SessionFile;
  try {
    file = JSON.parse(await readFile(sessionFile(credentials.login), "utf8")) as SessionFile;
  } catch {
    return null;
  }
  if (file.v !== 1) return null;

  try {
    const key = await deriveKey(credentials.secret, Buffer.from(file.kdf.salt, "base64"), file.kdf);
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(file.iv, "base64"));
    decipher.setAAD(Buffer.from(normalize(credentials.login)));
    decipher.setAuthTag(Buffer.from(file.tag, "base64"));
    const json = Buffer.concat([
      decipher.update(Buffer.from(file.data, "base64")),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(json) as StorageState;
  } catch {
    return null;
  }
}

export async function saveSession(ctx: BrowserContext, credentials: Credentials): Promise<string> {
  const state = await ctx.storageState();
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(credentials.secret, salt, KDF);

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(normalize(credentials.login)));
  const data = Buffer.concat([cipher.update(JSON.stringify(state), "utf8"), cipher.final()]);

  const file: SessionFile = {
    v: 1,
    kdf: { salt: salt.toString("base64"), ...KDF },
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  };

  // через временный файл: оборванная запись не испортит рабочую сессию
  await mkdir(config.sessionsDir, { recursive: true, mode: 0o700 });
  const path = sessionFile(credentials.login);
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(file), { mode: 0o600 });
  await rename(tmp, path);
  return path;
}

export async function deleteSession(login: string): Promise<void> {
  await rm(sessionFile(login), { force: true });
}
