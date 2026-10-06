import { useState } from "react";
import { ApiError } from "@/shared/api";
import { applyRunSnapshot, runApi, type RunSnapshot, type StartRunPayload } from "@/entities/run";

// поля, у которых в форме есть своё место для ошибки
const FORM_FIELDS = new Set(["login", "password", "keywords", "count", "coverLetter"]);

export function useRunActions() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function perform(action: () => Promise<RunSnapshot>): Promise<ApiError | null> {
    setPending(true);
    setError(null);
    try {
      applyRunSnapshot(await action());
      return null;
    } catch (e) {
      const apiError = e instanceof ApiError ? e : new ApiError(0, String(e));
      // ошибки полей формы показывает сама форма; всё остальное (в том числе
      // поля без своего места для ошибки, например фильтры) — под кнопкой
      const unplaced = Object.entries(apiError.details ?? {})
        .filter(([field]) => !FORM_FIELDS.has(field))
        .map(([, message]) => message);
      if (!apiError.details) setError(apiError.message);
      else if (unplaced.length) setError(unplaced.join(" · "));
      return apiError;
    } finally {
      setPending(false);
    }
  }

  return {
    pending,
    error,
    // возвращает ошибки полей от сервера (422), если они есть
    start: async (payload: StartRunPayload) => (await perform(() => runApi.start(payload)))?.details,
    stop: () => perform(runApi.stop),
    reset: () => perform(runApi.reset),
  };
}

export type RunActions = ReturnType<typeof useRunActions>;
