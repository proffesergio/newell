import { motion, useReducedMotion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "ghost";
  busy?: boolean;
}

export default function Button({
  variant = "primary",
  busy = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const reduceMotion = useReducedMotion();
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-body text-sm font-medium tracking-wide transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-chlorophyll text-ink hover:bg-chlorophyll/90"
      : "bg-transparent text-[color:var(--muted)] hover:text-[color:var(--on-surface)] border border-[color:var(--input-border)] hover:border-[color:var(--muted)]";

  return (
    <motion.button
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
      className={`${base} ${styles} ${className}`}
      disabled={disabled || busy}
      {...rest}
    >
      {busy ? <span className="animate-pulse">Working…</span> : children}
    </motion.button>
  );
}
