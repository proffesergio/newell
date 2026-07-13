import { useState } from "react";
import { motion } from "framer-motion";
import { ApiError, updateProfile, type Locale, type Profile } from "../api";
import Button from "../components/Button";
import { themed } from "../theme";

interface ProfileScreenProps {
  profile: Profile;
  onProfileChange: (profile: Profile) => void;
  onLogout: () => void;
  onBack?: () => void;
}

function truncateId(id: string): string {
  if (id.length <= 14) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

const LOCALES: Array<{ code: Locale; label: string }> = [
  { code: "en", label: "English" },
  { code: "bn", label: "বাংলা" },
];

export default function ProfileScreen({ profile, onProfileChange, onLogout, onBack }: ProfileScreenProps) {
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function saveDisplayName() {
    const trimmed = displayName.trim();
    if (trimmed === profile.display_name || trimmed.length === 0) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateProfile({ display_name: trimmed });
      onProfileChange(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that name. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function setLocale(locale: Locale) {
    if (locale === profile.locale) return;
    setError(null);
    try {
      const updated = await updateProfile({ locale });
      onProfileChange(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't switch language. Try again.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className={`font-display text-3xl font-medium ${themed.heading}`}>You're in.</h1>
          <p className={`text-sm ${themed.muted}`}>
            <span className="font-mono text-xs opacity-80">{truncateId(profile.user_id)}</span>
          </p>
        </div>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={`shrink-0 text-xs underline decoration-current/40 underline-offset-2 ${themed.muted} hover:text-[color:var(--on-surface)]`}
          >
            Back to garden
          </button>
        ) : null}
      </header>

      <div className="flex flex-col gap-2">
        <label htmlFor="display-name" className={`text-xs uppercase tracking-[0.14em] ${themed.muted}`}>
          Display name
        </label>
        <div className="flex gap-2">
          <input
            id="display-name"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setSaved(false);
            }}
            onBlur={() => void saveDisplayName()}
            disabled={saving}
            placeholder="What should we call you?"
            className={`w-full rounded-xl border px-4 py-3 font-body text-base disabled:opacity-60 ${themed.input}`}
          />
        </div>
        {saving ? (
          <p className={`text-xs ${themed.muted} opacity-80`}>Saving…</p>
        ) : saved ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-chlorophyll"
          >
            Saved.
          </motion.p>
        ) : (
          <p className={`text-xs ${themed.muted} opacity-80`}>Saves when you click away.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className={`text-xs uppercase tracking-[0.14em] ${themed.muted}`}>Language</span>
        <div
          role="radiogroup"
          aria-label="Language"
          className={`inline-flex w-fit gap-1 rounded-full border p-1 ${themed.card}`}
        >
          {LOCALES.map((option) => {
            const active = profile.locale === option.code;
            return (
              <button
                key={option.code}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => void setLocale(option.code)}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                  active ? "bg-chlorophyll text-ink" : `${themed.muted} hover:text-[color:var(--on-surface)]`
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <p role="alert" className={`text-sm ${themed.error}`}>
          {error}
        </p>
      ) : null}

      <Button type="button" variant="ghost" onClick={onLogout} className="w-full">
        Log out
      </Button>
    </div>
  );
}
