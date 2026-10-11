// Local stand-in for the Cloudflare Worker API, so the admin works offline:
// posts are read/written in src/content/writing, images saved to public/media.
// Same routes and responses as worker/index.ts.
//   node scripts/admin-dev-server.mjs   (listens on :3101)
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const POSTS = path.join(ROOT, "src/content/writing");
const MEDIA = path.join(ROOT, "public/media");
const PORT = 3101;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_UPLOAD = 10 * 1024 * 1024;

const sha = (s) => createHash("sha1").update(s).digest("hex");
const file = (slug) => path.join(POSTS, `${slug}.md`);
const read = (p) => fs.readFile(p, "utf8").catch(() => null);

// Only answers pages on this machine (the Next dev server, whatever its port).
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

function send(res, status, body, origin = "") {
  res.writeHead(status, {
    "content-type": "application/json",
    ...(LOCAL.test(origin) && { "access-control-allow-origin": origin }),
    "access-control-allow-methods": "GET,PUT,DELETE,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(JSON.stringify(body));
}

async function body(req, limit = MAX_UPLOAD) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw Object.assign(new Error("Too large"), { status: 413 });
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

async function handle(req, res) {
  const reply = (status, body) => send(res, status, body, req.headers.origin);
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const [, api, resource, slug] = url.pathname.split("/");
  if (req.method === "OPTIONS") return reply(204, {});
  if (api !== "api") return reply(404, { error: "Not found" });

  if (resource === "posts" && !slug && req.method === "GET") {
    const names = (await fs.readdir(POSTS)).filter((f) => f.endsWith(".md"));
    const posts = await Promise.all(names.map(async (n) => ({ slug: n.slice(0, -3), source: await read(path.join(POSTS, n)) })));
    return reply(200, { posts });
  }

  if (resource === "posts" && slug) {
    if (!SLUG.test(slug)) return reply(400, { error: "Bad slug" });
    const current = await read(file(slug));
    if (req.method === "GET") return current === null ? reply(404, { error: "Not found" }) : reply(200, { slug, source: current, sha: sha(current) });

    const input = JSON.parse((await body(req, 2 * 1024 * 1024)).toString() || "{}");
    // Same conflict rule as GitHub: editing an existing post needs the sha you loaded.
    if (current !== null && input.sha !== sha(current)) return reply(409, { error: "This post changed since you opened it." });
    if (req.method === "PUT") {
      if (typeof input.source !== "string") return reply(400, { error: "Missing source" });
      await fs.writeFile(file(slug), input.source);
      return reply(200, { sha: sha(input.source) });
    }
    if (req.method === "DELETE") {
      if (current === null) return reply(404, { error: "Not found" });
      await fs.unlink(file(slug));
      return reply(200, { ok: true });
    }
  }

  if (resource === "upload" && req.method === "POST") {
    const form = await new Request(url, { method: "POST", headers: req.headers, body: await body(req), duplex: "half" }).formData();
    const upload = form.get("file");
    if (!(upload instanceof File) || !upload.type.startsWith("image/")) return reply(400, { error: "Images only" });
    const ext = (upload.name.split(".").pop() || "img").toLowerCase().replace(/[^a-z0-9]/g, "");
    const name = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}.${ext}`;
    await fs.mkdir(MEDIA, { recursive: true });
    await fs.writeFile(path.join(MEDIA, name), Buffer.from(await upload.arrayBuffer()));
    return reply(200, { url: `/media/${name}` });
  }

  reply(404, { error: "Not found" });
}

http
  .createServer((req, res) => handle(req, res).catch((e) => send(res, e.status ?? 500, { error: e.message }, req.headers.origin)))
  .listen(PORT, "127.0.0.1", () => console.log(`admin API (local files) on http://localhost:${PORT}`));
