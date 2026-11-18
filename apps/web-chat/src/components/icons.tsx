import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const EyeIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const SendIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export const ArrowDownIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5v14" />
    <path d="m6 13 6 6 6-6" />
  </svg>
);

export const XIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export const TerminalIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m5 8 4 4-4 4" />
    <path d="M12 16h7" />
  </svg>
);

export const ClockIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const SunIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const MoonIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </svg>
);

/** Logo: ba bong bóng nổi lên — "Fina" + nhiều giọng nói */
export const LogoMark = (p: P) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden {...p}>
    <rect x="1" y="1" width="22" height="22" rx="6" fill="var(--nf-surface-2)" stroke="var(--nf-line-strong)" />
    <circle cx="8.5" cy="15" r="3.2" fill="var(--nf-accent)" />
    <circle cx="14.5" cy="10" r="2.3" fill="var(--nf-accent)" opacity="0.7" />
    <circle cx="17.5" cy="15.5" r="1.4" fill="var(--nf-accent)" opacity="0.45" />
  </svg>
);
