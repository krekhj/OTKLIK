import { useState } from "react";
import { ApiError } from "@/shared/api";
import { applyRunSnapshot, runApi, type CaptchaAnswer } from "@/entities/run";

export function useCaptchaAnswer() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(answer: CaptchaAnswer): Promise<boolean> {
    setPending(true);
    setError(null);
    try {
      applyRunSnapshot(await runApi.answerCaptcha(answer));
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? (e.details?.text ?? e.message) : String(e));
      return false;
    } finally {
      setPending(false);
    }
  }

  return { pending, error, send };
}
