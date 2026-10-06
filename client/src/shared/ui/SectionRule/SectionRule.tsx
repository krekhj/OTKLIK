import type { ReactNode } from "react";
import { cx } from "@/shared/lib";
import styles from "./SectionRule.module.css";

interface SectionRuleProps {
  title: string;
  index?: string;
  className?: string;
  // контрол справа от линии (например, переключатель режима)
  aside?: ReactNode;
}

// «01 ACCOUNT ————» — заголовок группы с линией до края.
export const SectionRule = ({ title, index, className, aside }: SectionRuleProps) => (
  <div className={cx(styles.rule, className)}>
    {index && <span className={cx(styles.index, "tabular")}>{index}</span>}
    <span className="t-eyebrow">{title}</span>
    <span className={styles.line} aria-hidden="true" />
    {aside}
  </div>
);
