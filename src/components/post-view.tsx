import Link from "next/link";
import type { ReactNode } from "react";
import { CopyLink, SectionPill } from "@/components/post-ui";
import { formatDate, tagClass, type Frontmatter } from "@/lib/writing-meta";

// Post body typography. Shared with the admin editor so writing looks like reading.
export const PROSE =
  "prose prose-neutral max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-headings:font-serif prose-headings:font-normal prose-h2:text-3xl prose-h3:text-2xl prose-p:leading-relaxed prose-a:underline-offset-4 prose-blockquote:border-l-2 prose-blockquote:border-neutral-400 prose-blockquote:font-normal prose-blockquote:text-neutral-600 dark:prose-blockquote:text-neutral-400 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-pre:border prose-pre:border-neutral-200 prose-pre:bg-neutral-50 dark:prose-pre:border-white/10 dark:prose-pre:bg-neutral-900 [&_.footnotes]:mt-14 [&_.footnotes]:border-t [&_.footnotes]:border-neutral-200 [&_.footnotes]:pt-6 [&_.footnotes]:text-sm dark:[&_.footnotes]:border-white/10";

// The post as readers see it. Used by the real post page and by the admin
// preview, so what the editor shows is exactly what gets published.
export function PostView({ f, minutes, children }: { f: Frontmatter; minutes: number; children: ReactNode }) {
  return (
    <>
      <header>
        {f.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.cover} alt="" className="mb-10 aspect-[1200/630] w-full rounded-2xl border border-neutral-200 object-cover dark:border-white/10" />
        )}
        <span className="text-xs font-medium tracking-wider text-neutral-500 uppercase">{f.category}</span>
        <h1 className="mt-2 font-serif text-4xl leading-[1.1] text-balance md:text-5xl">{f.title}</h1>
        {f.subtitle && <p className="mt-3 text-lg text-neutral-600 dark:text-neutral-400">{f.subtitle}</p>}
        <div className="mt-6 flex items-center justify-between border-b border-neutral-200 pb-6 dark:border-white/10">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <time dateTime={f.date}>{formatDate(f.date)}</time>
            <span aria-hidden>·</span>
            <span>{minutes} min read</span>
          </div>
          <CopyLink />
        </div>
      </header>

      <article className={`${PROSE} mt-10`}>
        {children}
      </article>

      <footer className="mt-16 flex items-center justify-between border-t border-neutral-200 pt-6 text-sm dark:border-white/10">
        <Link href="/writing" className="text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100">
          ← All writing
        </Link>
        <div className="flex flex-wrap justify-end gap-1.5">
          {f.tags.map((t) => (
            <Link key={t} href={`/writing?tab=${f.category}&tag=${t}`} className={tagClass}>
              {t}
            </Link>
          ))}
        </div>
      </footer>

      <SectionPill />
    </>
  );
}
