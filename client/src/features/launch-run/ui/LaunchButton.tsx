import { cx } from "@/shared/lib";
import { Button } from "@/shared/ui";
import styles from "./LaunchButton.module.css";

interface LaunchButtonProps {
  running: boolean;
  pending: boolean;
  error: string | null;
}

export const LaunchButton = ({ running, pending, error }: LaunchButtonProps) => (
  <>
    <Button type="submit" block disabled={running || pending}>
      {running ? (
        <>
          <span className={styles.squares} aria-hidden="true">
            <span className={styles.sq} />
            <span className={styles.sq} />
            <span className={styles.sq} />
          </span>
          <span>RUNNING</span>
        </>
      ) : (
        <span>LAUNCH</span>
      )}
    </Button>
    <p className={cx("t-caption", styles.caption, error && styles.error)} role={error ? "alert" : undefined}>
      {error ? `ERR · ${error}` : "your data is used only to send applications."}
    </p>
  </>
);
