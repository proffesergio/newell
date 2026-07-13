import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { RoomDesign } from "../api";
import { themed } from "../theme";

interface RoomDesignCardProps {
  design: RoomDesign;
  roomName?: string | null;
  photoUrl?: string;
}

export default function RoomDesignCard({ design, roomName, photoUrl }: RoomDesignCardProps) {
  const reduceMotion = useReducedMotion();

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
          <p className={`text-xs uppercase tracking-[0.14em] ${themed.muted}`}>Design</p>
          <h2 className={`font-display text-2xl font-medium ${themed.heading}`}>
            {roomName?.trim() || "Your room"}
          </h2>
        </div>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={roomName ? `Photo of ${roomName}` : "Uploaded room photo"}
            className="h-16 w-16 shrink-0 rounded-2xl border border-[color:var(--card-border)] object-cover shadow-card"
          />
        ) : null}
      </motion.header>

      <motion.div variants={item} className="flex flex-col gap-2">
        <p className={`text-xs uppercase tracking-[0.14em] ${themed.muted}`}>Style</p>
        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full bg-chlorophyll px-3.5 py-1.5 text-sm font-medium text-ink`}
        >
          <SwatchIcon />
          {design.style}
        </span>
      </motion.div>

      <motion.div variants={item} className="flex flex-col gap-2">
        <p className={`text-xs uppercase tracking-[0.14em] ${themed.muted}`}>Palette</p>
        <div className="flex flex-wrap gap-3">
          {design.palette.map((hex) => (
            <div key={hex} className="flex flex-col items-center gap-1.5">
              <span
                className="h-11 w-11 rounded-xl border border-[color:var(--card-border)] shadow-card"
                style={{ backgroundColor: hex }}
                aria-hidden="true"
              />
              <span className={`font-mono text-[0.65rem] ${themed.muted}`}>{hex}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={item} className="flex flex-col gap-2">
        <p className={`text-xs uppercase tracking-[0.14em] ${themed.muted}`}>Layout tips</p>
        <ul className="flex flex-col gap-2">
          {design.layout_tips.map((tip, index) => (
            <motion.li
              key={`${index}-${tip}`}
              variants={item}
              className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm ${themed.card} ${themed.body}`}
            >
              <CheckIcon />
              <span>{tip}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      <motion.div variants={item} className="flex flex-col gap-2">
        <p className={`text-xs uppercase tracking-[0.14em] ${themed.muted}`}>Furniture</p>
        <div className="flex flex-wrap gap-2">
          {design.furniture.map((piece) => (
            <span
              key={piece}
              className={`rounded-full border px-3 py-1 text-sm ${themed.card} ${themed.body}`}
            >
              {piece}
            </span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function SwatchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="#12241B" strokeWidth="1.6" opacity="0.55" />
      <circle cx="8.5" cy="8.5" r="1.8" fill="#12241B" opacity="0.55" />
      <path d="M4 16L9 11L15 17" stroke="#12241B" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

function CheckIcon() {
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
