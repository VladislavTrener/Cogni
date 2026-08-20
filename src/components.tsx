/**
 * UI-кит: иконки, движение, примитивы, звук и конфетти.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useStore } from './store';

/* ================= иконки ================= */

export type IconProps = { className?: string };
const base = 'inline-block shrink-0';

export const IconLock = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={`${base} ${className}`}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    <circle cx="12" cy="15.2" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

export const IconCheck = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={`${base} ${className}`}>
    <path d="M4.5 12.5l5 5 10-11" />
  </svg>
);

export const IconPlay = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={`${base} ${className}`}>
    <path d="M8.5 6.2c0-.9 1-1.5 1.8-1L18 10.9c.8.5.8 1.7 0 2.2l-7.7 5.7c-.8.5-1.8-.1-1.8-1V6.2z" />
  </svg>
);

export const IconClock = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className={`${base} ${className}`}>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M12 7.5V12l3.2 2" />
  </svg>
);

export const IconArrowR = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className={`${base} ${className}`}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </svg>
);

export const IconClose = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" className={`${base} ${className}`}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconCoin = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`${base} ${className}`}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 7.2v9.6M9.2 9.4h3.4a2 2 0 0 1 0 4H9.2M9.2 15.6h4.6" />
  </svg>
);

export const IconCard = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={`${base} ${className}`}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.4" />
    <path d="M3.5 10h17M7 14.5h4" />
  </svg>
);

export const IconQr = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`${base} ${className}`}>
    <rect x="4" y="4" width="6.4" height="6.4" rx="1.2" />
    <rect x="13.6" y="4" width="6.4" height="6.4" rx="1.2" />
    <rect x="4" y="13.6" width="6.4" height="6.4" rx="1.2" />
    <path d="M13.6 13.6h2.7v2.7h-2.7zM20 13.6v.1M16.6 20h3.4v-3.4M13.6 20h.1" />
  </svg>
);

export const IconBook = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`${base} ${className}`}>
    <path d="M12 6.5c-1.6-1.4-3.9-2-7-2v13c3.1 0 5.4.6 7 2 1.6-1.4 3.9-2 7-2v-13c-3.1 0-5.4.6-7 2z" />
    <path d="M12 6.5v13" />
  </svg>
);

export const IconUser = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className={`${base} ${className}`}>
    <circle cx="12" cy="8.2" r="3.6" />
    <path d="M5 19.5c1.2-3.2 3.8-4.8 7-4.8s5.8 1.6 7 4.8" />
  </svg>
);

export const IconChalk = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`${base} ${className}`}>
    <rect x="3.5" y="4.5" width="17" height="11" rx="1.6" />
    <path d="M7 8.5h6M7 11.5h4M12 15.5l-2.5 4.5M12 15.5l2.5 4.5" />
  </svg>
);

export const IconShield = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={`${base} ${className}`}>
    <path d="M12 3.8l6.5 2.4v5.4c0 4-2.6 6.8-6.5 8.6-3.9-1.8-6.5-4.6-6.5-8.6V6.2L12 3.8z" />
    <path d="M9.3 12l2 2 3.6-4" />
  </svg>
);

export const IconSpark = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={`${base} ${className}`}>
    <path d="M12 2.8l2.1 6.2 6.2 2.1-6.2 2.1L12 19.4l-2.1-6.2-6.2-2.1 6.2-2.1L12 2.8z" />
  </svg>
);

export const IconFlame = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={`${base} ${className}`}>
    <path d="M12 3.5c.6 2.8 2.2 4.2 3.9 6 1.6 1.7 2.6 3.4 2.6 5.4a6.5 6.5 0 0 1-13 0c0-1.7.6-3.2 1.7-4.6.5 1 1.2 1.7 2.1 2.1-.3-2.9.8-6.4 2.7-8.9z" />
  </svg>
);

export const IconRefresh = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={`${base} ${className}`}>
    <path d="M4.5 12a7.5 7.5 0 0 1 13-5.2M19.5 12a7.5 7.5 0 0 1-13 5.2" />
    <path d="M17.5 3.5v3.6h-3.6M6.5 20.5v-3.6h3.6" />
  </svg>
);

export const IconTrash = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={`${base} ${className}`}>
    <path d="M4.5 6.5h15M9.5 6V4.5h5V6M6.5 6.5l.8 12.5a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12.5M10 10.5v6M14 10.5v6" />
  </svg>
);

export const IconKey = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={`${base} ${className}`}>
    <circle cx="8.5" cy="14.5" r="4.5" />
    <path d="M12 11.5L19.5 4M16.5 7l2.5 2.5M14 9.5l2 2" />
  </svg>
);

/* ================= движение ================= */

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return reduced;
}

