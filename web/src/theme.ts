/**
 * Shared className fragments that consume the CSS custom properties defined
 * in index.css (--on-surface, --muted, --input-bg, etc). Centralizing these
 * keeps every screen flipping together between the ink-dominant dark theme
 * and the paper-dominant light theme (prefers-color-scheme).
 */
export const themed = {
  heading: "text-[color:var(--on-surface)]",
  body: "text-[color:var(--on-surface)]",
  muted: "text-[color:var(--muted)]",
  error: "text-[color:var(--error)]",
  input:
    "border-[color:var(--input-border)] bg-[color:var(--input-bg)] text-[color:var(--on-surface)] placeholder:text-[color:var(--muted)] placeholder:opacity-70 focus:border-[color:var(--on-surface)] focus:outline-none",
  code: "bg-[color:var(--code-bg)] text-[color:var(--on-surface)]",
  card: "bg-[color:var(--card-bg)] border-[color:var(--card-border)]",
};
