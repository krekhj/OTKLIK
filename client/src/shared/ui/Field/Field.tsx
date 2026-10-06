import type { ReactNode } from "react";
import { cx } from "@/shared/lib";
import styles from "./Field.module.css";

export interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  hint?: ReactNode;
  aside?: ReactNode;
  rowClassName?: string;
  className?: string;
  children: ReactNode;
}

// Подпись + строка с подчёркиванием + подсказка/ошибка. Ошибка заменяет подсказку.
export const Field = ({
  label,
  htmlFor,
  error,
  hint,
  aside,
  rowClassName,
  className,
  children,
}: FieldProps) => (
  <div className={cx(styles.field, error && styles.error, className)}>
    <div className={styles.head}>
      <label className={cx("t-label", styles.label)} htmlFor={htmlFor}>
        {label}
      </label>
      {aside && <span className={cx("t-label", styles.aside)}>{aside}</span>}
    </div>
    <div className={cx(styles.row, rowClassName)}>{children}</div>
    {(error || hint) && (
      <div id={`${htmlFor}-hint`} className={cx("t-caption", styles.hint)}>
        {error ? `ERR · ${error}` : hint}
      </div>
    )}
  </div>
);
