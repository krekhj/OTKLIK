import { cx } from "@/shared/lib";
import styles from "./ChipGroup.module.css";

interface ChipGroupProps<T extends string> {
  label: string;
  value: T[];
  options: readonly { value: T; label: string }[];
  onChange: (value: T[]) => void;
}

// Множественный выбор чипами: под капотом настоящие чекбоксы.
export function ChipGroup<T extends string>({ label, value, options, onChange }: ChipGroupProps<T>) {
  const toggle = (v: T) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <fieldset className={styles.group}>
      <legend className={cx("t-label", styles.legend)}>{label}</legend>
      <div className={styles.chips}>
        {options.map((o) => (
          <label key={o.value} className={styles.chip}>
            <input
              className={styles.input}
              type="checkbox"
              checked={value.includes(o.value)}
              onChange={() => toggle(o.value)}
            />
            <span className={styles.label}>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
