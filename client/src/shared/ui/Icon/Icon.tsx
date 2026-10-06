import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const EyeIcon = (props: IconProps) => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" {...stroke} {...props}>
    <path d="M1.5 9C2.2 7.3 5 4 9 4s6.8 3.3 7.5 5c-.7 1.7-3.5 5-7.5 5S2.2 10.7 1.5 9z" />
    <circle cx="9" cy="9" r="2.25" />
  </svg>
);

export const EyeOffIcon = (props: IconProps) => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" {...stroke} {...props}>
    <path d="M2.5 2.5l13 13" />
    <path d="M7.4 4.1A7.6 7.6 0 0 1 9 4c4 0 6.8 3.3 7.5 5-.3.7-.9 1.7-1.8 2.6M5 5.5C3.4 6.5 2.3 8 1.5 9c.7 1.7 3.5 5 7.5 5 1.3 0 2.5-.4 3.5-.9" />
    <path d="M7.6 7.6a2 2 0 0 0 2.8 2.8" />
  </svg>
);

export const MinusIcon = (props: IconProps) => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" {...stroke} {...props}>
    <path d="M3 7h8" />
  </svg>
);

export const PlusIcon = (props: IconProps) => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" {...stroke} {...props}>
    <path d="M3 7h8M7 3v8" />
  </svg>
);

export const CloseIcon = (props: IconProps) => (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" {...stroke} {...props}>
    <path d="M2 2l6 6M8 2l-6 6" />
  </svg>
);

export const RefreshIcon = (props: IconProps) => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" {...stroke} {...props}>
    <path d="M15 9a6 6 0 1 1-1.8-4.3" />
    <path d="M15 3v3.5h-3.5" />
  </svg>
);
