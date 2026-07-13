/**
 * Newell landing homepage — the first thing visitors see (before any login).
 * Marketing sections that explain the product for anyone, with an animated
 * background, animated header/footer, scroll-revealed sections, and highlighted
 * calls-to-action that route into the app (guest demo or sign in).
 *
 * Design system: "growth as light" (ink/paper/chlorophyll/moss/sage/clay,
 * Fraunces display + Inter body), Framer Motion, reduced-motion respected.
 */
import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import LandingBackground from "../landing/LandingBackground";
import {
  ArrowRightIcon,
  CameraIcon,
  GlobeIcon,
  HomeIcon,
  LeafIcon,
  ShieldIcon,
  SofaIcon,
  SparkIcon,
  SproutIcon,
  TimelineIcon,
  TreeIcon,
} from "../landing/icons";

interface LandingProps {
  onStartGuest: () => void;
  onSignIn: () => void;
  starting?: boolean;
  startError?: string | null;
}

/** Scroll-triggered reveal wrapper (fades/rises into view once). */
function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26 }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function PrimaryCta({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-chlorophyll px-6 py-3 font-medium text-ink shadow-[0_16px_40px_-12px_rgba(123,224,90,0.7)] transition-shadow hover:shadow-[0_20px_54px_-10px_rgba(123,224,90,0.85)] disabled:opacity-70"
    >
      <span className="absolute inset-0 -z-10 rounded-full bg-chlorophyll blur-md opacity-60 transition-opacity group-hover:opacity-90" />
      {children}
      <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </motion.button>
  );
}

function GhostCta({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--card-border)] bg-[color:var(--card-bg)] px-6 py-3 font-medium text-[color:var(--on-surface)] backdrop-blur-sm transition-colors hover:border-chlorophyll/60"
    >
      {children}
    </motion.button>
  );
}

const DOMAINS = [
  {
    icon: LeafIcon,
    title: "Grow gardens",
    body: "Diagnose plant health, spot pests early, and get watering and care steps tuned to each plant.",
  },
  {
    icon: TreeIcon,
    title: "Plant trees",
    body: "Green your street or community — pick the right species and learn how to help young trees thrive.",
  },
  {
    icon: HomeIcon,
    title: "Improve your home",
    body: "Turn a photo or sketch into step-by-step building guidance, materials, and design principles.",
  },
  {
    icon: SofaIcon,
    title: "Decorate rooms",
    body: "Get layout ideas, color palettes, and style improvements for any room from a single photo.",
  },
];

const STEPS = [
  {
    icon: CameraIcon,
    title: "Snap a photo",
    body: "Point your camera at a plant, a wall, or a room. No forms, no jargon — just a picture.",
  },
  {
    icon: SparkIcon,
    title: "Get AI guidance",
    body: "Newell reads the image and returns clear, specific, doable advice in seconds.",
  },
  {
    icon: TimelineIcon,
    title: "Track your progress",
    body: "Save it and watch things grow over time on a simple timeline you actually enjoy.",
  },
];

const PERKS = [
  { icon: SproutIcon, label: "Made for total beginners" },
  { icon: GlobeIcon, label: "English & বাংলা" },
  { icon: ShieldIcon, label: "Private — try before you sign up" },
];

