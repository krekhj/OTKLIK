import type { SelectHTMLAttributes } from "react";
import { Field } from "../Field/Field";
import styles from "./Select.module.css";

interface SelectProps<T extends string>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "value" | "onChange"> {
  id: string;
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

// Нативный <select> в строке поля: клавиатура и мобильные списки — бесплатно.
export function Select<T extends string>({ id, label, value, options, onChange, ...props }: SelectProps<T>) {
  return (
    <Field label={label} htmlFor={id}>
      <select
        id={id}
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg className={styles.chevron} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 4.5L6 8l3.5-3.5" />
      </svg>
    </Field>
  );
}
