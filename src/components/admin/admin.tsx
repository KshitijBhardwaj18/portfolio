"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from "react";
import { LuImagePlus, LuMonitor, LuPlus, LuSlidersHorizontal, LuSmartphone, LuTrash2, LuX } from "react-icons/lu";
import { Editor } from "@/components/admin/editor";
import { Preview } from "@/components/admin/preview";
import { PostRow } from "@/components/post-row";
import { ThemeToggle } from "@/components/theme-toggle";
import { api, emptyDraft, parsePost, serializePost, slugify, type Draft } from "@/lib/admin";
import { CATEGORIES, readingMinutes, tagClass, type Category } from "@/lib/writing-meta";

type Post = Draft & { slug: string };

// /admin           list of posts
// /admin?edit=slug edit a post
// /admin?edit=new  new post
export function Admin() {
  const params = useSearchParams();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(
    () =>
      api
        .list()
        .then(({ posts }) => setPosts(posts.map((p) => ({ ...parsePost(p.source), slug: p.slug })).sort((a, b) => b.date.localeCompare(a.date))))
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  const edit = params.get("edit");
  const go = (q: string) => router.push(`/admin${q}`);

  if (error) return <Shell><p className="text-sm text-red-500">Couldn&apos;t reach the admin API: {error}</p></Shell>;
  if (!posts) return <Shell><p className="text-sm text-neutral-500">Loading…</p></Shell>;
  if (edit)
    return (
      <PostEditor
        key={edit}
        slug={edit === "new" ? null : edit}
        allPosts={posts}
        onExit={() => {
          load();
          go("");
        }}
        onCreated={(slug) => {
          load();
          router.replace(`/admin?edit=${slug}`);
        }}
      />
    );
  return <PostList posts={posts} onOpen={(slug) => go(`?edit=${slug}`)} onNew={() => go("?edit=new")} />;
}

function Shell({ children, bar }: { children: ReactNode; bar?: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0b0b0b]/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-5">
          <Link href="/admin" className="font-serif text-xl">
            Admin
          </Link>
          <div className="flex flex-1 items-center justify-end gap-2">{bar}</div>
          <ThemeToggle />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-5 py-8">{children}</div>
    </div>
  );
}

