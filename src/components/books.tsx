"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { LuX } from "react-icons/lu";

// Covers come from Open Library (covers.openlibrary.org/b/id/<cover>-L.jpg).
// Find a cover id, page count and year with:
// openlibrary.org/search.json?title=...&fields=title,cover_i,number_of_pages_median,first_publish_year
// TODO: `why` is placeholder copy, rewrite it in your own words.
const BOOKS = [
  {
    title: "Sapiens",
    subtitle: "A Brief History of Humankind",
    author: "Yuval Noah Harari",
    cover: 15247651,
    pages: 456,
    year: 2011,
    synopsis:
      "How a forgettable ape took over the planet: the cognitive, agricultural and scientific revolutions, and the shared stories (money, nations, religion) that let millions of strangers cooperate.",
    why: "It zooms out far enough that everyday things like money and laws start to look strange. Good fuel for thinking about why people believe what they believe.",
  },
  {
    title: "Memory",
    subtitle: "From Mind to Molecules",
    author: "Larry Squire & Eric Kandel",
    cover: 581129,
    pages: 245,
    year: 2000,
    synopsis:
      "A Nobel laureate and a leading memory researcher trace how memories form, from the psychology of remembering down to the synapses and molecules that store them.",
    why: "I wanted to understand what is actually happening in the brain when something sticks, not just tips on how to remember more.",
  },
  {
    title: "Neuroscience",
    subtitle: "Exploring the Brain",
    author: "Bear, Connors & Paradiso",
    cover: 8761084,
    pages: 928,
    year: 2006,
    synopsis:
      "The classic textbook on how the nervous system works: neurons and synapses, the senses, movement, and on up to sleep, emotion, language and memory.",
    why: "The foundation for everything else I'm reading. Dense, but the diagrams make even the hard chapters click.",
  },
  {
    title: "A Philosophy of Software Design",
    subtitle: "",
    author: "John Ousterhout",
    cover: 10352230,
    pages: 193,
    year: 2018,
    synopsis:
      "A short, opinionated book about the one thing that makes software hard to change: complexity. Deep modules, information hiding, and why tactical programming slowly wears a codebase down.",
    why: "It gave me words for things I only felt before, like why some code is a joy to change and some is a minefield.",
  },
  {
    title: "Designing Data-Intensive Applications",
    subtitle: "The Big Ideas Behind Reliable, Scalable, and Maintainable Systems",
    author: "Martin Kleppmann",
    cover: 8434671,
    pages: 618,
    year: 2017,
    synopsis:
      "How real data systems work under the hood: storage engines, replication, partitioning, transactions and streams, and the trade-offs behind every database you've used.",
    why: "Memory for agents is ultimately a data problem. This is the book on storing, moving and keeping data consistent.",
  },
];
type Book = (typeof BOOKS)[number];

const coverUrl = (b: Book) => `https://covers.openlibrary.org/b/id/${b.cover}-L.jpg`;

// --- shelf: books stand turned slightly and tilt toward the cursor -------------
const REST = { "--ry": "-15deg", "--rx": "8deg", "--s": "1", "--mx": "50%", "--my": "50%" };
const SPRING = "transform 0.5s cubic-bezier(.175,.885,.32,1.275)";
const SNAPPY = "transform 0.1s ease-out";

function setVars(el: HTMLElement, vars: Record<string, string>, transition?: string) {
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
  if (transition !== undefined) el.style.transition = transition;
}

function tilt(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  setVars(
    e.currentTarget,
    { "--ry": `${(x - 0.5) * 30}deg`, "--rx": `${(0.5 - y) * 30}deg`, "--s": "1.05", "--mx": `${x * 100}%`, "--my": `${y * 100}%` },
    SNAPPY,
  );
}

// --- open book: geometry for the fly-out ---------------------------------------
const OPEN_MS = 1000;
const EASE = "cubic-bezier(.25,1,.5,1)";
type Geometry = { w: number; h: number; from: string; to: string };

