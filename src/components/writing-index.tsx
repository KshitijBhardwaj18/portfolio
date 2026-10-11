"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import {
  CATEGORIES,
  tagClass,
  type Category,
  type PostMeta,
} from "@/lib/writing-meta";

// Tab + tag filters, kept in the URL (?tab=biology&tag=memory) so a filtered view can be shared.
export function WritingIndex({
  posts,
  rows,
}: {
  posts: PostMeta[];
  rows: Record<string, ReactNode>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const tab = (CATEGORIES as readonly string[]).includes(
    params.get("tab") ?? "",
  )
    ? (params.get("tab") as Category)
    : CATEGORIES[0];
  const tag = params.get("tag");

  const go = (next: { tab: Category; tag?: string | null }) => {
    const q = new URLSearchParams({ tab: next.tab });
    if (next.tag) q.set("tag", next.tag);
    router.replace(`?${q}`, { scroll: false });
  };

  const inTab = posts.filter((p) => p.category === tab);
  const tagCounts = new Map<string, number>();
  for (const p of inTab)
    for (const t of p.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const shown = tag ? inTab.filter((p) => p.tags.includes(tag)) : inTab;

  return (
    <>
      {/* Tabs on the left, the open tab's tags on the right, centred on one line */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 p-1 dark:border-white/10 dark:bg-neutral-900"
        >
          {CATEGORIES.map((c) => {
            const count = posts.filter((p) => p.category === c).length;
            const active = c === tab;
            return (
              <button
                key={c}
                role="tab"
                aria-selected={active}
                onClick={() => go({ tab: c })}
                className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-1.5 text-sm capitalize transition-colors ${
                  active
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                }`}
              >
                {c}
                <span
                  className={`text-xs tabular-nums ${active ? "opacity-60" : "text-neutral-400 dark:text-neutral-600"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {tagCounts.size > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {[...tagCounts].map(([t, n]) => {
              const active = t === tag;
              return (
                <button
                  key={t}
                  onClick={() => go({ tab, tag: active ? null : t })}
                  aria-pressed={active}
                  title={`${n} post${n > 1 ? "s" : ""}`}
                  className={`cursor-pointer ${active ? "rounded-md bg-neutral-900 px-2 py-0.5 text-xs text-white dark:bg-white dark:text-black" : tagClass}`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6">
        {shown.length ? (
          shown.map((p) => <div key={p.slug}>{rows[p.slug]}</div>)
        ) : (
          <p className="py-10 text-center text-sm text-neutral-500">
            Nothing in {tab} yet.
          </p>
        )}
      </div>
    </>
  );
}
