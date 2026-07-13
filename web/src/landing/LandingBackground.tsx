/**
 * Ambient animated backdrop for the landing page: slow-drifting blurred
 * "aurora" blobs in the botanical palette plus a few floating leaves.
 * Entirely self-contained (no images/network). Honors reduced-motion by
 * rendering the blobs static and hiding the drifting leaves.
 */
import { motion, useReducedMotion } from "framer-motion";
import { LeafIcon } from "./icons";

interface Blob {
  className: string;
  color: string;
  drift: { x: number[]; y: number[] };
  duration: number;
}

const BLOBS: Blob[] = [
  {
    className: "left-[-8%] top-[-10%] h-[46vw] w-[46vw]",
    color: "#7BE05A",
    drift: { x: [0, 40, -20, 0], y: [0, 30, 60, 0] },
    duration: 26,
  },
  {
    className: "right-[-12%] top-[8%] h-[40vw] w-[40vw]",
    color: "#3A5A40",
    drift: { x: [0, -50, 20, 0], y: [0, 40, -20, 0] },
    duration: 32,
  },
  {
    className: "left-[20%] bottom-[-18%] h-[44vw] w-[44vw]",
    color: "#D98E5A",
    drift: { x: [0, 30, -30, 0], y: [0, -30, 20, 0] },
    duration: 38,
  },
];

const LEAVES = [
  { className: "left-[12%] top-[22%] h-8 w-8", delay: 0, duration: 14, rotate: 18 },
  { className: "right-[16%] top-[34%] h-10 w-10", delay: 2.5, duration: 18, rotate: -22 },
  { className: "left-[28%] bottom-[20%] h-6 w-6", delay: 1.2, duration: 16, rotate: 30 },
  { className: "right-[26%] bottom-[26%] h-7 w-7", delay: 3.4, duration: 20, rotate: -14 },
];

export default function LandingBackground() {
  const reduce = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {BLOBS.map((blob, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-3xl ${blob.className}`}
          style={{ background: blob.color, opacity: 0.16 }}
          animate={reduce ? undefined : { x: blob.drift.x, y: blob.drift.y }}
          transition={
            reduce
              ? undefined
              : { duration: blob.duration, repeat: Infinity, ease: "easeInOut" }
          }
        />
      ))}

      {!reduce &&
        LEAVES.map((leaf, i) => (
          <motion.div
            key={i}
            className={`absolute text-chlorophyll/40 ${leaf.className}`}
            initial={{ y: 0, rotate: leaf.rotate, opacity: 0.35 }}
            animate={{ y: [0, -22, 0], rotate: [leaf.rotate, leaf.rotate + 12, leaf.rotate] }}
            transition={{
              duration: leaf.duration,
              delay: leaf.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <LeafIcon className="h-full w-full" />
          </motion.div>
        ))}
    </div>
  );
}
