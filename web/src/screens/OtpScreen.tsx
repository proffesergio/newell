import { useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ApiError, requestOtp, verifyOtp, type OtpVerifyResponse } from "../api";
import Button from "../components/Button";
import { themed } from "../theme";

const CODE_LENGTH = 6;

interface OtpScreenProps {
  phone: string;
  onVerified: (result: OtpVerifyResponse) => void;
  onEditPhone: () => void;
}

export default function OtpScreen({ phone, onVerified, onEditPhone }: OtpScreenProps) {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const reduceMotion = useReducedMotion();

  const code = digits.join("");
  const complete = code.length === CODE_LENGTH;

  function setDigitAt(index: number, value: string) {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleChange(index: number, raw: string) {
    const value = raw.replace(/\D/g, "");
    if (!value) {
      setDigitAt(index, "");
      return;
    }
    const chars = value.split("");
    chars.forEach((char, offset) => {
      const target = index + offset;
      if (target < CODE_LENGTH) {
        setDigitAt(target, char);
      }
    });
    const nextIndex = Math.min(index + chars.length, CODE_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setDigitAt(index - 1, "");
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (/\d/.test(text)) {
      e.preventDefault();
      handleChange(0, text);
    }
  }

  async function submit(finalCode: string) {
    setError(null);
    setBusy(true);
    try {
      const result = await verifyOtp(phone, finalCode);
      onVerified(result);
    } catch (err) {
      if (err instanceof ApiError && err.code === "otp.invalid") {
        setError("That code didn't match. Check the auth logs and try again.");
      } else {
        setError(err instanceof ApiError ? err.message : "Couldn't verify that code. Try again.");
      }
      setDigits(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (complete) void submit(code);
  }

  async function handleResend() {
    setError(null);
    setResent(false);
    try {
      await requestOtp(phone);
      setResent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't resend the code.");
    }
  }

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.06 } },
  };
  const boxVariants = reduceMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, scale: 0.6, y: 8 },
        show: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { type: "spring" as const, stiffness: 300, damping: 18 },
        },
      };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className={`font-display text-3xl font-medium ${themed.heading}`}>Check the logs.</h1>
        <p className={`text-sm ${themed.muted}`}>
          We sent a 6-digit code to{" "}
          <span className={`font-mono ${themed.heading}`}>{phone}</span>. In dev, mock SMS
          prints it in the auth container logs — run{" "}
          <code className={`rounded px-1.5 py-0.5 font-mono text-xs ${themed.code}`}>
            docker compose logs auth
          </code>{" "}
          to find it.
        </p>
      </header>

      <motion.div
        className="flex justify-between gap-2"
        variants={containerVariants}
        initial="hidden"
        animate="show"
        role="group"
        aria-label="6-digit verification code"
      >
        {digits.map((digit, index) => (
          <motion.input
            key={index}
            variants={boxVariants}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoFocus={index === 0}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
            className={`h-14 w-11 rounded-xl border border-[color:var(--input-border)] bg-[color:var(--input-bg)] text-center font-mono text-2xl text-[color:var(--on-surface)] focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/50 sm:h-16 sm:w-12`}
          />
        ))}
      </motion.div>

      {error ? (
        <p role="alert" className={`text-sm ${themed.error}`}>
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button type="submit" busy={busy} disabled={!complete} className="w-full">
          Verify
        </Button>
        <div className={`flex items-center justify-between text-xs ${themed.muted}`}>
          <button
            type="button"
            onClick={onEditPhone}
            className="underline decoration-current/40 underline-offset-2 hover:text-[color:var(--on-surface)]"
          >
            Edit phone number
          </button>
          <button
            type="button"
            onClick={() => void handleResend()}
            className="underline decoration-current/40 underline-offset-2 hover:text-[color:var(--on-surface)]"
          >
            {resent ? "Code resent" : "Resend code"}
          </button>
        </div>
      </div>
    </form>
  );
}
