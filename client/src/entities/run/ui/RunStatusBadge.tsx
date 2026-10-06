import { cx } from "@/shared/lib";
import { OFFLINE_META, STATUS_META } from "../model/status";
import { useRunState } from "../model/store";
import styles from "./RunStatusBadge.module.css";

export const RunStatusBadge = () => {
  const { run, online } = useRunState();
  const meta = !online
    ? OFFLINE_META
    : run.captcha
      ? { word: "CAPTCHA", color: "var(--accent)" }
      : run.code
        ? { word: "CODE", color: "var(--accent)" }
        : STATUS_META[run.status];

  return (
    <div className={cx("t-label", "tabular", styles.badge)}>
      <span
        className={cx(styles.dot, run.status === "running" && styles.live)}
        style={{ background: meta.color }}
        aria-hidden="true"
      />
      {run.captcha ? (
        <a href="#captcha">{meta.word}</a>
      ) : run.code ? (
        <a href="#email-code">{meta.word}</a>
      ) : (
        <span>{meta.word}</span>
      )}
    </div>
  );
};
