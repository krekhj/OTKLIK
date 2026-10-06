import { useState } from "react";
import { ApiError } from "@/shared/api";
import { applyRunSnapshot, runApi } from "@/entities/run";

export function useCodeSubmit() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(code: string) {
    setPending(true);
    setError(null);
    try {
      applyRunSnapshot(await runApi.submitCode(code));
    } catch (e) {
      setError(e instanceof ApiError ? (e.details?.code ?? e.message) : String(e));
    } finally {
      setPending(false);
    }
  }

  return { pending, error, submit };
}
