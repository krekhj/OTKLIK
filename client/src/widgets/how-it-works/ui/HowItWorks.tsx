import type { CSSProperties } from "react";
import { cx } from "@/shared/lib";
import { SectionRule } from "@/shared/ui";
import styles from "./HowItWorks.module.css";

const STEPS: { title: string; text: string; shape: CSSProperties }[] = [
  {
    title: "CONNECT",
    text: "enter your hh.ru login and password. they are used only to send applications.",
    shape: { width: 40, height: 40, background: "var(--ink)", borderRadius: 2 },
  },
  {
    title: "FILTER",
    text: "add keywords for the roles you want. the bot finds vacancies that match them.",
    shape: { width: 64, height: 40, background: "var(--line-strong)", borderRadius: 2 },
  },
  {
    title: "LAUNCH",
    text: "pick how many applications to send, press launch and watch progress live.",
    shape: { width: 40, height: 40, background: "var(--accent)", borderRadius: 999 },
  },
];

export const HowItWorks = () => (
  <section id="how" className={styles.section}>
    <div className={styles.inner}>
      <h2 className={styles.heading}>
        <SectionRule title="HOW IT WORKS" />
      </h2>
      <ol className={styles.steps}>
        {STEPS.map((step, i) => (
          <li key={step.title} className={styles.step}>
            <div className={styles.top}>
              <span className={cx(styles.num, "tabular")}>{String(i + 1).padStart(2, "0")}</span>
              <span className={styles.shape} style={step.shape} aria-hidden="true" />
            </div>
            <h3 className={styles.title}>{step.title}</h3>
            <p className={cx("t-body", styles.text)}>{step.text}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);
