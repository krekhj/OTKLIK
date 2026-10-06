// Прогоны всех клиентов. Ключ — id клиента из cookie (http.client.ts):
// каждый браузер видит и останавливает только свой прогон.
import { RunStore } from "./run.store.js";

// завершённый прогон без открытых вкладок держим сутки — потом забываем
const IDLE_TTL = 24 * 60 * 60 * 1000;
const SWEEP_EVERY = 10 * 60 * 1000;

class RunRegistry {
  private readonly stores = new Map<string, RunStore>();

  // прогон клиента; создаётся при первом обращении
  of(clientId: string): RunStore {
    let store = this.stores.get(clientId);
    if (!store) {
      store = new RunStore();
      this.stores.set(clientId, store);
    }
    return store;
  }

  get runningCount(): number {
    let n = 0;
    for (const store of this.stores.values()) if (store.isRunning) n++;
    return n;
  }

  isLoginRunning(login: string): boolean {
    const key = login.trim().toLowerCase();
    for (const store of this.stores.values()) if (store.login === key) return true;
    return false;
  }

  stopAll() {
    for (const store of this.stores.values()) store.stop();
  }

  sweep(now = Date.now()) {
    for (const [id, store] of this.stores) {
      if (!store.isRunning && store.subscribers === 0 && now - store.lastActivity > IDLE_TTL) {
        this.stores.delete(id);
      }
    }
  }

  get size(): number {
    return this.stores.size;
  }
}

export const runs = new RunRegistry();
setInterval(() => runs.sweep(), SWEEP_EVERY).unref();
