import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ApiError,
  SignupRequiredError,
  createPlant,
  uploadPhoto,
  type Plant,
} from "../api";
import Button from "../components/Button";
import DiagnosisCard from "../components/DiagnosisCard";
import SignupGate from "../components/SignupGate";
import { themed } from "../theme";

interface UploadScreenProps {
  onDone: () => void;
  onCreated: (plant: Plant) => void;
  onSignUp: () => void;
}

type Stage = "pick" | "analyzing" | "result" | "gate";

export default function UploadScreen({ onDone, onCreated, onSignUp }: UploadScreenProps) {
  const [stage, setStage] = useState<Stage>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [plant, setPlant] = useState<Plant | null>(null);
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
      setError("Choose a photo of your plant first.");
      return;
    }
    setError(null);
    setStage("analyzing");
    try {
      const uploaded = await uploadPhoto(file);
      const created = await createPlant({
        name: name.trim() || undefined,
        image_ref: uploaded.media_id,
      });
      setPlant(created);
      setPhotoUrl(uploaded.url);
      onCreated(created);
      setStage("result");
    } catch (err) {
      if (err instanceof SignupRequiredError) {
        setStage("gate");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Couldn't analyze that photo. Try again.");
      setStage("pick");
    }
  }

  const variants = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -16 } };

  if (stage === "gate") {
    return <SignupGate onSignUp={onSignUp} onDismiss={onDone} />;
  }

  if (stage === "result" && plant) {
    return (
      <div className="flex flex-col gap-6">
        <DiagnosisCard diagnosis={plant.diagnosis} plantName={plant.name} photoUrl={photoUrl} />
        <Button type="button" variant="ghost" onClick={onDone} className="w-full">
          Back to garden
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className={`font-display text-3xl font-medium ${themed.heading}`}>Add a plant.</h1>
        <p className={`text-sm ${themed.muted}`}>
          Snap a photo and we'll read its health, growth stage, and what it needs next.
        </p>
      </header>

      <AnimatePresence mode="wait">
        {stage === "analyzing" ? (
          <motion.div
            key="analyzing"
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[color:var(--card-border)] py-12 text-center"
          >
            <motion.div
              animate={reduceMotion ? undefined : { scale: [1, 1.08, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-chlorophyll/20"
              aria-hidden="true"
            >
              <GrowingSproutIcon />
            </motion.div>
            <p className={`text-sm ${themed.body}`}>Reading the leaves…</p>
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
                aria-describedby={error ? "upload-error" : undefined}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center gap-4 rounded-2xl border border-dashed px-4 py-4 text-left transition-colors hover:border-[color:var(--muted)] ${themed.card}`}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Selected plant preview"
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-chlorophyll/15"
                    aria-hidden="true"
                  >
                    <CameraIcon />
                  </div>
                )}
                <span className="flex flex-col gap-0.5">
                  <span className={`text-sm font-medium ${themed.heading}`}>
                    {file ? file.name : "Choose a photo"}
                  </span>
                  <span className={`text-xs ${themed.muted}`}>
                    {file ? "Tap to pick a different one" : "A clear shot of the leaves works best"}
                  </span>
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="plant-name" className={`text-xs uppercase tracking-[0.14em] ${themed.muted}`}>
                Name <span className="normal-case opacity-70">(optional)</span>
              </label>
              <input
                id="plant-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Living room fern"
                className={`w-full rounded-xl border px-4 py-3 font-body text-base ${themed.input}`}
              />
            </div>

            {error ? (
              <p id="upload-error" role="alert" className={`text-sm ${themed.error}`}>
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-3">
              <Button type="submit" className="w-full">
                Analyze this plant
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

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8H7.5L9 5.5H15L16.5 8H20V19H4V8Z"
        stroke="#7BE05A"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13.5" r="3.2" stroke="#7BE05A" strokeWidth="1.6" />
    </svg>
  );
}

function GrowingSproutIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21V11" stroke="#7BE05A" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 12C12 7 8 5 4 5C4 10 7 12 12 12Z" fill="#7BE05A" opacity="0.85" />
      <path d="M12 9C12 5 15 3 20 3C20 7 18 9 12 9Z" fill="#3A5A40" opacity="0.9" />
    </svg>
  );
}
