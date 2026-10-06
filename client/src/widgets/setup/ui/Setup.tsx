import type { FormEvent } from "react";
import { getDeviceKey, useRun } from "@/entities/run";
import {
  RunFilters,
  RunFormFields,
  filtersPayload,
  useRunForm,
  type RunFormErrors,
  type RunFormValues,
} from "@/features/configure-run";
import { LaunchButton, RunStatusPanel, useRunActions } from "@/features/launch-run";
import { CodePrompt } from "@/features/enter-code";
import { CaptchaPrompt } from "@/features/solve-captcha";
import { cx } from "@/shared/lib";
import styles from "./Setup.module.css";

function progressSteps(values: RunFormValues) {
  const step = (n: string, label: string, ok: boolean, optional = false) => ({
    n,
    label,
    ok,
    mark: ok ? "DONE ✓" : optional ? "OPTIONAL" : "TODO",
  });
  return [
    step(
      "01",
      "ACCOUNT",
      Boolean(values.login.trim() && (values.authMode === "code" || values.password)),
    ),
    step("02", "SEARCH", values.keywords.length > 0),
    step("03", "COVER LETTER", values.coverLetter.trim().length > 0, true),
  ];
}

export const Setup = () => {
  const form = useRunForm();
  const actions = useRunActions();
  const run = useRun();
  const running = run.status === "running";
  // hh отклонил логин или пароль — подсвечиваем оба поля до следующего запуска
  const credentialErrors: RunFormErrors | undefined =
    run.status === "error" && run.errorCode === "bad_credentials"
      ? form.values.authMode === "password"
        ? { login: "hh.ru rejected the login or password", password: "check the password" }
        : { login: "hh.ru rejected the login or the code" }
      : undefined;

  async function launch() {
    const values = form.submit();
    if (!values || running) return;
    const fieldErrors = await actions.start({
      ...values,
      // в режиме кода пароль на сервер не уходит вовсе
      password: values.authMode === "password" ? values.password : "",
      deviceKey: getDeviceKey(),
      filters: filtersPayload(values.filters),
    });
    if (fieldErrors) form.setServerErrors(fieldErrors);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void launch();
  }

  return (
    <section id="setup" className={styles.section}>
      <div className={styles.inner}>
        <aside className={styles.aside}>
          <div className={cx("t-eyebrow", styles.kicker)}>SETUP</div>
          <h2 className={styles.title}>configure once.</h2>
          <p className={cx("t-body", styles.lead)}>
            three short blocks. the cover letter is optional — leave it blank to use the default template.
          </p>
          <ol className={styles.progress}>
            {progressSteps(form.values).map((s) => (
              <li key={s.n} className="t-label">
                <span className={cx(styles.n, "tabular")}>{s.n}</span>
                <span className={styles.label} style={{ color: s.ok ? "var(--ink)" : "var(--ink-muted)" }}>
                  {s.label}
                </span>
                <span style={{ color: s.ok ? "var(--success)" : "var(--ink-faint)" }}>{s.mark}</span>
              </li>
            ))}
          </ol>
          <div className={styles.filters}>
            <RunFilters form={form} disabled={running} />
          </div>
        </aside>

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <RunFormFields form={form} disabled={running} extraErrors={credentialErrors} />
          <LaunchButton running={running} pending={actions.pending} error={actions.error} />
          {run.code && <CodePrompt key={`${run.startedAt}-${run.code.attempt}`} request={run.code} />}
          {run.captcha && <CaptchaPrompt key={run.captcha.image} captcha={run.captcha} />}
          <RunStatusPanel actions={actions} plannedCount={form.values.count} onRetry={() => void launch()} />
        </form>
      </div>
    </section>
  );
};
