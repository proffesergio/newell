import { useState, type FormEvent } from "react";
import { ApiError, guestLogin, requestOtp, type GuestLoginResponse } from "../api";
import Button from "../components/Button";
import { themed } from "../theme";

interface PhoneScreenProps {
  initialPhone: string;
  onCodeSent: (phone: string) => void;
  onGuestContinue: (result: GuestLoginResponse) => void;
}

function isPlausiblePhone(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value.trim());
}

export default function PhoneScreen({ initialPhone, onCodeSent, onGuestContinue }: PhoneScreenProps) {
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!isPlausiblePhone(trimmed)) {
      setError("Enter a phone number with country code, like +8801700000000.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await requestOtp(trimmed);
      onCodeSent(trimmed);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send a code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGuest() {
    setError(null);
    setGuestBusy(true);
    try {
      const result = await guestLogin();
      onGuestContinue(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start a guest session. Try again.");
    } finally {
      setGuestBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className={`font-display text-3xl font-medium ${themed.heading}`}>Let's get you in.</h1>
        <p className={`text-sm ${themed.muted}`}>
          Enter your phone number and we'll send a one-time code to verify it's you.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <label htmlFor="phone" className={`text-xs uppercase tracking-[0.14em] ${themed.muted}`}>
          Phone number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          autoFocus
          placeholder="+8801700000000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={`w-full rounded-xl border px-4 py-3 font-mono text-lg ${themed.input}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "phone-error" : undefined}
        />
        {error ? (
          <p id="phone-error" role="alert" className={`text-sm ${themed.error}`}>
            {error}
          </p>
        ) : null}
      </div>

      <Button type="submit" busy={busy} disabled={guestBusy} className="w-full">
        Send code
      </Button>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-[color:var(--card-border)]" />
        <span className={`text-xs uppercase tracking-[0.14em] ${themed.muted}`}>or</span>
        <span className="h-px flex-1 bg-[color:var(--card-border)]" />
      </div>

      <Button
        type="button"
        variant="ghost"
        busy={guestBusy}
        disabled={busy}
        onClick={() => void handleGuest()}
        className="w-full"
      >
        Try as guest
      </Button>
      <p className={`-mt-3 text-center text-xs ${themed.muted} opacity-80`}>
        Diagnose one plant, no phone number needed.
      </p>
    </form>
  );
}
