import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CodeRequest } from "@/entities/run";
import { cx } from "@/shared/lib";
import { Button, TextField } from "@/shared/ui";
import { useCodeSubmit } from "../model/useCodeSubmit";
import styles from "./CodePrompt.module.css";

interface CodePromptProps {
  request: CodeRequest;
}

// Вход по коду: hh отправил письмо, бот ждёт, пока человек введёт код.
export const CodePrompt = ({ request }: CodePromptProps) => {
  const [code, setCode] = useState("");
  const { pending, error, submit } = useCodeSubmit();
  const ref = useRef<HTMLDivElement>(null);

  // новый запрос монтирует компонент заново через key — поле пустое
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    ref.current?.querySelector("input")?.focus({ preventScroll: true });
  }, []);

  // <form> внутри формы настроек нельзя — отправка по Enter вручную
  function send(e?: FormEvent) {
    e?.preventDefault();
    const value = code.replace(/[\s-]/g, "");
    if (value) void submit(value);
  }

  const fieldError = error ?? (request.wrong ? "wrong code, check the latest email" : undefined);

  return (
    <div ref={ref} className={styles.prompt} role="group" aria-labelledby="email-code-title">
      <div className={styles.head}>
        <span id="email-code-title" className={cx("t-eyebrow", styles.title)}>
          EMAIL CODE
        </span>
        <span className={styles.live} aria-hidden="true" />
      </div>
      <p className={cx("t-body", styles.text)}>
        hh.ru sent a code to <span className={styles.email}>{request.email}</span>. type it here.
      </p>
      <div className={styles.actions}>
        <TextField
          id="email-code"
          label="CODE FROM THE EMAIL"
          inputMode="numeric"
          autoComplete="one-time-code"
          spellCheck={false}
          maxLength={12}
          value={code}
          error={fieldError}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send(e);
          }}
        />
        <Button size="sm" disabled={pending || !code.trim()} onClick={() => send()}>
          SEND
        </Button>
      </div>
    </div>
  );
};
