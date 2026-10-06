// Живое состояние прогона: один EventSource на всё приложение,
// компоненты читают его через useSyncExternalStore.
import { useSyncExternalStore } from "react";
import { RUN_EVENTS_URL } from "../api/runApi";
import type { RunSnapshot } from "./types";

interface RunState {
  run: RunSnapshot;
  online: boolean;
}

const idle: RunSnapshot = {
  version: -1,
  status: "idle",
  captcha: null,
  code: null,
  count: 0,
  sent: 0,
  skipped: 0,
  failed: 0,
  note: "ready",
  error: null,
  errorCode: null,
  log: [],
  startedAt: null,
  finishedAt: null,
};

let state: RunState = { run: idle, online: false };
const listeners = new Set<() => void>();
let source: EventSource | null = null;
// первый снимок после (пере)подключения — эталон: сервер мог перезапуститься
// и начать версии заново
let resync = true;

function emit(next: Partial<RunState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function connect() {
  source = new EventSource(RUN_EVENTS_URL);
  source.onmessage = (e: MessageEvent<string>) => {
    const run = JSON.parse(e.data) as RunSnapshot;
    if (resync) {
      resync = false;
      emit({ run, online: true });
    } else {
      applyRunSnapshot(run);
    }
  };
  // EventSource переподключается сам, нам нужно только показать «offline»
  source.onerror = () => {
    resync = true;
    emit({ online: false });
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!source) {
    resync = true;
    connect();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      source?.close();
      source = null;
    }
  };
}

const getState = () => state;

// Снимки приходят двумя путями: ответом на POST и событием SSE, и порядок
// между ними не гарантирован. Берём только более новый по версии, иначе
// запоздавший ответ на STOP («stopping») затирал бы уже пришедшее «stopped».
export function applyRunSnapshot(run: RunSnapshot) {
  if (run.version <= state.run.version) return;
  emit({ run });
}

export function useRunState(): RunState {
  return useSyncExternalStore(subscribe, getState);
}

export function useRun(): RunSnapshot {
  return useRunState().run;
}
