import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ApiError, SignupRequiredError, listRooms, type Room, type RoomSummary } from "../api";
import Button from "../components/Button";
import SignupGate from "../components/SignupGate";
import { themed } from "../theme";

interface RoomsScreenProps {
  isGuest: boolean;
  guestRoom: Room | null;
  onAddRoom: () => void;
  onSignUp: () => void;
  onOpenGarden: () => void;
}

const GATE_TITLE = "Design your whole home.";
const GATE_DESCRIPTION =
  "Sign up to save your rooms and design more spaces — your demo room comes with you.";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function PaletteDots({ palette }: { palette: string[] }) {
  return (
    <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
      {palette.slice(0, 4).map((hex, i) => (
        <span
          key={`${i}-${hex}`}
          className="h-4 w-4 rounded-full border border-[color:var(--card-border)]"
          style={{ backgroundColor: hex }}
        />
      ))}
    </span>
  );
}

export default function RoomsScreen({
  isGuest,
  guestRoom,
  onAddRoom,
  onSignUp,
  onOpenGarden,
}: RoomsScreenProps) {
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [loading, setLoading] = useState(!isGuest);
  const [error, setError] = useState<string | null>(null);
  const [gated, setGated] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (isGuest) return;
    let cancelled = false;
    setLoading(true);
    listRooms()
      .then((res) => {
        if (cancelled) return;
        setRooms(res.rooms);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof SignupRequiredError) {
          setGated(true);
        } else {
          setError(err instanceof ApiError ? err.message : "Couldn't load your rooms.");
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
    return <SignupGate onSignUp={onSignUp} title={GATE_TITLE} description={GATE_DESCRIPTION} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className={`font-display text-3xl font-medium ${themed.heading}`}>
            {isGuest ? "Your demo rooms." : "Your rooms."}
          </h1>
          <p className={`text-sm ${themed.muted}`}>
            {isGuest
              ? "Try it out with one room — sign up to redesign your whole home."
              : "Every room you've reimagined, in one place."}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenGarden}
          className={`shrink-0 text-xs underline decoration-current/40 underline-offset-2 ${themed.muted} hover:text-[color:var(--on-surface)]`}
        >
          Garden
        </button>
      </header>

      {isGuest ? (
        guestRoom ? (
          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${themed.card}`}
          >
            <div className="flex flex-col gap-1">
              <p className={`font-display text-lg ${themed.heading}`}>
                {guestRoom.name?.trim() || "Your room"}
              </p>
              <p className={`text-xs ${themed.muted}`}>
                {guestRoom.design.style} · Added {formatDate(guestRoom.created_at)}
              </p>
            </div>
            <PaletteDots palette={guestRoom.design.palette} />
          </motion.div>
        ) : (
          <div
            className={`flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center ${themed.card}`}
          >
            <p className={`text-sm ${themed.body}`}>
              No rooms yet. Add a photo and we'll style it for you.
            </p>
          </div>
        )
      ) : loading ? (
        <p className={`text-sm ${themed.muted}`}>Loading your rooms…</p>
      ) : error ? (
        <p role="alert" className={`text-sm ${themed.error}`}>
          {error}
        </p>
      ) : rooms && rooms.length > 0 ? (
        <motion.ul
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3"
        >
          {rooms.map((room) => (
            <motion.li
              key={room.room_id}
              variants={item}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${themed.card}`}
            >
              <div className="flex flex-col gap-1">
                <p className={`font-display text-lg ${themed.heading}`}>
                  {room.name?.trim() || "Unnamed room"}
                </p>
                <p className={`text-xs ${themed.muted}`}>
                  {room.latest_design?.style ?? "Not yet designed"} · Added{" "}
                  {formatDate(room.created_at)}
                </p>
              </div>
              {room.latest_design ? <PaletteDots palette={room.latest_design.palette} /> : null}
            </motion.li>
          ))}
        </motion.ul>
      ) : (
        <div
          className={`flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center ${themed.card}`}
        >
          <p className={`text-sm ${themed.body}`}>
            No rooms yet. Add your first one and we'll design a style, palette, and layout for it.
          </p>
        </div>
      )}

      <Button type="button" onClick={onAddRoom} className="w-full">
        {isGuest && guestRoom ? "Try another room" : "Add a room"}
      </Button>
    </div>
  );
}
