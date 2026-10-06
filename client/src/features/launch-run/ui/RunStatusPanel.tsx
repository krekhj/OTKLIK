import { OFFLINE_META, STATUS_META, useRunState } from "@/entities/run";
import { cx } from "@/shared/lib";
import { Button } from "@/shared/ui";
import type { RunActions } from "../model/useRunActions";
import styles from "./RunStatusPanel.module.css";

interface RunStatusPanelProps {
  actions: RunActions;
  // сколько откликов выбрано в форме — показываем, пока прогона не было
  plannedCount: number;
  onRetry: () => void;
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export const RunStatusPanel = ({ actions, plannedCount, onRetry }: RunStatusPanelProps) => {
  const { run, online } = useRunState();
  const meta = online ? STATUS_META[run.status] : OFFLINE_META;
  const isIdle = run.status === "idle";
  const count = isIdle ? plannedCount : run.count;
  const pct = count > 0 ? Math.min(100, Math.round((run.sent / count) * 100)) : 0;
  const barColor =
    run.status === "done" ? "var(--success)" : run.status === "error" ? "var(--danger)" : "var(--accent)";

  const extra = [run.skipped && `skipped ${run.skipped}`, run.failed && `failed ${run.failed}`]
    .filter(Boolean)
    .join(" · ");
  const note = !online ? "server offline" : isIdle ? "ready when you are" : run.note;

  return (
    <section
      className={cx(styles.panel, run.status === "error" && styles.failed)}
      aria-label="Run status"
      aria-live="polite"
    >
      <div className={styles.head}>
        <div className={styles.title}>
          <span className="t-eyebrow">STATUS</span>
          <span className="t-label" style={{ color: meta.color }}>
            {meta.word}
          </span>
        </div>
        {run.status === "running" && (
          <Button size="sm" disabled={actions.pending || run.note === "stopping"} onClick={() => void actions.stop()}>
            STOP
          </Button>
        )}
        {(run.status === "done" || run.status === "stopped") && (
          <Button size="sm" variant="ghost" disabled={actions.pending} onClick={() => void actions.reset()}>
            RESET
          </Button>
        )}
        {run.status === "error" && (
          <Button size="sm" disabled={actions.pending} onClick={onRetry}>
            RETRY
          </Button>
        )}
      </div>

      <div className={styles.track}>
        <div className={styles.bar} style={{ width: `${pct}%`, background: barColor }} />
      </div>

      {run.status === "error" ? (
        <div className={cx("t-caption", styles.errorText)}>ERR · {run.error}</div>
      ) : (
        <div className={cx("t-caption", "tabular", styles.foot)}>
          <span>
            sent {run.sent} / {count}
            {extra && ` · ${extra}`}
          </span>
          <span>{note}</span>
        </div>
      )}

      {run.log.length > 0 && (
        <details className={cx("t-caption", styles.log)}>
          <summary>LOG · {run.log.length}</summary>
          <ol>
            {run.log.map((entry, i) => (
              <li key={i} className="tabular">
                {time(entry.at)} {entry.message}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
};