export default function LandingScreen({ onStartGuest, onSignIn, starting, startError }: LandingProps) {
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const heroItem = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="grain-surface relative min-h-screen w-full overflow-x-hidden">
      <LandingBackground />

      {/* Header */}
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`sticky top-0 z-30 transition-colors ${
          scrolled
            ? "border-b border-[color:var(--card-border)] bg-[color:var(--bg-app)]/80 backdrop-blur-md"
            : "border-b border-transparent"
        }`}
      >
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="#top" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-chlorophyll/15 text-chlorophyll">
              <SproutIcon className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-semibold text-[color:var(--on-surface)]">Newell</span>
          </a>
          <div className="hidden items-center gap-8 text-sm text-[color:var(--muted)] md:flex">
            <a className="transition-colors hover:text-[color:var(--on-surface)]" href="#domains">
              What you can grow
            </a>
            <a className="transition-colors hover:text-[color:var(--on-surface)]" href="#how">
              How it works
            </a>
            <a className="transition-colors hover:text-[color:var(--on-surface)]" href="#efficient">
              Use it well
            </a>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSignIn}
              className="hidden text-sm font-medium text-[color:var(--on-surface)] transition-colors hover:text-chlorophyll sm:block"
            >
              Sign in
            </button>
            <PrimaryCta onClick={onStartGuest} disabled={starting}>
              {starting ? "Starting…" : "Start free"}
            </PrimaryCta>
          </div>
        </nav>
      </motion.header>

      {/* Hero */}
      <section id="top" className="relative mx-auto max-w-6xl px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
        <motion.div
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.12 }}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.p
            variants={heroItem}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--card-border)] bg-[color:var(--card-bg)] px-4 py-1.5 text-sm text-[color:var(--muted)] backdrop-blur-sm"
          >
            <LeafIcon className="h-4 w-4 text-chlorophyll" />
            Grow gardens, trees, homes & rooms — from one place
          </motion.p>
          <motion.h1
            variants={heroItem}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="font-display text-4xl font-semibold leading-[1.05] text-[color:var(--on-surface)] sm:text-6xl"
          >
            Help everything around you{" "}
            <span className="relative whitespace-nowrap text-chlorophyll">
              grow
              <motion.span
                aria-hidden
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
                className="absolute -bottom-1 left-0 h-1 w-full origin-left rounded-full bg-chlorophyll/50"
              />
            </span>
          </motion.h1>
          <motion.p
            variants={heroItem}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mx-auto mt-6 max-w-2xl text-lg text-[color:var(--muted)]"
          >
            Newell is your AI guide for planting, building, and decorating. Snap a photo, get clear
            advice anyone can follow, and watch your plants, trees, home, and rooms get better over time.
          </motion.p>
          <motion.div
            variants={heroItem}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <PrimaryCta onClick={onStartGuest} disabled={starting}>
              {starting ? "Starting your demo…" : "Try it free — as guest"}
            </PrimaryCta>
            <GhostCta onClick={onSignIn}>Sign in</GhostCta>
          </motion.div>
          {startError ? (
            <p role="alert" className="mt-4 text-sm text-[color:var(--error)]">
              {startError}
            </p>
          ) : null}
          <motion.ul
            variants={heroItem}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[color:var(--muted)]"
          >
            {PERKS.map((perk) => (
              <li key={perk.label} className="inline-flex items-center gap-2">
                <perk.icon className="h-4 w-4 text-chlorophyll" />
                {perk.label}
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </section>

      {/* Domains */}
      <section id="domains" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <Reveal className="mb-10 max-w-2xl">
          <h2 className="font-display text-3xl font-semibold text-[color:var(--on-surface)]">
            One app for everything you want to nurture
          </h2>
          <p className="mt-3 text-[color:var(--muted)]">
            Whatever you're growing or improving, Newell meets you where you are.
          </p>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {DOMAINS.map((d, i) => (
            <Reveal key={d.title} delay={i * 0.08}>
              <motion.div
                whileHover={reduce ? undefined : { y: -6 }}
                className="h-full rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--card-bg)] p-6 backdrop-blur-sm transition-colors hover:border-chlorophyll/50"
              >
                <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-chlorophyll/15 text-chlorophyll">
                  <d.icon className="h-6 w-6" />
                </span>
                <h3 className="font-display text-xl font-semibold text-[color:var(--on-surface)]">{d.title}</h3>
                <p className="mt-2 text-sm text-[color:var(--muted)]">{d.body}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <Reveal className="mb-12 text-center">
          <h2 className="font-display text-3xl font-semibold text-[color:var(--on-surface)]">
            How Newell works
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[color:var(--muted)]">
            Three simple steps. No expertise required — just curiosity.
          </p>
        </Reveal>
        <div className="relative grid gap-8 md:grid-cols-3">
          <div className="pointer-events-none absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-chlorophyll/40 to-transparent md:block" />
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.12} className="relative">
              <div className="flex flex-col items-center text-center">
                <span className="relative z-10 mb-5 grid h-16 w-16 place-items-center rounded-full border border-chlorophyll/40 bg-[color:var(--bg-app)] p-4 text-chlorophyll">
                  <s.icon className="h-7 w-7" />
                </span>
                <span className="mb-2 font-mono text-xs tracking-widest text-chlorophyll">
                  STEP {i + 1}
                </span>
                <h3 className="font-display text-xl font-semibold text-[color:var(--on-surface)]">{s.title}</h3>
                <p className="mt-2 max-w-xs text-sm text-[color:var(--muted)]">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Use it efficiently — split with a preview card */}
      <section id="efficient" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-[color:var(--on-surface)]">
              Get the most out of Newell
            </h2>
            <p className="mt-3 text-[color:var(--muted)]">
              A few habits turn quick answers into steady progress.
            </p>
            <ul className="mt-6 space-y-4">
              {[
                "Take clear, well-lit photos — close enough to see leaves, walls, or corners.",
                "Save each result so your timeline shows real change week to week.",
                "Act on one care step at a time; small consistent moves beat big rare ones.",
                "Switch between English and বাংলা anytime from your profile.",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-3">
                  <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-chlorophyll/15 text-chlorophyll">
                    <LeafIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm text-[color:var(--on-surface)]">{tip}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1}>
            <motion.div
              initial={reduce ? undefined : { rotate: -1.5 }}
              whileHover={reduce ? undefined : { rotate: 0, y: -4 }}
              className="rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--card-bg)] p-6 shadow-card backdrop-blur-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display text-lg font-semibold text-[color:var(--on-surface)]">
                  Demo Basil
                </span>
                <span className="rounded-full bg-clay/20 px-3 py-1 text-xs font-medium text-clay">
                  Needs attention
                </span>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-[color:var(--muted)]">Growth stage</dt>
                  <dd className="inline-flex items-center gap-1.5 text-[color:var(--on-surface)]">
                    <SproutIcon className="h-4 w-4 text-chlorophyll" /> Mature
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[color:var(--muted)]">Pests</dt>
                  <dd className="text-[color:var(--on-surface)]">Spider mites</dd>
                </div>
                <div>
                  <dt className="mb-1 text-[color:var(--muted)]">Watering</dt>
                  <dd className="text-[color:var(--on-surface)]">
                    Keep the current schedule — moisture looks well balanced.
                  </dd>
                </div>
                <div>
                  <dt className="mb-2 text-[color:var(--muted)]">Care steps</dt>
                  <dd>
                    <ul className="space-y-2">
                      {[
                        "Move to brighter, indirect sunlight.",
                        "Feed a balanced liquid fertilizer biweekly.",
                        "Check leaf undersides for early pests.",
                      ].map((step) => (
                        <li key={step} className="flex items-start gap-2 text-[color:var(--on-surface)]">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-chlorophyll" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>
            </motion.div>
          </Reveal>
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-chlorophyll/30 bg-gradient-to-br from-moss/30 to-chlorophyll/10 p-10 text-center sm:p-16">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-chlorophyll/20 blur-3xl" />
            <h2 className="font-display text-3xl font-semibold text-[color:var(--on-surface)] sm:text-4xl">
              Start growing today
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[color:var(--muted)]">
              Try a full plant diagnosis as a guest — no signup needed. Create an account whenever
              you want to save your progress.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PrimaryCta onClick={onStartGuest} disabled={starting}>
                {starting ? "Starting…" : "Try it free — as guest"}
              </PrimaryCta>
              <GhostCta onClick={onSignIn}>Sign in</GhostCta>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-[color:var(--card-border)]">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-chlorophyll/15 text-chlorophyll">
                  <SproutIcon className="h-5 w-5" />
                </span>
                <span className="font-display text-xl font-semibold text-[color:var(--on-surface)]">Newell</span>
              </div>
              <p className="mt-4 max-w-xs text-sm text-[color:var(--muted)]">
                AI-powered guidance to grow gardens, plant trees, and make your home and rooms
                nicer — all from one place.
              </p>
            </div>
            <FooterCol
              title="Modules"
              links={["Grow gardens", "Plant trees", "Improve your home", "Decorate rooms"]}
            />
            <FooterCol title="Product" links={["How it works", "Use it well", "Guest demo", "Sign in"]} />
            <FooterCol title="Resources" links={["Getting started", "Care tips", "Languages", "Support"]} />
          </div>
          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-[color:var(--card-border)] pt-6 sm:flex-row sm:items-center">
            <p className="text-sm text-[color:var(--muted)]">© {new Date().getFullYear()} Newell. Grow well.</p>
            <PrimaryCta onClick={onStartGuest} disabled={starting}>
              {starting ? "Starting…" : "Get started"}
            </PrimaryCta>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="mb-3 font-mono text-xs tracking-widest text-chlorophyll">{title.toUpperCase()}</h4>
      <ul className="space-y-2 text-sm text-[color:var(--muted)]">
        {links.map((l) => (
          <li key={l}>
            <span className="cursor-default transition-colors hover:text-[color:var(--on-surface)]">{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
