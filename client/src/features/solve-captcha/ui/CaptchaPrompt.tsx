import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CaptchaRequest } from "@/entities/run";
import { cx } from "@/shared/lib";
import { Button, RefreshIcon, TextField } from "@/shared/ui";
import { useCaptchaAnswer } from "../model/useCaptchaAnswer";
import styles from "./CaptchaPrompt.module.css";

interface CaptchaPromptProps {
  captcha: CaptchaRequest;
}

// hh.ru показал капчу при входе: бот ждёт, пока человек введёт текст.
export const CaptchaPrompt = ({ captcha }: CaptchaPromptProps) => {
  const [text, setText] = useState("");
  const { pending, error, send } = useCaptchaAnswer();
  const ref = useRef<HTMLDivElement>(null);

  // фокус на поле, чтобы не искать форму глазами (новая картинка
  // монтирует компонент заново через key — поле очищается само)
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    ref.current?.querySelector("input")?.focus({ preventScroll: true });
  }, []);

  // <form> внутри формы настроек нельзя, поэтому отправка по Enter вручную
  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (text.trim()) void send({ action: "solve", text: text.trim() });
  }

  const fieldError = error ?? (captcha.wrong ? "wrong text, try again" : undefined);

  return (
    <div ref={ref} className={styles.prompt} role="group" aria-labelledby="captcha-title">
      <div className={styles.head}>
        <span id="captcha-title" className={cx("t-eyebrow", styles.title)}>
          CAPTCHA
        </span>
        <span className={styles.live} aria-hidden="true" />
      </div>
      <p className={cx("t-body", styles.text)}>hh.ru asks to prove you are human. type the text from the picture.</p>

      <div className={styles.picture}>
        <img className={styles.image} src={captcha.image} alt="Captcha text to type" />
        <button
          type="button"
          className={styles.refresh}
          aria-label="Show another picture"
          disabled={pending}
          onClick={() => void send({ action: "refresh" })}
        >
          <RefreshIcon />
        </button>
      </div>

      <div className={styles.actions}>
        <TextField
          id="captcha"
          label="TEXT FROM THE PICTURE"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={text}
          error={fieldError}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit(e);
          }}
        />
        <Button size="sm" disabled={pending || !text.trim()} onClick={() => submit()}>
          SEND
        </Button>
      </div>
    </div>
  );
};
