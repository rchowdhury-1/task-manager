'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { LogoMark } from '@/components/LogoMark';
import { ThemeToggle } from '@/components/ThemeToggle';

// ─── Animations ──────────────────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

function AnimateOnScroll({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Marketing Nav ───────────────────────────────────────────────────────────

function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 bg-page/88 backdrop-blur-md border-b border-border">
      <div className="max-w-[1240px] mx-auto px-5 md:px-10 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark size={24} />
          <span className="text-[15px] font-semibold tracking-tight whitespace-nowrap">Personal OS</span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-[13.5px] text-secondary hover:text-primary transition-colors px-3 py-2 hidden sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="h-9 px-4 rounded-lg bg-accent text-white text-[13.5px] font-medium inline-flex items-center gap-1.5 hover:bg-accent-hover transition-colors"
          >
            Get started <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative pt-16 md:pt-20 pb-20 overflow-hidden">
      {/* Radial accent glow */}
      <div
        className="absolute left-1/2 top-[60px] -translate-x-1/2 w-[980px] h-[980px] rounded-full pointer-events-none z-0 opacity-60"
        style={{
          background: 'radial-gradient(circle, var(--color-crimson-soft) 0%, transparent 60%)',
        }}
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-[1100px] mx-auto px-5 md:px-10 text-center"
      >
        {/* Eyebrow */}
        <motion.div
          variants={fadeInUp}
          className="font-mono text-[11.5px] text-accent tracking-[0.22em] uppercase mb-7 inline-flex items-center gap-2.5"
        >
          <span className="w-6 h-px bg-accent" />
          A personal operating system
          <span className="w-6 h-px bg-accent" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeInUp}
          className="text-[clamp(48px,9vw,120px)] font-semibold leading-[0.96] tracking-display text-primary"
        >
          Your busy life.
          <br />
          <span className="font-display italic text-accent font-normal">Finally organised.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={fadeInUp}
          className="mt-8 mx-auto max-w-[620px] text-[17px] md:text-[19px] leading-relaxed text-secondary"
        >
          Stop juggling apps, notebooks, and mental notes. Personal OS holds your tasks,
          habits, schedule, and goals in one calm view — so you can stop managing your
          life and start living it.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={fadeInUp} className="mt-9 flex justify-center items-center gap-3.5 flex-wrap">
          <Link
            href="/register"
            className="h-12 px-6 rounded-[10px] bg-accent text-white text-[15px] font-medium inline-flex items-center gap-2 hover:bg-accent-hover transition-colors"
            style={{ boxShadow: '0 10px 24px -8px color-mix(in oklab, var(--color-accent) 60%, transparent)' }}
          >
            Get started <ArrowRight size={16} />
          </Link>
          <a
            href="#features"
            className="h-12 px-5 rounded-[10px] bg-surface border border-border-strong text-primary text-[15px] font-medium inline-flex items-center gap-2 hover:bg-surface-raised transition-colors"
          >
            <Play size={12} /> See how it works
          </a>
        </motion.div>

        <motion.p variants={fadeInUp} className="mt-5 text-[12.5px] text-tertiary">
          Free for personal use &middot; Built for one, refined for everyone
        </motion.p>
      </motion.div>
    </section>
  );
}

// ─── AI Demo Bar ─────────────────────────────────────────────────────────────

const AI_PHRASES = [
  'Call mom Friday 7pm #family P1',
  'Block 2h tomorrow morning for deep work on Q3 roadmap',
  'Move my workout to Saturday and add reading at 9pm',
  'Show me what I shipped this week tagged #design',
];

function tokenize(text: string) {
  return text.split(/\s+/).filter(Boolean).map(w => {
    if (w.startsWith('#')) return { kind: 'tag' as const, v: w };
    if (/^p[1-3]$/i.test(w)) return { kind: 'priority' as const, v: w.toUpperCase() };
    if (/\b(mon|tue|wed|thu|fri|sat|sun|tomorrow|today|saturday|friday|monday|weekend|morning)\b/i.test(w))
      return { kind: 'day' as const, v: w };
    if (/\d+(am|pm)|\d+:\d+/i.test(w)) return { kind: 'time' as const, v: w };
    if (/\d+h|\d+m/.test(w)) return { kind: 'dur' as const, v: w };
    return { kind: 'text' as const, v: w };
  });
}

const TOKEN_CHIP: Record<string, string> = {
  tag: 'bg-tag-blue-bg text-tag-blue',
  priority: 'bg-tag-rose-bg text-tag-rose',
  day: 'bg-tag-amber-bg text-tag-amber',
  time: 'bg-tag-violet-bg text-tag-violet',
  dur: 'bg-tag-green-bg text-tag-green',
  text: 'bg-tag-slate-bg text-tag-slate',
};

