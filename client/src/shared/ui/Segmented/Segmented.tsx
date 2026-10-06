import styles from "./Segmented.module.css";

interface SegmentedProps<T extends string> {
  name: string;
  label: string; // для скринридеров
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function Segmented<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
  disabled,
}: SegmentedProps<T>) {
  return (
    <fieldset className={styles.group} aria-label={label} disabled={disabled}>
      {options.map((option) => (
        <label key={option.value} className={styles.option}>
          <input
            className={styles.input}
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span className={styles.label}>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
