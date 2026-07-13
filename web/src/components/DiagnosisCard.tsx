import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { Diagnosis } from "../api";
import { themed } from "../theme";

interface DiagnosisCardProps {
  diagnosis: Diagnosis;
  plantName?: string | null;
  photoUrl?: string;
}

/** Healthy readings glow chlorophyll; anything else asks for attention in clay. */
function isThriving(health: string): boolean {
  const normalized = health.toLowerCase();
  return /healthy|thriving|good|great|excellent/.test(normalized);
}

export default function DiagnosisCard({ diagnosis, plantName, photoUrl }: DiagnosisCardProps) {
  const reduceMotion = useReducedMotion();
  const thriving = isThriving(diagnosis.health);
  const hasPests = diagnosis.pests.length > 0;

  const container: Variants = reduceMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: {},
        show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
      };

  const item: Variants = reduceMotion
    ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } },
      };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
      aria-live="polite"
    >
      <motion.header variants={item} className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className={`text-xs uppercase tracking-[0.14em] ${themed.muted}`}>Diagnosis</p>
          <h2 className={`font-display text-2xl font-medium ${themed.heading}`}>
            {plantName?.trim() || "Your plant"}
          </h2>
        </div>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={plantName ? `Photo of ${plantName}` : "Uploaded plant photo"}
            className="h-16 w-16 shrink-0 rounded-2xl border border-[color:var(--card-border)] object-cover shadow-card"
          />
        ) : null}
      </motion.header>

      <motion.div variants={item} className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium ${
            thriving ? "bg-chlorophyll text-ink" : "bg-clay text-ink"
          }`}
        >
          <StatusDot lit={thriving} />
          {diagnosis.health}
        </span>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm ${themed.card} ${themed.body}`}
        >
          <SproutIcon />
          {diagnosis.growth_stage}
        </span>
      </motion.div>

      <motion.div variants={item} className="flex flex-col gap-2">
        <p className={`text-xs uppercase tracking-[0.14em] ${themed.muted}`}>Pests</p>
        {hasPests ? (
          <div className="flex flex-wrap gap-2">
            {diagnosis.pests.map((pest) => (
              <span
                key={pest}
                className={`rounded-full border px-3 py-1 text-sm ${themed.card} text-[color:var(--error)]`}
              >
                {pest}
              </span>
            ))}
          </div>
        ) : (
          <p className={`text-sm ${themed.body}`}>No pests spotted. Nice and clean.</p>
        )}
      </motion.div>

      <motion.div variants={item} className="flex flex-col gap-2">
        <p className={`text-xs uppercase tracking-[0.14em] ${themed.muted}`}>Watering</p>
        <p className={`flex items-start gap-2 text-sm ${themed.body}`}>
          <DropletIcon />
          <span>{diagnosis.watering}</span>
        </p>
      </motion.div>

      <motion.div variants={item} className="flex flex-col gap-2">
        <p className={`text-xs uppercase tracking-[0.14em] ${themed.muted}`}>Care steps</p>
        <ul className="flex flex-col gap-2">
          {diagnosis.care_steps.map((step, index) => (
            <motion.li
              key={`${index}-${step}`}
              variants={item}
              className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm ${themed.card} ${themed.body}`}
            >
              <CheckLeafIcon />
              <span>{step}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
}

function StatusDot({ lit }: { lit: boolean }) {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" className="shrink-0">
      <circle cx="4" cy="4" r="4" fill={lit ? "#12241B" : "#F5F3EC"} opacity={lit ? 0.55 : 0.75} />
    </svg>
  );
}

function SproutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M12 21V11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 12C12 7 8 5 4 5C4 10 7 12 12 12Z"
        fill="#7BE05A"
        opacity="0.85"
      />
      <path
        d="M12 9C12 5 15 3 20 3C20 7 18 9 12 9Z"
        fill="#3A5A40"
        opacity="0.9"
      />
    </svg>
  );
}

function DropletIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="mt-0.5 shrink-0"
    >
      <path
        d="M12 3C12 3 5 11.5 5 16C5 19.9 8.1 23 12 23C15.9 23 19 19.9 19 16C19 11.5 12 3 12 3Z"
        fill="#7BE05A"
        opacity="0.35"
        stroke="#7BE05A"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function CheckLeafIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="mt-0.5 shrink-0"
    >
      <circle cx="12" cy="12" r="10" fill="#7BE05A" opacity="0.16" />
      <path
        d="M7 12.5L10.2 15.5L17 8.5"
        stroke="#7BE05A"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
