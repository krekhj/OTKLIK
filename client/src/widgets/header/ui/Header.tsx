import { RunStatusBadge } from "@/entities/run";
import { cx } from "@/shared/lib";
import styles from "./Header.module.css";

export const Header = () => (
  <header className={styles.header}>
    <a href="#top" className={cx("t-wordmark", styles.logo)}>
      OTKLIK
    </a>
    <nav className={cx("t-label", styles.nav)} aria-label="Main">
      <a href="#how">HOW IT WORKS</a>
      <a href="#setup">SETUP</a>
    </nav>
    <RunStatusBadge />
  </header>
);
