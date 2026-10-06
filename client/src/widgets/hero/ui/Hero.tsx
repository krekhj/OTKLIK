import { useRun } from "@/entities/run";
import { cx } from "@/shared/lib";
import { ButtonLink } from "@/shared/ui";
import styles from "./Hero.module.css";

const PATTERN = "11010111000100101101101110100011011001101011011011100101011011011010101101110110";
const LIT = "var(--on-accent)";
const DIM = "rgba(20, 20, 19, 0.14)";

export const Hero = () => {
  const run = useRun();
  // во время прогона точки «загораются» по мере отправки откликов
  const litUntil =
    run.status === "running" && run.count > 0
      ? Math.round((PATTERN.length * run.sent) / run.count)
      : 0;

  return (
    <section id="top" className={styles.hero}>
      <div className={styles.copy}>
        <div className={cx("t-eyebrow", styles.kicker)}>
          <span className={styles.square} aria-hidden="true" />
          <span>AUTO-APPLY · HH.RU</span>
        </div>
        <h1 className={styles.title}>OTKLIK</h1>
        <div className={styles.taglineRow}>
          <p className={styles.tagline}>auto-apply for hh.ru. set it once, get replies.</p>
          <span className={styles.rule} aria-hidden="true" />
        </div>
        <div className={styles.actions}>
          <ButtonLink href="#setup">SET UP</ButtonLink>
          <ButtonLink href="#how" variant="ghost" style={{ padding: "0 32px" }}>
            HOW IT WORKS
          </ButtonLink>
        </div>
        <a href="#how" className={cx("t-label", styles.scroll)}>
          <span className={styles.scrollTrack} aria-hidden="true">
            <span className={styles.scrollDot} />
          </span>
          <span>SCROLL</span>
        </a>
      </div>

      <div className={styles.shapes} aria-hidden="true">
        <span className={styles.axis} />
        <span style={{ width: 136, height: 136, background: "var(--ink)" }} />
        <span style={{ width: 136, height: 64, background: "var(--line-strong)" }} />
        <span style={{ width: 72, height: 72, background: "var(--accent-pressed)" }} />
        <span style={{ width: 136, height: 136, border: "1px solid var(--line-strong)", borderRadius: 999 }} />
      </div>

      <div className={styles.art} aria-hidden="true">
        <div className={styles.grid}>
          {PATTERN.split("").map((c, i) => (
            <span key={i} style={{ background: c === "1" || i < litUntil ? LIT : DIM }} />
          ))}
        </div>
        <span className={cx("t-eyebrow", styles.counter)}>01 / 03</span>
        <span className={styles.ring} />
        <span className={styles.block} />
        <span className={styles.midline} />
      </div>
    </section>
  );
};
