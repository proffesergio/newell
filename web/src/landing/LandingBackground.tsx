/**
 * Ambient "living planet" backdrop for the landing page — a natural/physics vibe:
 *   - a faint universe starfield (twinkling),
 *   - an atmospheric horizon glow at the bottom (earth curve + ozone layer),
 *   - slowly orbiting O2 / O3 molecules (oxygen / ozone),
 *   - particles that drift with a gentle gravity-like fall-and-rise,
 *   - soft botanical aurora blobs.
 * Fully self-contained (no images/network). Honors reduced-motion by holding
 * everything still and hiding the drifting/orbiting elements.
 */
import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

const AURORA = [
  { className: "left-[-8%] top-[-10%] h-[46vw] w-[46vw]", color: "#7BE05A", x: [0, 40, -20, 0], y: [0, 30, 60, 0], duration: 26 },
  { className: "right-[-12%] top-[6%] h-[40vw] w-[40vw]", color: "#3A5A40", x: [0, -50, 20, 0], y: [0, 40, -20, 0], duration: 32 },
  { className: "left-[24%] bottom-[6%] h-[44vw] w-[44vw]", color: "#D98E5A", x: [0, 30, -30, 0], y: [0, -30, 20, 0], duration: 38 },
];

/** A bonded pair (O2) or bent triple (O3) of little atoms. */
function Molecule({ kind }: { kind: "O2" | "O3" }) {
  const atoms = kind === "O2" ? [
    { cx: 8, cy: 12 },
    { cx: 20, cy: 12 },
  ] : [
    { cx: 6, cy: 15 },
    { cx: 14, cy: 8 },
    { cx: 22, cy: 15 },
  ];
  return (
    <svg viewBox="0 0 28 24" className="h-full w-full">
      {atoms.map((a, i) => {
        const prev = atoms[i - 1];
        if (!prev) return null;
        return (
          <line key={`b${i}`} x1={prev.cx} y1={prev.cy} x2={a.cx} y2={a.cy} stroke="#7BE05A" strokeWidth="1" opacity="0.5" />
        );
      })}
      {atoms.map((a, i) => (
        <circle key={i} cx={a.cx} cy={a.cy} r="3.4" fill="#7BE05A" opacity="0.55" />
      ))}
    </svg>
  );
}

const MOLECULES = [
  { kind: "O2" as const, className: "left-[14%] top-[26%] h-9 w-11", duration: 34, radius: 22 },
  { kind: "O3" as const, className: "right-[16%] top-[40%] h-10 w-12", duration: 44, radius: 30 },
  { kind: "O2" as const, className: "left-[30%] bottom-[24%] h-8 w-10", duration: 38, radius: 18 },
];

export default function LandingBackground() {
  const reduce = useReducedMotion();

  // Deterministic-per-mount star + particle fields (generated once).
  const stars = useMemo(
    () =>
      Array.from({ length: 46 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 70,
        size: Math.random() * 1.6 + 0.6,
        delay: Math.random() * 4,
        duration: Math.random() * 3 + 2.5,
      })),
    []
  );
  const particles = useMemo(
    () =>
      Array.from({ length: 9 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 90,
        size: Math.random() * 6 + 3,
        fall: Math.random() * 40 + 20,
        duration: Math.random() * 10 + 12,
        delay: Math.random() * 6,
      })),
    []
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Universe: twinkling starfield */}
      {stars.map((s, i) => (
        <motion.span
          key={`star-${i}`}
          className="absolute rounded-full bg-[color:var(--on-surface)]"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, opacity: 0.25 }}
          animate={reduce ? undefined : { opacity: [0.1, 0.5, 0.1] }}
          transition={reduce ? undefined : { duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Botanical aurora blobs */}
      {AURORA.map((b, i) => (
        <motion.div
          key={`aurora-${i}`}
          className={`absolute rounded-full blur-3xl ${b.className}`}
          style={{ background: b.color, opacity: 0.15 }}
          animate={reduce ? undefined : { x: b.x, y: b.y }}
          transition={reduce ? undefined : { duration: b.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Oxygen / ozone molecules gently orbiting */}
      {!reduce &&
        MOLECULES.map((m, i) => (
          <motion.div
            key={`mol-${i}`}
            className={`absolute ${m.className}`}
            style={{ originX: 0.5, originY: 0.5 }}
            animate={{
              x: [0, m.radius, 0, -m.radius, 0],
              y: [-m.radius, 0, m.radius, 0, -m.radius],
              rotate: [0, 360],
            }}
            transition={{ duration: m.duration, repeat: Infinity, ease: "linear" }}
          >
            <Molecule kind={m.kind} />
          </motion.div>
        ))}

      {/* Particles with gentle gravity (fall, then drift back up) */}
      {!reduce &&
        particles.map((p, i) => (
          <motion.span
            key={`p-${i}`}
            className="absolute rounded-full bg-chlorophyll/30 blur-[1px]"
            style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size }}
            animate={{ y: [0, p.fall, 0], opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

      {/* Earth's atmosphere: horizon glow + ozone band at the bottom */}
      <div
        className="absolute inset-x-0 bottom-0 h-[38vh]"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 140%, rgba(123,224,90,0.22) 0%, rgba(58,90,64,0.14) 34%, rgba(123,224,90,0.05) 52%, transparent 70%)",
        }}
      />
    </div>
  );
}