export function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (el.classList.add('is-in'), io.disconnect())),
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

const GLYPHS = [
  { ch: '∑', x: '6%', y: '16%', s: '2.6rem', dur: '9s', del: '0s' },
  { ch: 'π', x: '84%', y: '12%', s: '2rem', dur: '7s', del: '0.8s' },
  { ch: '√', x: '72%', y: '68%', s: '2.4rem', dur: '10s', del: '0.3s' },
  { ch: '∞', x: '12%', y: '72%', s: '2.2rem', dur: '8s', del: '1.2s' },
  { ch: '÷', x: '42%', y: '8%', s: '1.8rem', dur: '7.5s', del: '0.5s' },
  { ch: '×', x: '92%', y: '44%', s: '1.7rem', dur: '8.5s', del: '1.6s' },
  { ch: '≈', x: '28%', y: '86%', s: '1.9rem', dur: '9.5s', del: '0.2s' },
  { ch: 'Δ', x: '58%', y: '82%', s: '2.1rem', dur: '7.8s', del: '1s' },
  { ch: '%', x: '4%', y: '44%', s: '1.6rem', dur: '8.2s', del: '0.7s' },
];

export function Glyphs({ className = 'text-pine-100/12' }: { className?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {GLYPHS.map((g, i) => (
        <span
          key={i}
          className={`glyph ${className}`}
          style={{ left: g.x, top: g.y, fontSize: g.s, ['--dur' as string]: g.dur, ['--del' as string]: g.del }}
        >
          {g.ch}
        </span>
      ))}
    </div>
  );
}

const SCRAMBLE_CHARS = 'АВЕЖЗИКМНПРСТУФХ+×÷=√∞π';

export function Scramble({ words, interval = 2600, className = '' }: { words: string[]; interval?: number; className?: string }) {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState(words[0]);

  useEffect(() => {
    const cycle = setInterval(() => setIdx((i) => (i + 1) % words.length), interval);
    return () => clearInterval(cycle);
  }, [interval, words.length]);

  useEffect(() => {
    const target = words[idx];
    if (reduced) {
      setText(target);
      return;
    }
    let step = 0;
    const total = Math.max(6, target.length * 2);
    const int = setInterval(() => {
      step++;
      const locked = Math.floor((step / total) * target.length);
      setText(
        target
          .split('')
          .map((ch, i) => (i < locked || ch === ' ' ? ch : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]))
          .join(''),
      );
      if (step >= total) {
        setText(target);
        clearInterval(int);
      }
    }, 42);
    return () => clearInterval(int);
  }, [idx, reduced, words]);

  return (
    <span className={className} aria-label={words[idx]}>
      {text}
    </span>
  );
}

export function CountUp({ value, format, className }: { value: number; format?: (n: number) => string; className?: string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  const prevRef = useRef(0);
  const fmt = format ?? ((n: number) => Math.round(n).toLocaleString('ru-RU'));

  useEffect(() => {
    if (reduced) {
      setShown(value);
      prevRef.current = value;
      return;
    }
    const from = prevRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (nowTs: number) => {
      const t = Math.min(1, (nowTs - start) / 750);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);

  return <span className={className}>{fmt(shown)}</span>;
}

/* ================= примитивы ================= */

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <svg viewBox="0 0 40 40" className="w-9 h-9 shrink-0" aria-hidden="true">
        <rect x="1.5" y="1.5" width="37" height="37" rx="10" fill="#112c22" stroke="#1e4534" strokeWidth="1.5" />
        <line x1="8" y1="13" x2="32" y2="13" stroke="#2b5c46" strokeWidth="1.6" />
        <line x1="8" y1="20.5" x2="32" y2="20.5" stroke="#2b5c46" strokeWidth="1.6" />
        <line x1="8" y1="28" x2="32" y2="28" stroke="#2b5c46" strokeWidth="1.6" />
        <circle cx="13" cy="13" r="3.1" fill="#ff8a3d" />
        <circle cx="23" cy="13" r="3.1" fill="#2fa8dc" />
        <circle cx="17" cy="20.5" r="3.1" fill="#1fa97a" />
        <circle cx="27" cy="28" r="3.1" fill="#e8a912" />
      </svg>
      {!compact && (
        <span className="font-display font-700 text-paper text-base tracking-[0.1em] leading-none pt-0.5">
          КОГНИТИВ<span className="text-mint">.ПРО</span>
        </span>
      )}
    </span>
  );
}

export function Modal({ onClose, children, width = 'max-w-xl', labelledBy }: { onClose: () => void; children: React.ReactNode; width?: string; labelledBy?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="absolute inset-0 bg-pine-950/75" onMouseDown={onClose} />
      <div className={`pop-in relative w-full ${width} max-h-[88vh] overflow-y-auto rounded-xl border border-line bg-card shadow-[0_30px_80px_-20px_rgba(8,23,17,0.55)]`}>
        {children}
      </div>
    </div>
  );
}

function ToastItem({ id, text, tone }: { id: number; text: string; tone: 'ok' | 'info' | 'warn' }) {
  const { dispatch } = useStore();
  useEffect(() => {
    const t = setTimeout(() => dispatch({ type: 'DISMISS_TOAST', id }), 3800);
    return () => clearTimeout(t);
  }, [dispatch, id]);
  const color = tone === 'ok' ? 'bg-mint' : tone === 'warn' ? 'bg-coral' : 'bg-sky';
  return (
    <div className="toast-in pointer-events-auto flex items-center gap-3 rounded-lg border border-pine-700 bg-pine-900 px-4 py-3 shadow-xl">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <p className="text-sm text-paper/95 max-w-[260px]">{text}</p>
      <button onClick={() => dispatch({ type: 'DISMISS_TOAST', id })} className="ml-2 text-pine-100/50 hover:text-paper transition-colors" aria-label="Закрыть">
        <IconClose className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function Toasts() {
  const { state } = useStore();
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex flex-col gap-2 items-end">
      {state.toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  );
}

export function Ring({ value, size = 68, stroke = 7, color = 'var(--color-mint)', label }: { value: number; size?: number; stroke?: number; color?: string; label?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, value)));
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(21,36,32,0.09)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22,0.9,0.3,1)' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold">{label}</span>
    </span>
  );
}