// --- list -------------------------------------------------------------------
function PostList({ posts, onOpen, onNew }: { posts: Post[]; onOpen: (slug: string) => void; onNew: () => void }) {
  const [cat, setCat] = useState<Category | "all">("all");
  const [status, setStatus] = useState<"all" | "draft" | "published">("all");
  const [tag, setTag] = useState<string | null>(null);

  const shown = posts.filter(
    (p) => (cat === "all" || p.category === cat) && (status === "all" || (status === "draft") === !!p.draft) && (!tag || p.tags.includes(tag)),
  );
  const tags = countTags(posts.filter((p) => cat === "all" || p.category === cat));

  return (
    <Shell
      bar={
        <>
          <Link href="/writing" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
            View site
          </Link>
          <button onClick={onNew} className={primaryBtn}>
            <LuPlus /> New post
          </button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <Segmented value={cat} options={["all", ...CATEGORIES]} onChange={(v) => (setCat(v), setTag(null))} />
        <Segmented value={status} options={["all", "draft", "published"]} onChange={setStatus} />
      </div>
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map(([t]) => (
            <button key={t} onClick={() => setTag(tag === t ? null : t)} className={`cursor-pointer ${tag === t ? activeChip : tagClass}`}>
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 divide-y divide-neutral-200 dark:divide-white/10">
        {shown.map((p) => (
          <button key={p.slug} onClick={() => onOpen(p.slug)} className="flex w-full cursor-pointer items-center gap-4 py-3.5 text-left">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{p.title || "Untitled"}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase ${p.draft ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600"}`}>
                  {p.draft ? "Draft" : "Live"}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                <span className="capitalize">{p.category}</span>·<span>{p.date}</span>·<span>{readingMinutes(p.body)} min</span>
                {p.tags.map((t) => (
                  <span key={t} className={tagClass}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
        {!shown.length && <p className="py-12 text-center text-sm text-neutral-500">No posts here yet.</p>}
      </div>
    </Shell>
  );
}

// --- editor screen ------------------------------------------------------------
type Mode = "write" | "split" | "preview";

function PostEditor({ slug, allPosts, onExit, onCreated }: { slug: string | null; allPosts: Post[]; onExit: () => void; onCreated: (slug: string) => void }) {
  const isNew = slug === null;
  const [draft, setDraft] = useState<Draft | null>(isNew ? emptyDraft() : null);
  const [sha, setSha] = useState<string | undefined>();
  const [newSlug, setNewSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState<Mode>(() => (typeof window !== "undefined" && innerWidth >= 1200 ? "split" : "write"));
  const [phone, setPhone] = useState(false);
  const saving = useRef(false);

  useEffect(() => {
    if (isNew) return;
    api
      .get(slug)
      .then((r) => {
        setDraft(parsePost(r.source));
        setSha(r.sha);
      })
      .catch((e) => setStatus(e.message));
  }, [isNew, slug]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d!, ...patch }));
    setDirty(true);
    setStatus("");
    if (isNew && !slugTouched && patch.title !== undefined) setNewSlug(slugify(patch.title));
  };

  const finalSlug = isNew ? newSlug : slug;

  const save = async (publish?: boolean) => {
    if (!draft || saving.current) return;
    if (!draft.title.trim()) return setStatus("Add a title first.");
    if (!finalSlug) return setStatus("Add a URL in Details first.");
    if (isNew && allPosts.some((p) => p.slug === finalSlug)) return setStatus(`A post at /writing/${finalSlug} already exists. Change the slug.`);
    const next = { ...draft, draft: publish === undefined ? draft.draft : !publish };
    saving.current = true;
    setStatus("Saving…");
    try {
      const r = await api.save(finalSlug, serializePost(next), sha);
      setSha(r.sha);
      setDraft(next);
      setDirty(false);
      setStatus(next.draft ? "Draft saved" : "Published. Live after the site rebuilds (about a minute).");
      if (isNew) onCreated(finalSlug);
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      saving.current = false;
    }
  };

  // ⌘S / Ctrl+S saves without changing draft status
  const onSaveKey = useEffectEvent(() => save());
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        onSaveKey();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const remove = async () => {
    if (!sha || !slug) return;
    try {
      await api.remove(slug, sha);
      setDirty(false);
      onExit();
    } catch (e) {
      setStatus((e as Error).message);
    }
  };

  const tagStats = useMemo(() => countTags(allPosts.filter((p) => p.slug !== slug)), [allPosts, slug]);
  const categoryTags = useMemo(
    () => new Set(allPosts.filter((p) => p.category === draft?.category).flatMap((p) => p.tags)),
    [allPosts, draft?.category],
  );

  if (!draft) return <Shell><p className="text-sm text-neutral-500">{status || "Loading…"}</p></Shell>;

  const editorColumn = (
    <div className="mx-auto w-full max-w-3xl">
      <Heading draft={draft} update={update} />
      <div className="mt-8">
        <Editor initial={draft.body} onChange={(body) => update({ body })} />
      </div>
    </div>
  );

  const preview = (
    <div className={`mx-auto ${phone ? "w-[390px] rounded-[2rem] border border-neutral-200 p-4 shadow-xl dark:border-white/10" : "w-full max-w-4xl"}`}>
      <p className="mb-2 text-[10px] font-medium tracking-wider text-neutral-500 uppercase">How it appears in lists</p>
      <div className="mb-10 rounded-xl border border-dashed border-neutral-300 px-3 dark:border-white/10">
        <PostRow post={{ ...draft, title: draft.title || "Untitled", slug: finalSlug || "untitled", minutes: readingMinutes(draft.body) }} />
      </div>
      <Preview draft={draft} />
    </div>
  );

  return (
    <Shell
      bar={
        <>
          {dirty ? (
            <ConfirmButton onConfirm={onExit} ask="Discard changes?" className={ghostBtn}>
              ← Posts
            </ConfirmButton>
          ) : (
            <button onClick={onExit} className={ghostBtn}>
              ← Posts
            </button>
          )}
          <span className="mr-auto truncate text-xs text-neutral-500">{status || (dirty ? "Unsaved changes" : "")}</span>
          <Segmented value={mode} options={["write", "split", "preview"]} onChange={setMode} />
          {mode !== "write" && (
            <button onClick={() => setPhone((p) => !p)} className={ghostBtn} title={phone ? "Desktop width" : "Phone width"}>
              {phone ? <LuMonitor /> : <LuSmartphone />}
            </button>
          )}
          <button popoverTarget="post-details" className={ghostBtn}>
            <LuSlidersHorizontal /> Details
          </button>
          <div id="post-details" popover="auto" className="fixed inset-auto top-16 right-5 m-0 w-[min(30rem,calc(100vw-2.5rem))] overflow-visible rounded-2xl border border-neutral-200 bg-white p-5 text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100">
            <Details
              draft={draft}
              update={update}
              isNew={isNew}
              slug={finalSlug ?? ""}
              onSlug={(s) => (setNewSlug(slugify(s)), setSlugTouched(true))}
              tagStats={tagStats}
              categoryTags={categoryTags}
            />
          </div>
          {!isNew && (
            <ConfirmButton onConfirm={remove} ask="Delete post?" className={ghostBtn} title="Delete post">
              <LuTrash2 />
            </ConfirmButton>
          )}
          <button onClick={() => save(false)} className={ghostBtn}>
            {draft.draft ? "Save draft" : "Unpublish"}
          </button>
          <button onClick={() => save(true)} className={primaryBtn}>
            {draft.draft ? "Publish" : "Update"}
          </button>
        </>
      }
    >
      {mode === "write" && editorColumn}
      {mode === "preview" && preview}
      {mode === "split" && (
        <div className="-mx-5 grid grid-cols-2 gap-0">
          <div className="border-r border-neutral-200 px-8 dark:border-white/10">{editorColumn}</div>
          <div className="sticky top-14 h-[calc(100dvh-3.5rem)] overflow-y-auto px-8">{preview}</div>
        </div>
      )}
    </Shell>
  );
}

// --- cover, title, subtitle: written inline, above the body ------------------------
function Heading({ draft, update }: { draft: Draft; update: (p: Partial<Draft>) => void }) {
  const coverInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const uploadCover = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      update({ cover: (await api.upload(file)).url });
    } catch (e) {
      setError(`Upload failed: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-8">
      {draft.cover ? (
        <div className="group relative mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={draft.cover} alt="" className="aspect-[1200/630] w-full rounded-2xl border border-neutral-200 object-cover dark:border-white/10" />
          <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button onClick={() => coverInput.current?.click()} className={overlayBtn}>
              Change
            </button>
            <button onClick={() => update({ cover: undefined })} className={overlayBtn} aria-label="Remove cover">
              <LuX />
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => coverInput.current?.click()} className={`${ghostBtn} mb-4 -ml-2.5`}>
          <LuImagePlus /> {uploading ? "Uploading…" : "Add cover image"}
        </button>
      )}
      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => (uploadCover(e.target.files?.[0]), (e.target.value = ""))} />

      {/* Textareas that grow with their text, so long titles wrap instead of scrolling */}
      <textarea
        value={draft.title}
        onChange={(e) => update({ title: e.target.value.replace(/\n/g, " ") })}
        placeholder="Title"
        rows={1}
        className="field-sizing-content w-full resize-none bg-transparent font-serif text-4xl leading-tight placeholder:text-neutral-300 focus:outline-none md:text-5xl dark:placeholder:text-neutral-700"
      />
      <textarea
        value={draft.subtitle}
        onChange={(e) => update({ subtitle: e.target.value.replace(/\n/g, " ") })}
        placeholder="One line on what it's about"
        rows={1}
        className="field-sizing-content mt-2 w-full resize-none bg-transparent text-lg text-neutral-600 placeholder:text-neutral-300 focus:outline-none dark:text-neutral-400 dark:placeholder:text-neutral-700"
      />
    </div>
  );
}

// --- category, tags, date, URL: in the Details popover ----------------------------
function Details({
  draft,
  update,
  isNew,
  slug,
  onSlug,
  tagStats,
  categoryTags,
}: {
  draft: Draft;
  update: (p: Partial<Draft>) => void;
  isNew: boolean;
  slug: string;
  onSlug: (s: string) => void;
  tagStats: [string, number][];
  categoryTags: Set<string>;
}) {
  return (
    <div className="grid gap-4 text-sm">
      <Field label="Category">
        <Segmented value={draft.category} options={[...CATEGORIES]} onChange={(category) => update({ category })} />
      </Field>
      <Field label="Tags">
        <TagInput value={draft.tags} onChange={(tags) => update({ tags })} stats={tagStats} preferred={categoryTags} />
      </Field>
      <Field label="Date">
        <input type="date" value={draft.date} onChange={(e) => update({ date: e.target.value })} className={`${inputCls} w-fit`} />
      </Field>
      <Field label="URL">
        <div className="flex items-center gap-1 text-neutral-500">
          /writing/
          {isNew ? (
            <input value={slug} onChange={(e) => onSlug(e.target.value)} placeholder="your-post-url" className={`${inputCls} flex-1`} />
          ) : (
            <span className="text-neutral-900 dark:text-neutral-100">{slug}</span>
          )}
        </div>
      </Field>
    </div>
  );
}

// Type a tag and press Enter (or comma). Suggests existing tags, the current
// category's first, so the same idea keeps the same tag.
function TagInput({ value, onChange, stats, preferred }: { value: string[]; onChange: (t: string[]) => void; stats: [string, number][]; preferred: Set<string> }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const add = (raw: string) => {
    const t = slugify(raw);
    if (t && !value.includes(t)) onChange([...value, t]);
    setText("");
  };
  const q = slugify(text);
  const suggestions = stats
    .filter(([t]) => !value.includes(t) && t.includes(q))
    .sort((a, b) => Number(preferred.has(b[0])) - Number(preferred.has(a[0])) || b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="relative">
      <div className={`${inputCls} flex flex-wrap items-center gap-1.5`}>
        {value.map((t) => (
          <span key={t} className={`${tagClass} flex items-center gap-1`}>
            {t}
            <button onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="cursor-pointer opacity-60 hover:opacity-100">
              <LuX className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => (setOpen(false), text.trim() && add(text))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(text);
            } else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
          }}
          placeholder={value.length ? "Add another" : "Type a tag, press Enter"}
          className="min-w-24 flex-1 bg-transparent focus:outline-none"
        />
      </div>
      {open && (suggestions.length > 0 || q) && (
        <div className="absolute top-full left-0 z-20 mt-1 w-64 rounded-xl border border-neutral-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-neutral-900">
          {suggestions.map(([t, n]) => (
            <button key={t} onMouseDown={(e) => (e.preventDefault(), add(t))} className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-neutral-100 dark:hover:bg-white/5">
              {t}
              <span className="text-xs text-neutral-500">
                {n} post{n > 1 ? "s" : ""}
              </span>
            </button>
          ))}
          {q && !stats.some(([t]) => t === q) && !value.includes(q) && (
            <button onMouseDown={(e) => (e.preventDefault(), add(q))} className="w-full cursor-pointer rounded-lg px-2.5 py-1.5 text-left text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5">
              Create “{q}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// --- small pieces ---------------------------------------------------------------
function countTags(posts: Draft[]): [string, number][] {
  const m = new Map<string, number>();
  for (const p of posts) for (const t of p.tags) m.set(t, (m.get(t) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex w-fit rounded-full border border-neutral-200 bg-neutral-50 p-0.5 dark:border-white/10 dark:bg-neutral-900">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`cursor-pointer rounded-full px-3 py-1 text-xs capitalize transition-colors ${
            o === value ? "bg-neutral-900 text-white dark:bg-white dark:text-black" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid gap-1.5">
    <span className="text-xs font-medium tracking-wider text-neutral-500 uppercase">{label}</span>
    {children}
  </div>
);

// Asks on the first click, acts on the second. In-page instead of confirm(),
// which some browsers (and embedded previews) silently block.
function ConfirmButton({ onConfirm, ask, className, title, children }: { onConfirm: () => void; ask: string; className: string; title?: string; children: ReactNode }) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      onClick={() => {
        if (armed) return onConfirm();
        setArmed(true);
        setTimeout(() => setArmed(false), 3000);
      }}
      onBlur={() => setArmed(false)}
      title={title}
      className={`${className} ${armed ? "bg-red-500/10 text-red-500 hover:bg-red-500/15 hover:text-red-500 dark:text-red-400" : ""}`}
    >
      {armed ? ask : children}
    </button>
  );
}

const inputCls = "rounded-lg border border-neutral-200 bg-transparent px-2.5 py-1.5 focus:border-neutral-400 focus:outline-none dark:border-white/10 dark:focus:border-white/30";
const activeChip = "rounded-md bg-neutral-900 px-2 py-0.5 text-xs text-white dark:bg-white dark:text-black";
const primaryBtn =
  "flex cursor-pointer items-center gap-1.5 rounded-full bg-neutral-900 px-3.5 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-85 dark:bg-white dark:text-black";
const ghostBtn =
  "flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-white";
const overlayBtn = "flex cursor-pointer items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-xs text-white backdrop-blur";
