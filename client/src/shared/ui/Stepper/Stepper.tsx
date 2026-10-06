import { useId } from "react";
import { cx } from "@/shared/lib";
import { MinusIcon, PlusIcon } from "../Icon/Icon";
import styles from "./Stepper.module.css";

interface StepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  presets?: number[];
  unit?: string;
}

export const Stepper = ({ label, value, onChange, min, max, presets = [], unit }: StepperProps) => {
  const labelId = useId();
  const set = (n: number) => onChange(Math.min(max, Math.max(min, n)));

  return (
    <div>
      <div id={labelId} className={cx("t-label", styles.label)}>
        {label}
      </div>
      <div className={styles.row} role="group" aria-labelledby={labelId}>
        <div className={styles.value}>
          <span className={cx(styles.number, "tabular")} aria-live="polite">
            {value}
          </span>
          {unit && <span className={cx("t-caption", styles.unit)}>{unit}</span>}
        </div>
        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.step}
            aria-label="Decrease"
            disabled={value <= min}
            onClick={() => set(value - 1)}
          >
            <MinusIcon />
          </button>
          <button
            type="button"
            className={styles.step}
            aria-label="Increase"
            disabled={value >= max}
            onClick={() => set(value + 1)}
          >
            <PlusIcon />
          </button>
        </div>
      </div>
      {presets.length > 0 && (
        <div className={styles.presets}>
          {presets.map((n) => (
            <button
              key={n}
              type="button"
              className={styles.chip}
              aria-pressed={value === n}
              onClick={() => set(n)}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