// The open spread is two pages side by side. Closed, the right half sits exactly
// over the shelf thumbnail (same position, size and tilt); open, it's centred.
function geometry(thumb: DOMRect, rx: number, ry: number): Geometry {
  const w = Math.min(760, innerWidth * 0.95);
  const h = Math.min(520, innerHeight * 0.85, w * (innerWidth < 640 ? 1.1 : 0.7)); // taller on phones
  const sx = thumb.width / (w / 2);
  const sy = thumb.height / h;
  return {
    w,
    h,
    from: `translate(${thumb.left - (w / 2) * sx}px, ${thumb.top}px) scale(${sx}, ${sy}) rotateX(${rx}deg) rotateY(${ry}deg)`,
    to: `translate(${(innerWidth - w) / 2}px, ${(innerHeight - h) / 2}px) scale(1)`,
  };
}

// Cream paper, darker toward the spine. The inside-left page has its spine on the right.
const paper = "bg-[linear-gradient(to_right,#dcdbcf_0%,#edede4_4%,#fcfbf8_12%,#fcfbf8_100%)] text-neutral-900";
const paperLeft = "bg-[linear-gradient(to_left,#dcdbcf_0%,#edede4_4%,#fcfbf8_12%,#fcfbf8_100%)] text-neutral-900";
const eyebrow = "text-[10px] font-medium tracking-[0.12em] text-neutral-500 uppercase";

