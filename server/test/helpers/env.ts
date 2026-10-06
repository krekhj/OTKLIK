// Окружение тестов: config.ts читает env при импорте, поэтому этот файл
// импортируется первым в каждом тесте, которому важны каталоги или авторизация.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "otklik-test-"));
process.env.SESSIONS_DIR ??= join(root, "sessions");
process.env.DEBUG_DIR ??= join(root, "debug");
process.env.HEADLESS = "true";

// сессии и дампы тестов не копятся в /tmp
process.on("exit", () => rmSync(root, { recursive: true, force: true }));

export const testRoot = root;
