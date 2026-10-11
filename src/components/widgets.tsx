"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LuPause, LuPlay } from "react-icons/lu";
import { FaApple } from "react-icons/fa6";

export type Track = {
  name: string;
  artist: string;
  art: string;
  preview: string;
  url: string;
};

// TODO: swap in real numbers
const RUN = { km: 5.2, pace: "5'12\"" };
const LIFT = { name: "Bench", plates: [25, 15] }; // kg per side, on a 20 kg bar

const card =
  "rounded-2xl border border-neutral-200 bg-neutral-50/80 backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-neutral-900/95";
export const label =
  "text-xs font-medium tracking-wider text-neutral-500 uppercase dark:text-neutral-400";

export function MusicCard({ track }: { track: Track }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const a = audio.current!;
    if (a.paused) a.play();
    else a.pause();
  };

  return (
    <div
      className={`${card} relative col-span-2 flex items-center gap-5 p-4 sm:h-[calc((100cqw-3rem)/4)]`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={track.art}
        alt={`${track.name} cover art`}
        className="aspect-square w-2/5 shrink-0 rounded-xl object-cover shadow-md shadow-black/20 sm:h-full sm:w-auto"
      />
      <div className="flex min-w-0 flex-1 flex-col self-end">
        <span className={label}>Recently played</span>
        <a
          href={track.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 truncate text-base font-semibold tracking-tight text-black hover:underline dark:text-white"
        >
          {track.name}
        </a>
        <span className="truncate text-sm text-neutral-600 dark:text-neutral-400">
          {track.artist}
        </span>
        <button
          type="button"
          onClick={toggle}
          className="mt-2.5 flex w-fit cursor-pointer items-center gap-2 rounded-full bg-neutral-700 px-3.5 py-1 text-sm font-medium text-white transition-transform active:scale-95 dark:bg-white/10"
        >
          {playing ? (
            <LuPause className="size-4" />
          ) : (
            <LuPlay className="size-4" />
          )}
          {playing ? "Pause" : "Play"}
        </button>
        <audio
          ref={audio}
          src={track.preview}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      </div>
      <FaApple className="absolute top-4 right-4 size-4 text-neutral-500 dark:text-neutral-400" />
    </div>
  );
}

type Tip = { x: number; y: number; title: string; sub: string };

// Square card whose picture fills it edge to edge. Anything inside with
// data-tip / data-tip-sub gets a small tooltip that follows the cursor
// (on touch: shown for a moment where you tapped).
export function Tile({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = (e: React.PointerEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-tip]");
    setTip(el ? { x: e.clientX, y: e.clientY, title: el.dataset.tip!, sub: el.dataset.tipSub ?? "" } : null);
    clearTimeout(hide.current);
    if (e.pointerType === "touch") hide.current = setTimeout(() => setTip(null), 2000);
  };

  return (
    <div
      onPointerMove={(e) => e.pointerType === "mouse" && show(e)}
      onPointerDown={show}
      onPointerLeave={(e) => e.pointerType === "mouse" && setTip(null)}
      className={`${card} group relative aspect-square w-full overflow-hidden`}
    >
      {children}
      {tip &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-50 rounded-lg border border-white/10 bg-neutral-900/95 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-xl backdrop-blur"
            // Sits below-right of the cursor; flips left near the screen edge
            style={{ left: tip.x + 14, top: tip.y + 16, translate: tip.x > innerWidth - 220 ? "calc(-100% - 28px) 0" : undefined }}
          >
            <div className="font-medium">{tip.title}</div>
            {tip.sub && <div className="text-neutral-400">{tip.sub}</div>}
          </div>,
          document.body,
        )}
    </div>
  );
}

