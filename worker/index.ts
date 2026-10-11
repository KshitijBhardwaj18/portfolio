// Cloudflare Worker in front of the static site.
// - /media/*          images from the R2 bucket (or public/media)
// - /admin, /api/*    only with a valid Cloudflare Access login (checked here too,
//                     not just at the edge), refused outright until Access is set up
// - /api/posts...     read/write posts as commits to the GitHub repo; a push
//                     triggers the Cloudflare build, which publishes the site
// - everything else   the static site in ./out
// Same API as scripts/admin-dev-server.mjs, which the admin uses locally.
import { createRemoteJWKSet, jwtVerify } from "jose";

interface Env {
  ASSETS: Fetcher;
  MEDIA: R2Bucket;
  GITHUB_TOKEN: string; // secret: fine-grained token, Contents read/write on GITHUB_REPO only
  GITHUB_REPO: string; // "owner/name"
  GITHUB_BRANCH: string;
  ACCESS_TEAM_DOMAIN: string; // e.g. https://kshitij.cloudflareaccess.com
  ACCESS_AUD: string; // the Access application's audience tag
}

const POSTS_DIR = "src/content/writing";
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_UPLOAD = 10 * 1024 * 1024;

const json = (body: unknown, status = 200) => Response.json(body, { status });
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/media/")) return (await media(url, env)) ?? env.ASSETS.fetch(request);
      if (url.pathname === "/admin" || url.pathname.startsWith("/admin/") || url.pathname.startsWith("/api/")) {
        await requireAccess(request, env);
        if (url.pathname.startsWith("/api/")) return await api(request, url, env);
      }
      return env.ASSETS.fetch(request);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      return json({ error: (e as Error).message }, status);
    }
  },
} satisfies ExportedHandler<Env>;

// --- auth: verify the Cloudflare Access JWT ------------------------------------
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

async function requireAccess(request: Request, env: Env) {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) throw new HttpError(503, "Admin is not configured: set up Cloudflare Access (see ADMIN.md).");
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) throw new HttpError(401, "Not signed in.");
  jwks ??= createRemoteJWKSet(new URL(`${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`));
  try {
    await jwtVerify(token, jwks, { issuer: env.ACCESS_TEAM_DOMAIN, audience: env.ACCESS_AUD });
  } catch {
    throw new HttpError(403, "Invalid sign-in. Reload the page to sign in again.");
  }
}

// --- media: R2 first, then public/media (images added while writing locally) ----------
async function media(url: URL, env: Env) {
  const object = await env.MEDIA.get(decodeURIComponent(url.pathname.slice("/media/".length)));
  if (!object) return null;
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable"); // names are unique per upload
  return new Response(object.body, { headers });
}

// --- API -------------------------------------------------------------------
async function api(request: Request, url: URL, env: Env) {
  const [, , resource, slug] = url.pathname.split("/");

  if (resource === "posts" && !slug && request.method === "GET") {
    const items = await gh<{ name: string; path: string }[]>(env, `contents/${POSTS_DIR}?ref=${env.GITHUB_BRANCH}`).catch((e) => {
      if (e instanceof HttpError && e.status === 404) return []; // no posts folder yet
      throw e;
    });
    const posts = await Promise.all(
      items.filter((i) => i.name.endsWith(".md") && !i.name.startsWith("_")).map(async (i) => ({ slug: i.name.slice(0, -3), source: (await readFile(env, i.path)).source })),
    );
    return json({ posts });
  }

  if (resource === "posts" && slug) {
    if (!SLUG.test(slug)) throw new HttpError(400, "Bad slug");
    const path = `${POSTS_DIR}/${slug}.md`;
    if (request.method === "GET") return json({ slug, ...(await readFile(env, path)) });

    const input = (await request.json().catch(() => ({}))) as { source?: string; sha?: string };
    if (request.method === "PUT") {
      if (typeof input.source !== "string") throw new HttpError(400, "Missing source");
      const r = await gh<{ content: { sha: string } }>(env, `contents/${path}`, {
        method: "PUT",
        body: JSON.stringify({ message: `writing: save ${slug}`, content: toBase64(input.source), sha: input.sha, branch: env.GITHUB_BRANCH }),
      });
      return json({ sha: r.content.sha });
    }
    if (request.method === "DELETE") {
      await gh(env, `contents/${path}`, { method: "DELETE", body: JSON.stringify({ message: `writing: delete ${slug}`, sha: input.sha, branch: env.GITHUB_BRANCH }) });
      return json({ ok: true });
    }
  }

  if (resource === "upload" && request.method === "POST") {
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || !file.type.startsWith("image/")) throw new HttpError(400, "Images only");
    if (file.size > MAX_UPLOAD) throw new HttpError(413, "Image is over 10 MB");
    const ext = (file.name.split(".").pop() || "img").toLowerCase().replace(/[^a-z0-9]/g, "");
    const key = `writing/${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
    return json({ url: `/media/${key}` });
  }

  throw new HttpError(404, "Not found");
}

// --- GitHub ------------------------------------------------------------------
async function gh<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
  if (!env.GITHUB_TOKEN) throw new HttpError(503, "GITHUB_TOKEN secret is not set (see ADMIN.md).");
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "portfolio-admin",
      ...(init.body && { "content-type": "application/json" }),
    },
  });
  if (res.ok) return (await res.json()) as T;
  // 409: sha didn't match, 422: sha missing for a file that exists. Both mean someone else saved first.
  if (res.status === 409 || (res.status === 422 && init.method !== "GET")) throw new HttpError(409, "This post changed since you opened it. Reload to get the latest version.");
  throw new HttpError(res.status, `GitHub: ${((await res.json().catch(() => ({}))) as { message?: string }).message ?? res.statusText}`);
}

async function readFile(env: Env, path: string) {
  const r = await gh<{ content: string; sha: string }>(env, `contents/${path}?ref=${env.GITHUB_BRANCH}`);
  return { source: fromBase64(r.content), sha: r.sha };
}

// GitHub's contents API speaks base64; posts are UTF-8.
const toBase64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const fromBase64 = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0)));
