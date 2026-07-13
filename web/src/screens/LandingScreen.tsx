/**
 * Newell landing homepage — the first thing visitors see (before any login).
 * Marketing sections that explain the product for anyone, with a natural/physics
 * animated background, animated header/footer, theme + language toggles,
 * scroll-revealed sections, and highlighted calls-to-action that route into the
 * app (guest demo or sign in).
 *
 * Design system: "growth as light" (ink/paper/chlorophyll/moss/sage/clay,
 * Fraunces display + Inter body), Framer Motion, reduced-motion respected.
 * Copy is bilingual (en/bn) via landing/content.ts + the prefs context.
 */
import { useEffect, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { usePrefs } from "../prefs";
import { LANDING_COPY } from "../landing/content";
import LandingBackground from "../landing/LandingBackground";
import {
  ArrowRightIcon,
  CameraIcon,
  GlobeIcon,
  HomeIcon,
  LeafIcon,
  MoonIcon,
  ShieldIcon,
  SofaIcon,
  SparkIcon,
  SproutIcon,
  SunIcon,
  TimelineIcon,
  TreeIcon,
} from "../landing/icons";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

interface LandingProps {
  onStartGuest: () => void;
  onSignIn: () => void;
  starting?: boolean;
  startError?: string | null;
}

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

function PrimaryCta({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
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

const DOMAIN_ICONS: Icon[] = [LeafIcon, TreeIcon, HomeIcon, SofaIcon];
const STEP_ICONS: Icon[] = [CameraIcon, SparkIcon, TimelineIcon];
const FEATURE_ICONS: Icon[] = [SparkIcon, TimelineIcon, SproutIcon, ShieldIcon, GlobeIcon, HomeIcon, LeafIcon, TreeIcon];
const PERK_ICONS: Icon[] = [SproutIcon, GlobeIcon, ShieldIcon];

export default function LandingScreen({ onStartGuest, onSignIn, starting, startError }: LandingProps) {
  const reduce = useReducedMotion();
  const { theme, toggleTheme, lang, toggleLang } = usePrefs();
  const t = LANDING_COPY[lang];
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
          <div className="hidden items-center gap-8 text-sm text-[color:var(--muted)] lg:flex">
            <a className="transition-colors hover:text-[color:var(--on-surface)]" href="#domains">{t.nav.grow}</a>
            <a className="transition-colors hover:text-[color:var(--on-surface)]" href="#how">{t.nav.how}</a>
            <a className="transition-colors hover:text-[color:var(--on-surface)]" href="#features">{t.nav.features}</a>
            <a className="transition-colors hover:text-[color:var(--on-surface)]" href="#efficient">{t.nav.useWell}</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language toggle */}
            <button
              type="button"
              onClick={toggleLang}
              aria-label="Switch language"
              className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--card-bg)] px-3 py-2 text-xs font-medium text-[color:var(--on-surface)] backdrop-blur-sm transition-colors hover:border-chlorophyll/60"
            >
              {lang === "en" ? "বাংলা" : "EN"}
            </button>
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              className="grid h-9 w-9 place-items-center rounded-full border border-[color:var(--card-border)] bg-[color:var(--card-bg)] text-[color:var(--on-surface)] backdrop-blur-sm transition-colors hover:border-chlorophyll/60"
            >
              {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={onSignIn}
              className="hidden text-sm font-medium text-[color:var(--on-surface)] transition-colors hover:text-chlorophyll sm:block"
            >
              {t.nav.signIn}
            </button>
            <PrimaryCta onClick={onStartGuest} disabled={starting}>
              {starting ? "…" : t.nav.startFree}
            </PrimaryCta>
          </div>
        </nav>
      </motion.header>

      {/* Hero */}
      <section id="top" className="relative mx-auto max-w-6xl px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
        <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.12 }} className="mx-auto max-w-3xl text-center">
          <motion.p
            variants={heroItem}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--card-border)] bg-[color:var(--card-bg)] px-4 py-1.5 text-sm text-[color:var(--muted)] backdrop-blur-sm"
          >
            <LeafIcon className="h-4 w-4 text-chlorophyll" />
            {t.hero.badge}
          </motion.p>
          <motion.h1
            variants={heroItem}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="font-display text-4xl font-semibold leading-[1.05] text-[color:var(--on-surface)] sm:text-6xl"
          >
            {t.hero.titleLead}
            <span className="relative whitespace-nowrap text-chlorophyll">
              {t.hero.titleHighlight}
              <motion.span
                aria-hidden
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
                className="absolute -bottom-1 left-0 h-1 w-full origin-left rounded-full bg-chlorophyll/50"
              />
            </span>
            {t.hero.titleTail}
          </motion.h1>
          <motion.p variants={heroItem} transition={{ duration: 0.6, ease: "easeOut" }} className="mx-auto mt-6 max-w-2xl text-lg text-[color:var(--muted)]">
            {t.hero.subtitle}
          </motion.p>
          <motion.div variants={heroItem} transition={{ duration: 0.6, ease: "easeOut" }} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryCta onClick={onStartGuest} disabled={starting}>
              {starting ? t.hero.starting : t.hero.ctaGuest}
            </PrimaryCta>
            <GhostCta onClick={onSignIn}>{t.hero.ctaSignIn}</GhostCta>
          </motion.div>
          {startError ? <p role="alert" className="mt-4 text-sm text-[color:var(--error)]">{startError}</p> : null}
          <motion.ul variants={heroItem} transition={{ duration: 0.6, ease: "easeOut" }} className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[color:var(--muted)]">
            {t.hero.perks.map((perk, i) => {
              const PerkIcon = PERK_ICONS[i] ?? SproutIcon;
              return (
                <li key={perk} className="inline-flex items-center gap-2">
                  <PerkIcon className="h-4 w-4 text-chlorophyll" />
                  {perk}
                </li>
              );
            })}
          </motion.ul>
        </motion.div>
      </section>

      {/* Domains */}
      <section id="domains" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <Reveal className="mb-10 max-w-2xl">
          <h2 className="font-display text-3xl font-semibold text-[color:var(--on-surface)]">{t.domains.title}</h2>
          <p className="mt-3 text-[color:var(--muted)]">{t.domains.subtitle}</p>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {t.domains.items.map((d, i) => {
            const DIcon = DOMAIN_ICONS[i] ?? LeafIcon;
            return (
              <Reveal key={d.title} delay={i * 0.08}>
                <motion.div
                  whileHover={reduce ? undefined : { y: -6 }}
                  className="h-full rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--card-bg)] p-6 backdrop-blur-sm transition-colors hover:border-chlorophyll/50"
                >
                  <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-chlorophyll/15 text-chlorophyll">
                    <DIcon className="h-6 w-6" />
                  </span>
                  <h3 className="font-display text-xl font-semibold text-[color:var(--on-surface)]">{d.title}</h3>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">{d.body}</p>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <Reveal className="mb-12 text-center">
          <h2 className="font-display text-3xl font-semibold text-[color:var(--on-surface)]">{t.how.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-[color:var(--muted)]">{t.how.subtitle}</p>
        </Reveal>
        <div className="relative grid gap-8 md:grid-cols-3">
          <div className="pointer-events-none absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-chlorophyll/40 to-transparent md:block" />
          {t.how.steps.map((s, i) => {
            const SIcon = STEP_ICONS[i] ?? CameraIcon;
            return (
              <Reveal key={s.title} delay={i * 0.12} className="relative">
                <div className="flex flex-col items-center text-center">
                  <span className="relative z-10 mb-5 grid h-16 w-16 place-items-center rounded-full border border-chlorophyll/40 bg-[color:var(--bg-app)] p-4 text-chlorophyll">
                    <SIcon className="h-7 w-7" />
                  </span>
                  <span className="mb-2 font-mono text-xs tracking-widest text-chlorophyll">{t.how.step} {i + 1}</span>
                  <h3 className="font-display text-xl font-semibold text-[color:var(--on-surface)]">{s.title}</h3>
                  <p className="mt-2 max-w-xs text-sm text-[color:var(--muted)]">{s.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Full features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <Reveal className="mb-10 text-center">
          <h2 className="font-display text-3xl font-semibold text-[color:var(--on-surface)]">{t.features.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-[color:var(--muted)]">{t.features.subtitle}</p>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.features.items.map((f, i) => {
            const FIcon = FEATURE_ICONS[i % FEATURE_ICONS.length] ?? SparkIcon;
            return (
              <Reveal key={f.title} delay={(i % 4) * 0.06}>
                <motion.div
                  whileHover={reduce ? undefined : { y: -4 }}
                  className="flex h-full items-start gap-3 rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--card-bg)] p-5 backdrop-blur-sm transition-colors hover:border-chlorophyll/50"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-chlorophyll/15 text-chlorophyll">
                    <FIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-[color:var(--on-surface)]">{f.title}</h3>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">{f.body}</p>
                  </div>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Use it efficiently — split with a preview card */}
      <section id="efficient" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-[color:var(--on-surface)]">{t.efficient.title}</h2>
            <p className="mt-3 text-[color:var(--muted)]">{t.efficient.subtitle}</p>
            <ul className="mt-6 space-y-4">
              {t.efficient.tips.map((tip) => (
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
                <span className="font-display text-lg font-semibold text-[color:var(--on-surface)]">{t.efficient.preview.name}</span>
                <span className="rounded-full bg-clay/20 px-3 py-1 text-xs font-medium text-clay">{t.efficient.preview.health}</span>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-[color:var(--muted)]">{t.efficient.preview.stageLabel}</dt>
                  <dd className="inline-flex items-center gap-1.5 text-[color:var(--on-surface)]">
                    <SproutIcon className="h-4 w-4 text-chlorophyll" /> {t.efficient.preview.stage}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[color:var(--muted)]">{t.efficient.preview.pestsLabel}</dt>
                  <dd className="text-[color:var(--on-surface)]">{t.efficient.preview.pests}</dd>
                </div>
                <div>
                  <dt className="mb-1 text-[color:var(--muted)]">{t.efficient.preview.wateringLabel}</dt>
                  <dd className="text-[color:var(--on-surface)]">{t.efficient.preview.watering}</dd>
                </div>
                <div>
                  <dt className="mb-2 text-[color:var(--muted)]">{t.efficient.preview.careLabel}</dt>
                  <dd>
                    <ul className="space-y-2">
                      {t.efficient.preview.care.map((step) => (
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
            <h2 className="font-display text-3xl font-semibold text-[color:var(--on-surface)] sm:text-4xl">{t.cta.title}</h2>
            <p className="mx-auto mt-3 max-w-xl text-[color:var(--muted)]">{t.cta.subtitle}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PrimaryCta onClick={onStartGuest} disabled={starting}>
                {starting ? t.hero.starting : t.cta.ctaGuest}
              </PrimaryCta>
              <GhostCta onClick={onSignIn}>{t.cta.ctaSignIn}</GhostCta>
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
              <p className="mt-4 max-w-xs text-sm text-[color:var(--muted)]">{t.footer.blurb}</p>
            </div>
            <FooterCol title={t.footer.modules.title} links={t.footer.modules.links} />
            <FooterCol title={t.footer.product.title} links={t.footer.product.links} />
            <FooterCol title={t.footer.resources.title} links={t.footer.resources.links} />
          </div>
          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-[color:var(--card-border)] pt-6 sm:flex-row sm:items-center">
            <p className="text-sm text-[color:var(--muted)]">© {new Date().getFullYear()} Newell. {t.footer.rights}</p>
            <PrimaryCta onClick={onStartGuest} disabled={starting}>
              {starting ? "…" : t.footer.cta}
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
