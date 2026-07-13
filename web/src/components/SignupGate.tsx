import { motion, useReducedMotion } from "framer-motion";
import Button from "./Button";
import { themed } from "../theme";

interface SignupGateProps {
  onSignUp: () => void;
  onDismiss?: () => void;
}

/**
 * Shown whenever a SignupRequiredError bubbles up from the API — a guest
 * hit a gated action (a 2nd plant, the saved garden, etc). Routes into the
 * existing phone-OTP flow; the caller is responsible for passing the
 * guest's user_id along to verifyOtp so their demo plant migrates.
 */
export default function SignupGate({ onSignUp, onDismiss }: SignupGateProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className={`flex flex-col gap-5 rounded-2xl border p-6 text-center sm:p-8 ${themed.card}`}
    >
      <div
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-chlorophyll/20"
        aria-hidden="true"
      >
        <SproutBadgeIcon />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className={`font-display text-2xl font-medium ${themed.heading}`}>
          Keep this one growing.
        </h2>
        <p className={`text-sm ${themed.muted}`}>
          Sign up to save your garden and analyze more plants — your demo plant comes with you.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button type="button" onClick={onSignUp} className="w-full">
          Sign up with your phone
        </Button>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className={`text-xs underline decoration-current/40 underline-offset-2 ${themed.muted} hover:text-[color:var(--on-surface)]`}
          >
            Maybe later
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

function SproutBadgeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21V11" stroke="#7BE05A" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 12C12 7 8 5 4 5C4 10 7 12 12 12Z" fill="#7BE05A" opacity="0.85" />
      <path d="M12 9C12 5 15 3 20 3C20 7 18 9 12 9Z" fill="#3A5A40" opacity="0.9" />
    </svg>
  );
}
