"use client";

import { useEffect } from "react";

function toggle() {
  const dark = document.documentElement.classList.toggle("dark");
  try {
    localStorage.theme = dark ? "dark" : "light";
  } catch {}
}

export function ThemeToggle() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "d" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <kbd className="rounded border border-neutral-200 px-1.5 py-0.5 font-sans text-[10px] leading-none text-neutral-400 dark:border-neutral-800 dark:text-neutral-600">
        D
      </kbd>
      <button
        type="button"
        onClick={toggle}
        aria-label="Toggle theme"
        className="flex h-5 w-9 flex-none cursor-pointer items-center rounded-full border border-neutral-200/80 bg-neutral-100 p-0.5 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/80 dark:hover:border-neutral-700"
      >
        <span className="size-3.5 rounded-full bg-neutral-400 transition-transform dark:translate-x-4 dark:bg-neutral-500" />
      </button>
    </div>
  );
}
