import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AuthProvider, useAuth } from "./auth";
import {
  ApiError,
  getProfile,
  guestLogin,
  type GuestLoginResponse,
  type OtpVerifyResponse,
  type Plant,
  type Profile,
  type Room,
} from "./api";
import GrowthStem, { type FlowStep } from "./components/GrowthStem";
import LandingScreen from "./screens/LandingScreen";
import PhoneScreen from "./screens/PhoneScreen";
import OtpScreen from "./screens/OtpScreen";
import ProfileScreen from "./screens/ProfileScreen";
import GardenScreen from "./screens/GardenScreen";
import UploadScreen from "./screens/UploadScreen";
import RoomsScreen from "./screens/RoomsScreen";
import UploadRoomScreen from "./screens/UploadRoomScreen";
import { themed } from "./theme";

type Screen = "home" | "phone" | "otp" | "profile" | "garden" | "upload" | "rooms" | "upload-room";

const STEP_BY_SCREEN: Record<Exclude<Screen, "home">, FlowStep> = {
  phone: 1,
  otp: 2,
  profile: 3,
  garden: 3,
  upload: 3,
  rooms: 3,
  "upload-room": 3,
};

function AppShell() {
  const { isAuthed, isGuest, userId, login, logout } = useAuth();
  const [screen, setScreen] = useState<Screen>(() => (isAuthed ? "garden" : "home"));
  const [phone, setPhone] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [guestPlant, setGuestPlant] = useState<Plant | null>(null);
  const [guestRoom, setGuestRoom] = useState<Room | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  // Returning session (token already in localStorage): skip straight to the
  // garden instead of asking for phone + code again.
  useEffect(() => {
    if (!isAuthed) return;
    setScreen("garden");
    // Only run this on initial mount / when auth flips true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  function handleVerified(result: OtpVerifyResponse) {
    login({
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      role: result.role,
      userId: result.user_id,
    });
    setGuestPlant(null);
    setGuestRoom(null);
    setProfile(null);
    setScreen("garden");
  }

  function handleGuestContinue(result: GuestLoginResponse) {
    login({
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      role: result.role,
      userId: result.user_id,
    });
    setScreen("garden");
  }

  async function handleStartGuest() {
    if (starting) return;
    setStarting(true);
    setStartError(null);
    try {
      handleGuestContinue(await guestLogin());
    } catch (err) {
      setStartError(
        err instanceof ApiError ? err.message : "Couldn't start the demo. Please try again."
      );
    } finally {
      setStarting(false);
    }
  }

  async function openProfile() {
    setScreen("profile");
    if (profile) return;
    try {
      const p = await getProfile();
      setProfile(p);
    } catch (err) {
      setBootError(err instanceof ApiError ? err.message : "Couldn't load your profile.");
      setScreen("garden");
    }
  }

  function handleLogout() {
    logout();
    setProfile(null);
    setGuestPlant(null);
    setGuestRoom(null);
    setPhone("");
    setScreen("home");
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

  const transition = { duration: 0.32, ease: "easeOut" as const };

  if (screen === "home") {
    return (
      <LandingScreen
        onStartGuest={() => void handleStartGuest()}
        onSignIn={() => {
          setStartError(null);
          setScreen("phone");
        }}
        starting={starting}
        startError={startError}
      />
    );
  }

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
                transition={transition}
              >
                <PhoneScreen
                  initialPhone={phone}
                  onCodeSent={(p) => {
                    setPhone(p);
                    setScreen("otp");
                  }}
                  onGuestContinue={handleGuestContinue}
                />
              </motion.div>
            ) : screen === "otp" ? (
              <motion.div
                key="otp"
                initial={variants.initial}
                animate={variants.animate}
                exit={variants.exit}
                transition={transition}
              >
                <OtpScreen
                  phone={phone}
                  guestUserId={isGuest ? userId ?? undefined : undefined}
                  onVerified={handleVerified}
                  onEditPhone={() => setScreen("phone")}
                />
              </motion.div>
            ) : screen === "garden" ? (
              <motion.div
                key="garden"
                initial={variants.initial}
                animate={variants.animate}
                exit={variants.exit}
                transition={transition}
              >
                <GardenScreen
                  isGuest={isGuest}
                  guestPlant={guestPlant}
                  onAddPlant={() => setScreen("upload")}
                  onSignUp={() => setScreen("phone")}
                  onOpenProfile={() => void openProfile()}
                  onOpenRooms={() => setScreen("rooms")}
                />
              </motion.div>
            ) : screen === "rooms" ? (
              <motion.div
                key="rooms"
                initial={variants.initial}
                animate={variants.animate}
                exit={variants.exit}
                transition={transition}
              >
                <RoomsScreen
                  isGuest={isGuest}
                  guestRoom={guestRoom}
                  onAddRoom={() => setScreen("upload-room")}
                  onSignUp={() => setScreen("phone")}
                  onOpenGarden={() => setScreen("garden")}
                />
              </motion.div>
            ) : screen === "upload-room" ? (
              <motion.div
                key="upload-room"
                initial={variants.initial}
                animate={variants.animate}
                exit={variants.exit}
                transition={transition}
              >
                <UploadRoomScreen
                  onDone={() => setScreen("rooms")}
                  onCreated={(room) => {
                    if (isGuest) setGuestRoom(room);
                  }}
                  onSignUp={() => setScreen("phone")}
                />
              </motion.div>
            ) : screen === "upload" ? (
              <motion.div
                key="upload"
                initial={variants.initial}
                animate={variants.animate}
                exit={variants.exit}
                transition={transition}
              >
                <UploadScreen
                  onDone={() => setScreen("garden")}
                  onCreated={(plant) => {
                    if (isGuest) setGuestPlant(plant);
                  }}
                  onSignUp={() => setScreen("phone")}
                />
              </motion.div>
            ) : profile ? (
              <motion.div
                key="profile"
                initial={variants.initial}
                animate={variants.animate}
                exit={variants.exit}
                transition={transition}
              >
                <ProfileScreen
                  profile={profile}
                  onProfileChange={setProfile}
                  onLogout={handleLogout}
                  onBack={() => setScreen("garden")}
                />
              </motion.div>
            ) : (
              <motion.div
                key="loading"
                initial={variants.initial}
                animate={variants.animate}
                exit={variants.exit}
                transition={transition}
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
