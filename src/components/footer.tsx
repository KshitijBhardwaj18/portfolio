"use client";

import { useEffect, useRef } from "react";
import { SIGNATURE_PATHS, SIGNATURE_VIEWBOX } from "./signature-paths";

// One loop, in seconds: letters are signed one after another, the signature
// holds, fades, and is signed again.
const CYCLE = 18; // signed in ~2.5s, then stays up ~14s before it fades and re-signs
const STAGGER = 0.14; // gap between letters starting
const TRACE = 0.55; // how long the pen takes on one letter
const INK = 0.3; // fill catches up behind the pen
const FADE_AT = 17;
const FADE_LEN = 0.6;

const f = (t: number) => (t / CYCLE).toFixed(4);

// Signature that signs itself: a thin pen line traces each letter in order and
// the ink fills in just behind it, like the name being written by hand.
export function Footer() {
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = svg.current!;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.pauseAnimations();
      el.setCurrentTime(FADE_AT - 0.1); // fully signed
      return;
    }
    el.pauseAnimations();
    el.setCurrentTime(0);
    // Start signing the first time the footer comes into view.
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      el.setCurrentTime(0);
      el.unpauseAnimations();
      io.disconnect();
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const loop = { dur: `${CYCLE}s`, repeatCount: "indefinite" };

  return (
    <footer className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-5 pt-8 pb-12 sm:px-8 md:px-10">
      <svg
        ref={svg}
        viewBox={SIGNATURE_VIEWBOX}
        role="img"
        aria-label="Kshitij Bhardwaj's signature"
        className="w-44 text-neutral-800 dark:text-neutral-200"
      >
        <g fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <animate attributeName="opacity" values="1;1;0;0" keyTimes={`0;${f(FADE_AT)};${f(FADE_AT + FADE_LEN)};1`} {...loop} />
          {SIGNATURE_PATHS.map((d, i) => {
            const start = i * STAGGER;
            const traced = start + TRACE;
            const inked = traced + INK;
            return (
              <path key={i} d={d} pathLength={1} strokeDasharray="1" strokeDashoffset="1" fillOpacity="0">
                <animate
                  attributeName="stroke-dashoffset"
                  values="1;1;0;0"
                  keyTimes={`0;${f(start)};${f(traced)};1`}
                  calcMode="spline"
                  keySplines="0 0 1 1;.45 0 .55 1;0 0 1 1"
                  {...loop}
                />
                <animate
                  attributeName="fill-opacity"
                  values="0;0;1;1"
                  keyTimes={`0;${f(start + TRACE * 0.6)};${f(inked)};1`}
                  {...loop}
                />
              </path>
            );
          })}
        </g>
      </svg>
      <p className="text-xs text-neutral-400 dark:text-neutral-600">© {new Date().getFullYear()} Kshitij Bhardwaj</p>
    </footer>
  );
}
