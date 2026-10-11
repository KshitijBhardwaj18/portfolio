"use client";

import { useEffect, useState } from "react";
import { LuCheck, LuLink } from "react-icons/lu";

export function CopyLink() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="flex cursor-pointer items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-white/10 dark:text-neutral-400 dark:hover:bg-white/5"
    >
      {copied ? <LuCheck className="size-3.5" /> : <LuLink className="size-3.5" />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

type Heading = { id: string; text: string };

// Floating pill at the bottom: the section you're in, a ring that fills as you read,
// and (on click) the list of sections to jump between.
export function SectionPill() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const article = document.querySelector("article")!;
    // sr-only skips the hidden "Footnotes" heading markdown adds
    const els = [...article.querySelectorAll<HTMLElement>("h2[id]:not(.sr-only)")];
    let raf = 0;
    const update = () => {
      const top = article.getBoundingClientRect().top + scrollY;
      const span = article.offsetHeight - innerHeight;
      setProgress(Math.min(1, Math.max(0, (scrollY - top) / span)));
      setVisible(scrollY > top - 80);
      let i = 0;
      els.forEach((h, n) => h.getBoundingClientRect().top < innerHeight * 0.3 && (i = n));
      setCurrent(i);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(() => {
      setHeadings(els.map((h) => ({ id: h.id, text: h.textContent ?? "" })));
      update();
    });
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!headings.length) return null;
  const R = 7;
  const C = 2 * Math.PI * R;

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-40 -translate-x-1/2 transition-[opacity,translate] duration-300 ${visible ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
    >
      {open && (
        <ol className="absolute bottom-full left-1/2 mb-2 w-64 -translate-x-1/2 rounded-2xl border border-white/10 bg-neutral-900/95 p-1.5 text-sm text-neutral-300 shadow-2xl backdrop-blur-xl">
          {headings.map((h, i) => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                onClick={() => setOpen(false)}
                className={`block truncate rounded-xl px-3 py-1.5 transition-colors hover:bg-white/10 ${i === current ? "text-white" : ""}`}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ol>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Sections"
        className="flex cursor-pointer items-center gap-3 rounded-full border border-white/10 bg-neutral-900/95 py-2 pr-2 pl-4 text-sm text-white shadow-2xl shadow-black/30 backdrop-blur-xl"
      >
        <span className="size-1.5 rounded-full bg-white" />
        <span className="max-w-48 truncate">{headings[current]?.text}</span>
        <svg viewBox="0 0 20 20" className="size-5 -rotate-90">
          <circle cx="10" cy="10" r={R} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
          <circle
            cx="10"
            cy="10"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
          />
        </svg>
      </button>
    </div>
  );
}