export function Books() {
  const thumbs = useRef<(HTMLDivElement | null)[]>([]);
  const [open, setOpen] = useState<{ i: number; geo: Geometry } | null>(null);
  const [active, setActive] = useState(false);

  const openBook = (i: number) => {
    const el = thumbs.current[i]!;
    const cs = getComputedStyle(el);
    const rx = parseFloat(cs.getPropertyValue("--rx")) || 8;
    const ry = parseFloat(cs.getPropertyValue("--ry")) || -15;
    // Measure the cover flat, so the open book starts from its true rectangle.
    setVars(el, { "--rx": "0deg", "--ry": "0deg", "--s": "1" }, "none");
    const rect = el.getBoundingClientRect();
    setOpen({ i, geo: geometry(rect, rx, ry) });
    requestAnimationFrame(() => requestAnimationFrame(() => setActive(true)));
  };

  const close = () => {
    if (!open) return;
    // Recompute the landing spot in case the page scrolled or resized.
    setOpen({ ...open, geo: geometry(thumbs.current[open.i]!.getBoundingClientRect(), 8, -15) });
    setActive(false);
  };

  // Once the close animation lands, put the shelf copy back in its resting pose.
  useEffect(() => {
    if (!open || active) return;
    const t = setTimeout(() => {
      setVars(thumbs.current[open.i]!, REST, "none");
      setOpen(null);
    }, OPEN_MS);
    return () => clearTimeout(t);
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    document.body.style.setProperty("overflow", "hidden");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    addEventListener("keydown", onKey);
    return () => {
      document.body.style.removeProperty("overflow");
      removeEventListener("keydown", onKey);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- `close` only reads `open`

  return (
    <section>
      <h2 className="text-xs font-medium tracking-wider text-neutral-500 uppercase dark:text-neutral-400">Reading</h2>
      <p className="mt-1 text-base text-neutral-600 dark:text-neutral-400">What&apos;s on my desk right now. Pick one up.</p>

      <div className="mt-6 grid max-w-2xl grid-cols-3 gap-6 [perspective:1500px] sm:grid-cols-5 sm:gap-8">
        {BOOKS.map((b, i) => (
          <button
            key={b.cover}
            type="button"
            onClick={() => openBook(i)}
            aria-label={`Open ${b.title} by ${b.author}`}
            className="group cursor-pointer rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-4 focus-visible:ring-offset-background"
            style={{ opacity: open?.i === i ? 0 : 1 }}
          >
            <div
              ref={(el) => {
                thumbs.current[i] = el;
              }}
              onPointerMove={tilt}
              onPointerEnter={(e) => (e.currentTarget.style.transition = SNAPPY)}
              onPointerLeave={(e) => setVars(e.currentTarget, REST, SPRING)}
              style={{ ...REST, transition: SPRING } as CSSProperties}
              className="relative aspect-[2/3] rounded-[2px_6px_6px_2px] shadow-[3px_10px_20px_rgba(0,0,0,0.25)] [transform:scale(var(--s))_rotateY(var(--ry))_rotateX(var(--rx))] [transform-style:preserve-3d] dark:shadow-[1px_0_1px_rgba(255,255,255,0.15),3px_10px_20px_rgba(0,0,0,0.5)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl(b)}
                alt=""
                className="absolute inset-0 size-full rounded-[inherit] bg-neutral-200 object-cover dark:bg-neutral-800"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 w-[15%] rounded-l-[2px] bg-[linear-gradient(to_right,rgba(0,0,0,0.2)_0%,rgba(255,255,255,0.25)_15%,rgba(0,0,0,0.15)_35%,transparent_100%)]" />
              <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_var(--mx)_var(--my),rgba(255,255,255,0.2)_0%,transparent_60%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>
            <div className="mt-4 leading-tight">
              <div className="text-sm font-medium tracking-tight text-black dark:text-white">{b.title}</div>
              <div className="mt-0.5 text-xs text-neutral-500">{b.author}</div>
            </div>
          </button>
        ))}
      </div>

      {open && createPortal(<OpenBook book={BOOKS[open.i]} geo={open.geo} active={active} onClose={close} />, document.body)}
    </section>
  );
}

function OpenBook({ book, geo, active, onClose }: { book: Book; geo: Geometry; active: boolean; onClose: () => void }) {
  const t = (p: string) => `${p} ${OPEN_MS}ms ${EASE}`;
  return (
    <div
      role="dialog"
      aria-modal
      aria-label={`${book.title} by ${book.author}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={`fixed inset-0 z-50 [perspective:2500px] ${active ? "bg-black/85 backdrop-blur-sm" : "bg-black/0 backdrop-blur-none"}`}
      style={{ transition: "background-color 1s ease-out, backdrop-filter 1s ease-out" }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left [transform-style:preserve-3d]"
        style={{ width: geo.w, height: geo.h, transform: active ? geo.to : geo.from, transition: t("transform") }}
      >
        {/* Right page: title and notes. Sits under the cover until it swings open. */}
        <div className={`absolute inset-y-0 left-1/2 w-1/2 overflow-y-auto rounded-r-xl p-5 shadow-[10px_10px_40px_rgba(0,0,0,0.3)] sm:p-8 ${paper}`}>
          <h3 className="font-serif text-2xl leading-none sm:text-4xl">{book.title}</h3>
          {book.subtitle && <p className="mt-1 font-serif text-base text-neutral-500 italic sm:text-lg">{book.subtitle}</p>}
          <p className={`${eyebrow} mt-2`}>{book.author}</p>
          <Section title="Synopsis">{book.synopsis}</Section>
          <Section title="Why I'm reading it">{book.why}</Section>
        </div>

        {/* Left page: front cover outside, details inside. Hinged on the spine. */}
        <div
          className="absolute inset-y-0 left-1/2 w-1/2 origin-left [transform-style:preserve-3d]"
          style={{ transform: active ? "rotateY(-180deg)" : "rotateY(0deg)", transition: t("transform") }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl(book)}
            alt=""
            className="absolute inset-0 size-full rounded-r-xl object-cover shadow-[10px_10px_40px_rgba(0,0,0,0.3)] [backface-visibility:hidden]"
          />
          <div
            className={`absolute inset-0 flex [transform:rotateY(180deg)] flex-col items-center justify-center gap-6 rounded-l-xl p-5 [backface-visibility:hidden] sm:p-8 ${paperLeft}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl(book)} alt="" className="aspect-[2/3] w-2/5 max-w-[200px] rounded-sm object-cover shadow-[0_15px_35px_rgba(0,0,0,0.2)]" />
            <div className="flex gap-8">
              <Meta label="Pages" value={book.pages} />
              <Meta label="Published" value={book.year} />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className={`fixed top-5 right-5 grid size-9 cursor-pointer place-items-center rounded-full bg-white/10 text-white transition-opacity duration-500 hover:bg-white/20 ${active ? "opacity-100" : "opacity-0"}`}
      >
        <LuX className="size-4" />
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <div className="mt-5 sm:mt-7">
      <h4 className={`${eyebrow} border-b border-black/5 pb-1.5 text-neutral-400`}>{title}</h4>
      <p className="mt-2 font-serif text-sm leading-relaxed text-neutral-700 sm:text-base">{children}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] tracking-[0.1em] text-neutral-500 uppercase">{label}</span>
      <strong className="font-serif text-xl font-normal text-neutral-800">{value}</strong>
    </div>
  );
}