function AIDemoBar() {
  const [pi, setPi] = useState(0);
  const [typed, setTyped] = useState('');
  const [parsing, setParsing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = AI_PHRASES[pi];
    if (typed.length < target.length) {
      const t = setTimeout(() => setTyped(target.slice(0, typed.length + 1)), 38 + Math.random() * 30);
      return () => clearTimeout(t);
    }
    const a = setTimeout(() => setParsing(true), 800);
    const b = setTimeout(() => { setParsing(false); setTyped(''); setPi((pi + 1) % AI_PHRASES.length); }, 3400);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [typed, pi]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [typed]);

  const tokens = tokenize(typed);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Input side */}
      <div className="bg-surface border border-border rounded-2xl p-6 md:p-7 flex flex-col gap-5 min-h-[260px] shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-tertiary tracking-[0.14em] uppercase">You type</span>
          <span className="font-mono text-[11px] text-tertiary border border-border rounded px-1.5 py-0.5">&#8984;K</span>
        </div>
        <div className="flex-1 p-4 rounded-[10px] bg-page border border-border flex items-center gap-3 min-h-[64px]">
          <span className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center shrink-0">
            <Sparkles size={16} />
          </span>
          <div ref={scrollRef} className="flex-1 min-h-[22px] text-[16px] text-primary whitespace-nowrap overflow-x-auto overflow-y-hidden hide-scrollbar">
            {typed}
            <span className="inline-block w-[1.5px] h-[18px] bg-accent ml-0.5 align-[-3px] animate-blink" />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['plain English', 'hashtags', 'priorities', 'natural dates', 'durations'].map(s => (
            <span key={s} className="bg-tag-slate-bg text-tag-slate text-[12px] px-2.5 py-1 rounded-md font-medium">{s}</span>
          ))}
        </div>
      </div>

      {/* Parsed side */}
      <div className="bg-surface border border-border rounded-2xl p-6 md:p-7 flex flex-col gap-5 min-h-[260px] shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-tertiary tracking-[0.14em] uppercase">Parsed</span>
          <span className="font-mono text-[11px] text-accent">
            {parsing ? 'parsing\u2026' : typed.length === AI_PHRASES[pi].length ? '\u2713 ready' : ''}
          </span>
        </div>
        <div className="flex-1 p-4 rounded-[10px] bg-page border border-border flex flex-wrap gap-1.5 content-start min-h-[64px]">
          {tokens.map((tk, i) => (
            <span
              key={i}
              className={`${TOKEN_CHIP[tk.kind]} text-[13.5px] leading-[22px] px-2.5 py-0.5 rounded-md font-medium transition-opacity ${parsing ? 'opacity-50' : ''}`}
            >
              {tk.v}
            </span>
          ))}
        </div>
        <div className="flex gap-3 text-[12.5px] text-tertiary">
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-tag-amber" /> day</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-tag-violet" /> time</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-tag-blue" /> tag</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-tag-rose" /> priority</span>
        </div>
      </div>
    </div>
  );
}

// ─── Streak Grid ─────────────────────────────────────────────────────────────

