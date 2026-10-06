import type { ReactNode, TextareaHTMLAttributes } from "react";
import { cx } from "@/shared/lib";
import styles from "./TextArea.module.css";

interface TextAreaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "value"> {
  id: string;
  label: string;
  value: string;
  maxLength: number;
  aside?: ReactNode;
  note?: ReactNode;
}

export const TextArea = ({ id, label, aside, note, value, maxLength, ...props }: TextAreaProps) => (
  <div className={styles.wrap}>
    <div className={styles.head}>
      <label className={cx("t-label", styles.label)} htmlFor={id}>
        {label}
      </label>
      {aside && <span className={cx("t-label", styles.aside)}>{aside}</span>}
    </div>
    <textarea id={id} className={styles.area} value={value} maxLength={maxLength} {...props} />
    <div className={cx("t-caption", styles.foot)}>
      <span>{note}</span>
      <span className={cx("tabular", styles.counter)}>
        {value.length} / {maxLength}
      </span>
    </div>
  </div>
);
