import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AuthProvider, useAuth } from "./auth";
import { ApiError, getProfile, type OtpVerifyResponse, type Profile } from "./api";
import GrowthStem, { type FlowStep } from "./components/GrowthStem";
import PhoneScreen from "./screens/PhoneScreen";
import OtpScreen from "./screens/OtpScreen";
import ProfileScreen from "./screens/ProfileScreen";
import { themed } from "./theme";

type Screen = "phone" | "otp" | "profile";

const STEP_BY_SCREEN: Record<Screen, FlowStep> = {
  phone: 1,
  otp: 2,
  profile: 3,
};

function AppShell() {
  const { isAuthed, login, logout } = useAuth();
  const [screen, setScreen] = useState<Screen>(() => (isAuthed ? "profile" : "phone"));
  const [phone, setPhone] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  // If a token already exists in localStorage (returning session), skip
  // straight to the profile screen instead of asking for phone + code again.
  useEffect(() => {
    if (!isAuthed) return;
    let cancelled = false;
    getProfile()
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        setScreen("profile");
      })
      .catch(() => {
        if (cancelled) return;
        logout();
      });
    return () => {
      cancelled = true;
    };
    // Only run this on initial mount / when auth flips true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  async function handleVerified(result: OtpVerifyResponse) {
    login({ accessToken: result.access_token, refreshToken: result.refresh_token });
    try {
      const p = await getProfile();
      setProfile(p);
      setScreen("profile");
    } catch (err) {
      setBootError(err instanceof ApiError ? err.message : "Couldn't load your profile.");
    }
  }

  function handleLogout() {
    logout();
    setProfile(null);
    setPhone("");
    setScreen("phone");
  }

  const variants = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, y: 28 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -28 },
      };

  return (
    <div className="grain-surface flex min-h-screen w-full items-center justify-center px-4 py-12 sm:px-6">
      <div className="flex w-full max-w-3xl flex-col items-stretch gap-8 md:flex-row md:items-center md:gap-12">
        <div className="md:w-56 md:shrink-0">
          <GrowthStem step={STEP_BY_SCREEN[screen]} />
        </div>

        <div
          className={`relative w-full overflow-hidden rounded-3xl border p-8 shadow-card backdrop-blur-sm sm:p-10 ${themed.card}`}
        >
          {bootError ? (
            <p role="alert" className={`mb-4 text-sm ${themed.error}`}>
              {bootError}
            </p>
          ) : null}
          <AnimatePresence mode="wait">
            {screen === "phone" ? (
              <motion.div
                key="phone"
                initial={variants.initial}
                animate={variants.animate}
                exit={variants.exit}
                transition={{ duration: 0.32, ease: "easeOut" }}
              >
                <PhoneScreen
                  initialPhone={phone}
                  onCodeSent={(p) => {
                    setPhone(p);
                    setScreen("otp");
                  }}
                />
              </motion.div>
            ) : screen === "otp" ? (
              <motion.div
                key="otp"
                initial={variants.initial}
                animate={variants.animate}
                exit={variants.exit}
                transition={{ duration: 0.32, ease: "easeOut" }}
              >
                <OtpScreen
                  phone={phone}
                  onVerified={handleVerified}
                  onEditPhone={() => setScreen("phone")}
                />
              </motion.div>
            ) : profile ? (
              <motion.div
                key="profile"
                initial={variants.initial}
                animate={variants.animate}
                exit={variants.exit}
                transition={{ duration: 0.32, ease: "easeOut" }}
              >
                <ProfileScreen profile={profile} onProfileChange={setProfile} onLogout={handleLogout} />
              </motion.div>
            ) : (
              <motion.div
                key="loading"
                initial={variants.initial}
                animate={variants.animate}
                exit={variants.exit}
                transition={{ duration: 0.32, ease: "easeOut" }}
                className={`text-sm ${themed.muted}`}
              >
                Loading your profile…
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