function StreakGrid() {
  const cells = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < 7 * 18; i++) {
      const recent = i > 100;
      const r = Math.random();
      if (recent) arr.push(r < 0.85 ? Math.floor(Math.random() * 3) + 1 : 0);
      else arr.push(r < 0.55 ? Math.floor(Math.random() * 4) : 0);
    }
    return arr;
  }, []);

  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <div ref={ref} className="grid grid-cols-[repeat(18,1fr)] gap-1">
      {cells.map((v, i) => (
        <div
          key={i}
          className="aspect-square rounded-[3px] transition-all"
          style={{
            background: v === 0
              ? 'var(--color-surface-raised)'
              : `color-mix(in oklab, var(--color-accent) ${30 + v * 22}%, var(--color-surface))`,
            border: v === 0 ? '1px solid var(--color-border)' : 'none',
            opacity: inView ? 1 : 0,
            transform: inView ? 'scale(1)' : 'scale(0.6)',
            transition: `opacity 600ms ${i * 4}ms cubic-bezier(.2,.7,.3,1), transform 600ms ${i * 4}ms cubic-bezier(.2,.7,.3,1)`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Feature Section ─────────────────────────────────────────────────────────

function FeatureSection({
  eyebrow, title, accent, body, kicker, children, id,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  body: string;
  kicker?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <AnimateOnScroll>
      <section
        id={id}
        className="max-w-[1240px] mx-auto px-5 md:px-10 py-20 md:py-28 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center"
      >
        <div>
          <motion.div variants={fadeInUp} className="font-mono text-[11px] text-accent tracking-[0.18em] uppercase mb-6">
            {eyebrow}
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-[36px] md:text-[52px] font-semibold leading-[1.02] tracking-display text-primary mb-6">
            {title}
            <span className="font-display italic font-normal text-accent"> {accent}</span>
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-[16px] md:text-[18px] leading-relaxed text-secondary mb-7 max-w-[460px]">
            {body}
          </motion.p>
          {kicker && (
            <motion.div
              variants={fadeInUp}
              className="font-display italic text-[18px] md:text-[22px] text-primary leading-snug pl-4 border-l-2 border-accent max-w-[460px]"
            >
              {kicker}
            </motion.div>
          )}
        </div>
        <motion.div variants={fadeInUp}>
          {children}
        </motion.div>
      </section>
    </AnimateOnScroll>
  );
}

// ─── Closer ──────────────────────────────────────────────────────────────────

function Closer() {
  return (
    <AnimateOnScroll>
      <section className="py-24 md:py-28 text-center bg-page border-t border-border">
        <div className="max-w-[760px] mx-auto px-5 md:px-10">
          <motion.div variants={fadeInUp} className="font-mono text-[11px] text-accent tracking-[0.18em] uppercase mb-6">
            A note from the maker
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-[36px] md:text-[48px] font-semibold leading-[1.05] tracking-display text-primary">
            Built for <span className="font-display italic text-accent font-normal">one.</span>
            <br />
            Refined for everyone.
          </motion.h2>
          <motion.p variants={fadeInUp} className="mt-7 text-[15px] md:text-[17px] leading-relaxed text-secondary">
            I made Personal OS because I had a lot on my plate — career, side work,
            studies, faith, family — and nothing on the market held all of it in one
            calm place. People started asking for access. So I&rsquo;m sharing it. Slowly.
          </motion.p>
          <motion.div variants={fadeInUp} className="mt-8">
            <Link
              href="/register"
              className="h-12 px-6 rounded-[10px] bg-primary text-page text-[15px] font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              Get early access <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>
    </AnimateOnScroll>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border py-10 px-5 md:px-10">
      <div className="max-w-[1240px] mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <LogoMark size={18} />
          <span className="text-[12.5px] text-secondary whitespace-nowrap">
            Personal OS &middot; Made by Razwan
          </span>
        </div>
        <div className="flex gap-5 text-[12.5px] text-tertiary">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
        </div>
      </div>
      <div className="max-w-[1240px] mx-auto mt-6 pt-6 border-t border-border text-center">
        <p className="text-[12.5px] text-tertiary">Website made by <a href="https://portfolio-project-tau-olive.vercel.app" target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-primary transition-colors">Razwanul Chowdhury</a></p>
      </div>
    </footer>
  );
}

// ─── Landing Page ────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-page text-primary overflow-x-hidden">
      <style>{`@keyframes blink { 50% { opacity: 0; } } .animate-blink { animation: blink 1s steps(2) infinite; }`}</style>

      <MarketingNav />
      <Hero />

      <FeatureSection
        id="features"
        eyebrow="Cmd+K &middot; the AI command bar"
        title="Type."
        accent="Don't think."
        body="Drop a thought in plain English. Personal OS extracts what matters — the day, the time, the project, the priority — and slots it into your week, your boards, your habits."
        kicker={`"Move my workout to Saturday and add reading at 9pm" — that's it.`}
      >
        <AIDemoBar />
      </FeatureSection>

      <FeatureSection
        eyebrow="Habits &amp; streaks"
        title="Small, repeated,"
        accent="visible."
        body="Group your habits by Faith, Body, Mind, Growth — whatever buckets fit your life. See your seven-day shape at a glance. Watch the months fill in."
        kicker="The chains of habit are too weak to be felt until they are too strong to be broken."
      >
        <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex items-baseline justify-between mb-5">
            <span className="font-mono text-[11px] text-tertiary tracking-[0.14em] uppercase">Last 126 days</span>
            <span className="text-[28px] font-semibold tracking-tight">
              14<span className="text-[13px] text-tertiary font-normal ml-1.5">day streak</span>
            </span>
          </div>
          <StreakGrid />
          <div className="mt-5 flex items-center justify-between text-[11.5px] text-tertiary">
            <span>Feb</span><span>Mar</span><span>Apr</span><span>May</span>
            <span className="inline-flex items-center gap-1.5">
              Less
              {[0, 1, 2, 3, 4].map(i => (
                <span
                  key={i}
                  className="w-2.5 h-2.5 rounded-[2px]"
                  style={{
                    background: i === 0
                      ? 'var(--color-surface-raised)'
                      : `color-mix(in oklab, var(--color-accent) ${30 + i * 15}%, var(--color-surface))`,
                    border: i === 0 ? '1px solid var(--color-border)' : 'none',
                  }}
                />
              ))}
              More
            </span>
          </div>
        </div>
      </FeatureSection>

      <Closer />
      <Footer />
    </div>
  );
}
