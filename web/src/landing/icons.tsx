/**
 * Self-contained inline SVG icons for the landing page (no external icon lib,
 * no network). Each takes a className so callers control size/color via
 * Tailwind (currentColor). Stroke-based, 24x24 viewBox, rounded joins.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export function LeafIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M11 20A7 7 0 0 1 4 13c0-4 3-8 9-9 1 6-1 10-4 12" />
      <path d="M11 20c0-4 2-7 6-9" />
    </svg>
  );
}

export function TreeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 22v-6" />
      <path d="M9 9a3 3 0 0 1-3-3 3 3 0 0 1 3-3 3.5 3.5 0 0 1 6 0 3 3 0 0 1 3 3 3 3 0 0 1-3 3c0 2-1.5 3.5-3 4.5C10.5 12.5 9 11 9 9Z" />
      <path d="M12 16l-2.5-2M12 16l2.5-2" />
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 11l8-6 8 6" />
      <path d="M6 10v9h12v-9" />
      <path d="M10 19v-4h4v4" />
    </svg>
  );
}

export function SofaIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" />
      <path d="M3 12a2 2 0 0 1 2 2v3h14v-3a2 2 0 0 1 2-2 2 2 0 0 0-2-2 2 2 0 0 0-2 2v1H7v-1a2 2 0 0 0-2-2 2 2 0 0 0-2 2Z" />
      <path d="M6 17v2M18 17v2" />
    </svg>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 8h3l1.5-2h7L18 8h2a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3Z" />
      <path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z" />
    </svg>
  );
}

export function TimelineIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 19V5" />
      <path d="M4 17h4l3-5 3 3 5-8" />
      <circle cx="8" cy="17" r="1.1" />
      <circle cx="14" cy="15" r="1.1" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

export function SproutIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 20v-7" />
      <path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5Z" />
      <path d="M12 12c0-2.5 2-4.5 5-4.5 0 2.5-2 4.5-5 4.5Z" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V6Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.4 2.5 14.6 0 17M12 3.5c-2.5 2.4-2.5 14.6 0 17" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M5 12H3M21 12h-2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  );
}
