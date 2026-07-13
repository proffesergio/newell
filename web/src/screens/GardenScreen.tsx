import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ApiError, SignupRequiredError, listPlants, type Plant, type PlantSummary } from "../api";
import Button from "../components/Button";
import SignupGate from "../components/SignupGate";
import { themed } from "../theme";

interface GardenScreenProps {
  isGuest: boolean;
  guestPlant: Plant | null;
  onAddPlant: () => void;
  onSignUp: () => void;
  onOpenProfile: () => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function isThriving(health: string | undefined): boolean {
  if (!health) return true;
  return /healthy|thriving|good|great|excellent/.test(health.toLowerCase());
}

function HealthPill({ health }: { health: string | undefined }) {
  const thriving = isThriving(health);
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
        thriving ? "bg-chlorophyll text-ink" : "bg-clay text-ink"
      }`}
    >
      {health ?? "Not yet analyzed"}
    </span>
  );
}

export default function GardenScreen({
  isGuest,
  guestPlant,
  onAddPlant,
  onSignUp,
  onOpenProfile,
}: GardenScreenProps) {
  const [plants, setPlants] = useState<PlantSummary[] | null>(null);
  const [loading, setLoading] = useState(!isGuest);
  const [error, setError] = useState<string | null>(null);
  const [gated, setGated] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (isGuest) return;
    let cancelled = false;
    setLoading(true);
    listPlants()
      .then((res) => {
        if (cancelled) return;
        setPlants(res.plants);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof SignupRequiredError) {
          setGated(true);
        } else {
          setError(err instanceof ApiError ? err.message : "Couldn't load your garden.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isGuest]);

  const container: Variants = reduceMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
  const item: Variants = reduceMotion
    ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } },
      };

  if (gated) {
    return <SignupGate onSignUp={onSignUp} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className={`font-display text-3xl font-medium ${themed.heading}`}>
            {isGuest ? "Your demo garden." : "Your garden."}
          </h1>
          <p className={`text-sm ${themed.muted}`}>
            {isGuest
              ? "Try it out with one plant — sign up to keep growing your collection."
              : "Every plant you've checked in on, in one place."}
          </p>
        </div>
        {!isGuest ? (
          <button
            type="button"
            onClick={onOpenProfile}
            className={`shrink-0 text-xs underline decoration-current/40 underline-offset-2 ${themed.muted} hover:text-[color:var(--on-surface)]`}
          >
            Profile
          </button>
        ) : null}
      </header>

      {isGuest ? (
        guestPlant ? (
          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${themed.card}`}
          >
            <div className="flex flex-col gap-1">
              <p className={`font-display text-lg ${themed.heading}`}>
                {guestPlant.name?.trim() || "Your plant"}
              </p>
              <p className={`text-xs ${themed.muted}`}>Added {formatDate(guestPlant.created_at)}</p>
            </div>
            <HealthPill health={guestPlant.diagnosis?.health} />
          </motion.div>
        ) : (
          <div className={`flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center ${themed.card}`}>
            <p className={`text-sm ${themed.body}`}>
              Your garden is empty. Add a photo to see how your plant's doing.
            </p>
          </div>
        )
      ) : loading ? (
        <p className={`text-sm ${themed.muted}`}>Loading your garden…</p>
      ) : error ? (
        <p role="alert" className={`text-sm ${themed.error}`}>
          {error}
        </p>
      ) : plants && plants.length > 0 ? (
        <motion.ul variants={container} initial="hidden" animate="show" className="flex flex-col gap-3">
          {plants.map((plant) => (
            <motion.li
              key={plant.plant_id}
              variants={item}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${themed.card}`}
            >
              <div className="flex flex-col gap-1">
                <p className={`font-display text-lg ${themed.heading}`}>
                  {plant.name?.trim() || "Unnamed plant"}
                </p>
                <p className={`text-xs ${themed.muted}`}>
                  {plant.latest_diagnosis?.growth_stage ?? "Not yet analyzed"} · Added{" "}
                  {formatDate(plant.created_at)}
                </p>
              </div>
              <HealthPill health={plant.latest_diagnosis?.health} />
            </motion.li>
          ))}
        </motion.ul>
      ) : (
        <div className={`flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center ${themed.card}`}>
          <p className={`text-sm ${themed.body}`}>
            No plants yet. Add your first one and we'll tell you exactly how it's doing.
          </p>
        </div>
      )}

      <Button type="button" onClick={onAddPlant} className="w-full">
        {isGuest && guestPlant ? "Try another photo" : "Add a plant"}
      </Button>
    </div>
  );
}
