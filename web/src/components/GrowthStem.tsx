import { motion, useReducedMotion } from "framer-motion";

export type FlowStep = 1 | 2 | 3;

interface GrowthStemProps {
  step: FlowStep;
}

const STEPS: Array<{ id: FlowStep; label: string; hint: string }> = [
  { id: 1, label: "Phone", hint: "Where to reach you" },
  { id: 2, label: "Code", hint: "Confirm it's you" },
  { id: 3, label: "Profile", hint: "Make it yours" },
];

const TRACK_HEIGHT = 208; // px, desktop vertical rail

/**
 * The signature "growth as light" element: a vertical stem that grows
 * taller and unfurls a leaf at each completed step. Encodes real progress
 * through the phone -> otp -> profile flow.
 */
export default function GrowthStem({ step }: GrowthStemProps) {
  const reduceMotion = useReducedMotion();
  const fillFraction = step / STEPS.length;
  const springTransition = reduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 90, damping: 16 };

  return (
    <div
      className="flex flex-row items-stretch gap-4 md:flex-col md:items-center md:gap-0"
      role="group"
      aria-label="Sign-in progress"
    >
      <div
        className="relative w-full md:w-8"
        style={{ minHeight: 0 }}
      >
        {/* Horizontal track on mobile, vertical on desktop */}
        <div
          className="relative mx-auto h-1.5 w-full rounded-full bg-[color:var(--card-border)] md:h-full md:w-1.5"
          style={{ ["--track-h" as string]: `${TRACK_HEIGHT}px` }}
        >
          <div className="hidden md:block md:h-[var(--track-h)]" />

          {/* Filled stem — grows with progress */}
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-moss to-chlorophyll md:left-auto md:bottom-0 md:top-auto md:w-full md:bg-gradient-to-t"
            initial={false}
            animate={{
              width: `${fillFraction * 100}%`,
              height: `${fillFraction * 100}%`,
            }}
            transition={springTransition}
          />

          {/* Leaf markers at each step */}
          {STEPS.map((s, i) => {
            const reached = step >= s.id;
            const positionStyle =
              i === STEPS.length - 1
                ? { left: "100%", top: "50%" }
                : { left: `${(i / (STEPS.length - 1)) * 100}%`, top: "50%" };
            return (
              <motion.div
                key={s.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 md:left-1/2 md:-translate-x-1/2"
                style={{
                  left: positionStyle.left,
                  top: "50%",
                  bottom: undefined,
                }}
                initial={false}
                animate={reduceMotion ? undefined : reached ? { scale: 1, rotate: 0, opacity: 1 } : { scale: 0.2, rotate: -18, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 14 }}
              >
                <LeafIcon lit={reached} />
              </motion.div>
            );
          })}
        </div>
      </div>

      <ol className="flex flex-row justify-between gap-2 md:flex-col md:justify-start md:gap-6 md:pl-4">
        {STEPS.map((s) => {
          const done = step > s.id;
          const active = step === s.id;
          return (
            <li key={s.id} className="min-w-0">
              <p
                className={`font-display text-sm tracking-wide md:text-base ${
                  active || done ? "text-chlorophyll" : "text-[color:var(--muted)]"
                }`}
              >
                {s.label}
              </p>
              <p className="hidden text-xs text-[color:var(--muted)] opacity-80 md:block">{s.hint}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function LeafIcon({ lit }: { lit: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="drop-shadow-sm"
    >
      <path
        d="M4 20C4 11 10 4 20 4C20 14 13 20 4 20Z"
        fill={lit ? "#7BE05A" : "#3A5A40"}
        stroke={lit ? "#F5F3EC" : "#A7B8AA"}
        strokeWidth="1"
      />
      <path d="M6 18C9 14 12 11 18 6" stroke={lit ? "#12241B" : "#12241B"} strokeOpacity="0.35" strokeWidth="1" />
    </svg>
  );
}
