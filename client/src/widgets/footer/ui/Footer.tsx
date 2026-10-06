import { cx } from "@/shared/lib";
import styles from "./Footer.module.css";

export const Footer = () => (
  <footer className={styles.footer}>
    <span className="t-wordmark">OTKLIK</span>
    <span className={cx("t-caption")}>auto-apply for hh.ru. set it once, get replies.</span>
  </footer>
);
