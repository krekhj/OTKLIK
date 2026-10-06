import type { RunStatus } from "./types";

interface StatusMeta {
  word: string;
  color: string;
}

export const STATUS_META: Record<RunStatus, StatusMeta> = {
  idle: { word: "IDLE", color: "var(--ink-faint)" },
  running: { word: "RUNNING", color: "var(--accent)" },
  done: { word: "DONE ✓", color: "var(--success)" },
  stopped: { word: "STOPPED", color: "var(--ink-muted)" },
  error: { word: "ERR", color: "var(--danger)" },
};

export const OFFLINE_META: StatusMeta = { word: "OFFLINE", color: "var(--ink-faint)" };