export function Bar({ value, color, className = 'h-2' }: { value: number; color: string; className?: string }) {
  return (
    <span className={`block w-full overflow-hidden rounded-full bg-ink/8 ${className}`}>
      <span
        className="block h-full rounded-full"
        style={{
          width: `${Math.min(100, Math.max(0, value * 100))}%`,
          background: color,
          transition: 'width 0.9s cubic-bezier(0.22,0.9,0.3,1)',
        }}
      />
    </span>
  );
}

export function Spark({ data, color, className = 'w-24 h-8' }: { data: number[]; color: string; className?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${26 - ((v - min) / span) * 22}`);
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={className} aria-hidden="true">
      <polygon points={`0,30 ${pts.join(' ')} 100,30`} fill={color} opacity="0.12" />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ================= звук и конфетти ================= */

export const isSoundOn = () => {
  try {
    return localStorage.getItem('kognitiv-sound') !== 'off';
  } catch {
    return true;
  }
};

export function setSound(on: boolean) {
  try {
    localStorage.setItem('kognitiv-sound', on ? 'on' : 'off');
  } catch {
    /* noop */
  }
}

type AC = AudioContext;
let ACX: AC | null = null;

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12, rampTo?: number) {
  if (!ACX) return;
  const t0 = ACX.currentTime + start;
  const o = ACX.createOscillator();
  const g = ACX.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (rampTo) o.frequency.exponentialRampToValueAtTime(rampTo, t0 + dur);
  o.connect(g);
  g.connect(ACX.destination);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export function beep(kind: 'ok' | 'no' | 'win' | 'unlock' | 'tone') {
  if (!isSoundOn()) return;
  try {
    ACX = ACX || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ACX.state === 'suspended') void ACX.resume();
    if (kind === 'ok') {
      tone(660, 0, 0.12);
      tone(880, 0.1, 0.16);
    } else if (kind === 'no') {
      tone(200, 0, 0.18, 'square', 0.07);
      tone(150, 0.14, 0.22, 'square', 0.07);
    } else if (kind === 'win') {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.18, 'triangle', 0.16));
    } else if (kind === 'unlock') {
      [392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.16, 'sine', 0.14));
    } else {
      tone(520, 0, 0.09, 'sine', 0.08);
    }
  } catch {
    /* noop */
  }
}

/** Тональный сигнал конкретной частоты (для «Запомни последовательность») */
export function beepFreq(freq: number, dur = 0.22) {
  if (!isSoundOn()) return;
  try {
    ACX = ACX || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ACX.state === 'suspended') void ACX.resume();
    tone(freq, 0, dur, 'sine', 0.14);
  } catch {
    /* noop */
  }
}

export function confettiBurst(colors = ['#e63946', '#f4a261', '#2a9d8f', '#4361ee', '#ffd166', '#ef476f', '#8ac926']) {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('i');
    p.className = 'confetti-bit';
    p.style.left = `${Math.random() * 100}vw`;
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--dx', `${Math.random() * 160 - 80}px`);
    p.style.animationDelay = `${Math.random() * 0.4}s`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 3400);
  }
}
