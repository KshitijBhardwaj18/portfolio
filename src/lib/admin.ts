// Admin-side helpers: the post file format and the save API.
import { parse, stringify } from "yaml";
import type { Category, Frontmatter } from "./writing-meta";

// --- post files: a YAML block between --- lines, then markdown --------------
export type Draft = Frontmatter & { body: string };

export const today = () => new Date().toISOString().slice(0, 10);

export function emptyDraft(category: Category = "engineering"): Draft {
  return { title: "", subtitle: "", date: today(), category, tags: [], draft: true, body: "" };
}

export function parsePost(source: string): Draft {
  const m = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = (m ? parse(m[1]) : {}) ?? {};
  return {
    ...emptyDraft(),
    ...meta,
    date: String(meta.date ?? today()),
    tags: meta.tags ?? [],
    draft: Boolean(meta.draft),
    body: (m ? m[2] : source).trim(),
  };
}

export function serializePost({ body, ...meta }: Draft): string {
  // Leave out empty optionals so files stay tidy; always quote the date.
  const clean: Record<string, unknown> = { ...meta, date: meta.date };
  if (!clean.cover) delete clean.cover;
  if (!clean.draft) delete clean.draft;
  const yaml = stringify(clean, { defaultStringType: "PLAIN", lineWidth: 0 }).replace(/^date: (.+)$/m, 'date: "$1"');
  return `---\n${yaml}---\n\n${body.trim()}\n`;
}

// "Hello, World!" -> "hello-world"
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

// --- API: local dev server in development, the Cloudflare Worker in production ---
const BASE = process.env.NEXT_PUBLIC_ADMIN_API ?? "";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  list: () => call<{ posts: { slug: string; source: string }[] }>("/api/posts"),
  get: (slug: string) => call<{ slug: string; source: string; sha: string }>(`/api/posts/${slug}`),
  save: (slug: string, source: string, sha?: string) =>
    call<{ sha: string }>(`/api/posts/${slug}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ source, sha }) }),
  remove: (slug: string, sha: string) =>
    call<{ ok: true }>(`/api/posts/${slug}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ sha }) }),
  upload: async (file: File) => {
    const form = new FormData();
    form.append("file", await shrink(file));
    return call<{ url: string }>("/api/upload", { method: "POST", body: form });
  },
};

// Downscale big photos before upload: longest side 2000px, JPEG/WebP quality 0.85.
// GIFs and SVGs pass through untouched.
async function shrink(file: File, max = 2000): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size < 1_000_000) return file;
  const canvas = new OffscreenCanvas(Math.round(bmp.width * scale), Math.round(bmp.height * scale));
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const type = file.type === "image/png" ? "image/webp" : file.type;
  const blob = await canvas.convertToBlob({ type, quality: 0.85 });
  return new File([blob], file.name.replace(/\.\w+$/, type === "image/webp" ? ".webp" : ".jpg"), { type });
}