// Carousel: slides move left one at a time. A copy of the first slide sits at
// the end, so the loop always moves forward: after reaching the copy it snaps
// back to the real first slide (no transition) and carries on.
export function Carousel({ slides, every, delay = 0 }: { slides: ReactNode[]; every: number; delay?: number }) {
  const [{ pos, animate }, setState] = useState({ pos: 0, animate: true });
  const posRef = useRef(0);

  useEffect(() => {
    const advance = () => setState({ pos: ++posRef.current, animate: true });
    const tick = () => {
      if (posRef.current < slides.length) return advance();
      posRef.current = 0;
      setState({ pos: 0, animate: false });
      requestAnimationFrame(() => requestAnimationFrame(advance));
    };
    let id: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      tick();
      id = setInterval(tick, every);
    }, every + delay);
    return () => {
      clearTimeout(start);
      clearInterval(id);
    };
  }, [slides.length, every, delay]);

  return (
    <div
      className={`flex size-full ${animate ? "transition-transform duration-700 ease-[cubic-bezier(.65,0,.35,1)] motion-reduce:transition-none" : ""}`}
      style={{ transform: `translateX(-${pos * 100}%)` }}
    >
      {[...slides, slides[0]].map((slide, i) => (
        <div key={i} aria-hidden={i % slides.length !== pos % slides.length} className="size-full shrink-0">
          {slide}
        </div>
      ))}
    </div>
  );
}

export const SWITCH_MS = 6000;

export function ActivityCard() {
  return (
    <Tile>
      <Carousel slides={[<LiftView key="lift" />, <RunView key="run" />]} every={SWITCH_MS} />
    </Tile>
  );
}

const plateH = (kg: number) => 20 + kg * 0.8;
const liftKg = 20 + 2 * LIFT.plates.reduce((a, b) => a + b, 0);

// Tooltips are just the stat, one line.
function LiftView() {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={`${LIFT.name} PR: ${liftKg} kg`} data-tip={`${liftKg} kg ${LIFT.name.toLowerCase()}`} className="size-full p-3">
      <line x1="3" y1="50" x2="97" y2="50" strokeWidth="2.5" strokeLinecap="round" className="stroke-neutral-400 dark:stroke-neutral-500" />
      <rect x="29" y="45" width="3" height="10" rx="1" className="fill-neutral-500" />
      <rect x="68" y="45" width="3" height="10" rx="1" className="fill-neutral-500" />
      {LIFT.plates.map((plate, p) =>
        [-1, 1].map((side) => (
          <rect
            key={`${p}${side}`}
            x={side < 0 ? 22 - p * 7 : 73 + p * 7}
            y={50 - plateH(plate) / 2}
            width="5"
            height={plateH(plate)}
            rx="1.5"
            className={p === 0 ? "fill-neutral-900 dark:fill-neutral-100" : "fill-neutral-600 dark:fill-neutral-400"}
          />
        )),
      )}
    </svg>
  );
}

const ROUTE = "M14 73 C16 55 26 45 38 49 C50 53 48 69 60 67 C72 65 70 45 86 35";

function RunView() {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={`Running: ${RUN.km} km at ${RUN.pace} per km`} data-tip={`${RUN.km.toFixed(1)} km · ${RUN.pace} /km`} className="size-full" fill="none">
      <defs>
        <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.6" className="fill-neutral-300 dark:fill-neutral-700" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#dots)" />
      <path d={ROUTE} strokeWidth="5" strokeLinecap="round" className="stroke-black/10 dark:stroke-white/10" />
      <path d={ROUTE} strokeWidth="2.5" strokeLinecap="round" className="stroke-neutral-800 dark:stroke-neutral-300" />
      <circle cx="14" cy="73" r="2.5" strokeWidth="1.5" className="fill-neutral-50 stroke-neutral-800 dark:fill-neutral-900 dark:stroke-neutral-300" />
      <circle cx="86" cy="35" r="3" strokeWidth="1.5" className="fill-black stroke-neutral-50 dark:fill-white dark:stroke-neutral-900" />
    </svg>
  );
}
