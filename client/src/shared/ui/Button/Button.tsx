import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { cx } from "@/shared/lib";
import styles from "./Button.module.css";

interface Look {
  variant?: "primary" | "ghost";
  size?: "lg" | "sm";
  block?: boolean;
}

function buttonClass({ variant = "primary", size = "lg", block }: Look, className?: string) {
  return cx(
    styles.button,
    styles[size],
    variant === "ghost" && styles.ghost,
    block && styles.block,
    className,
  );
}

export const Button = ({
  variant,
  size,
  block,
  className,
  type = "button",
  ...props
}: Look & ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button type={type} className={buttonClass({ variant, size, block }, className)} {...props} />
);

export const ButtonLink = ({
  variant,
  size,
  block,
  className,
  ...props
}: Look & AnchorHTMLAttributes<HTMLAnchorElement>) => (
  <a className={buttonClass({ variant, size, block }, className)} {...props} />
);
