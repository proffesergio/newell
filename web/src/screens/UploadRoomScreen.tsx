import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ApiError, SignupRequiredError, createRoom, uploadPhoto, type Room } from "../api";
import Button from "../components/Button";
import RoomDesignCard from "../components/RoomDesignCard";
import SignupGate from "../components/SignupGate";
import { themed } from "../theme";

interface UploadRoomScreenProps {
  onDone: () => void;
  onCreated: (room: Room) => void;
  onSignUp: () => void;
}

type Stage = "pick" | "designing" | "result" | "gate";

const GATE_TITLE = "Design your whole home.";
const GATE_DESCRIPTION =
  "Sign up to save your rooms and design more spaces — your demo room comes with you.";

export default function UploadRoomScreen({ onDone, onCreated, onSignUp }: UploadRoomScreenProps) {
  const [stage, setStage] = useState<Stage>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const reduceMotion = useReducedMotion();

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setError(null);
    setFile(picked);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(picked ? URL.createObjectURL(picked) : null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a photo of your room first.");
      return;
    }
    setError(null);
    setStage("designing");
    try {
      const uploaded = await uploadPhoto(file);
      const created = await createRoom({
        name: name.trim() || undefined,
        image_ref: uploaded.media_id,
      });
      setRoom(created);
      setPhotoUrl(uploaded.url);
      onCreated(created);
      setStage("result");
    } catch (err) {
      if (err instanceof SignupRequiredError) {
        setStage("gate");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Couldn't design that room. Try again.");
      setStage("pick");
    }
  }

  const variants = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -16 },
      };

  if (stage === "gate") {
    return (
      <SignupGate
        onSignUp={onSignUp}
        onDismiss={onDone}
        title={GATE_TITLE}
        description={GATE_DESCRIPTION}
      />
    );
  }

  if (stage === "result" && room) {
    return (
      <div className="flex flex-col gap-6">
        <RoomDesignCard design={room.design} roomName={room.name} photoUrl={photoUrl} />
        <Button type="button" variant="ghost" onClick={onDone} className="w-full">
          Back to rooms
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className={`font-display text-3xl font-medium ${themed.heading}`}>Design a room.</h1>
        <p className={`text-sm ${themed.muted}`}>
          Snap a photo and we'll suggest a style, colour palette, layout, and furniture to match.
        </p>
      </header>

      <AnimatePresence mode="wait">
        {stage === "designing" ? (
          <motion.div
            key="designing"
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[color:var(--card-border)] py-12 text-center"
          >
            <motion.div
              animate={reduceMotion ? undefined : { rotate: [0, 8, -8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-chlorophyll/20"
              aria-hidden="true"
            >
              <RoomIcon />
            </motion.div>
            <p className={`text-sm ${themed.body}`}>Styling your space…</p>
            <p className={`text-xs ${themed.muted}`}>This takes a few seconds.</p>
          </motion.div>
        ) : (
          <motion.div
            key="pick"
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-2">
              <label className={`text-xs uppercase tracking-[0.14em] ${themed.muted}`}>Photo</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                aria-describedby={error ? "upload-room-error" : undefined}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center gap-4 rounded-2xl border border-dashed px-4 py-4 text-left transition-colors hover:border-[color:var(--muted)] ${themed.card}`}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Selected room preview"
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-chlorophyll/15"
                    aria-hidden="true"
                  >
                    <RoomIcon />
                  </div>
                )}
                <span className="flex flex-col gap-0.5">
                  <span className={`text-sm font-medium ${themed.heading}`}>
                    {file ? file.name : "Choose a photo"}
                  </span>
                  <span className={`text-xs ${themed.muted}`}>
                    {file ? "Tap to pick a different one" : "A wide shot of the room works best"}
                  </span>
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="room-name"
                className={`text-xs uppercase tracking-[0.14em] ${themed.muted}`}
              >
                Name <span className="normal-case opacity-70">(optional)</span>
              </label>
              <input
                id="room-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Living room"
                className={`w-full rounded-xl border px-4 py-3 font-body text-base ${themed.input}`}
              />
            </div>

            {error ? (
              <p id="upload-room-error" role="alert" className={`text-sm ${themed.error}`}>
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-3">
              <Button type="submit" className="w-full">
                Design this room
              </Button>
              <Button type="button" variant="ghost" onClick={onDone} className="w-full">
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

function RoomIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10L12 4L20 10V20H4V10Z"
        stroke="#7BE05A"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9 20V14H15V20" stroke="#3A5A40" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
