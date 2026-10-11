# Writing admin

`/admin` is a private editor for posts on `/writing`. Posts are Markdown files in
`src/content/writing/`; the admin just reads and writes those files.

```
portfolio-admin.kshitij-ghss.workers.dev/admin   (behind Cloudflare Access)
   └─ /api ─► portfolio (internal service binding) ─► GitHub commit ─► rebuild ─► live (~1 min)
                                                 └──► images in R2, served at /media/...
```

Live admin: **https://portfolio-admin.kshitij-ghss.workers.dev/admin**

## Writing locally

```bash
pnpm dev   # site + admin at http://localhost:3000/admin
```

`pnpm dev` also starts the local API (`scripts/admin-dev-server.mjs`), which saves
posts to `src/content/writing` and images to `public/media`.

Locally nothing is committed or published: you get files on disk, and drafts
(`draft: true`) show up on the dev site but never in a production build.

## How it's deployed (already set up)

- **Two Workers from one script** (`worker/index.ts`, `wrangler.jsonc`):
  - `portfolio`: the public site. It has no `/admin` or `/api`. It also holds the
    `GITHUB_TOKEN` secret and exports `AdminApi`, which is reachable only through
    a service binding, never from the internet.
  - `portfolio-admin`: the same static files plus `/admin`. The whole Worker sits
    behind Cloudflare Access, and it forwards `/api` to `AdminApi`.
- **Builds:** every push to `main` runs `pnpm run build`, then
  `npx wrangler deploy && npx wrangler deploy --env admin`.
- **Login:** Zero Trust → Access → Applications → "Portfolio admin" (team
  `young-fire-f72a`). It covers the `portfolio-admin` Worker, with the policy
  "Only me" (kshitij.ghss@gmail.com). Its audience tag is `ACCESS_AUD` under
  `env.admin` in `wrangler.jsonc`.
- **Images:** R2 bucket `portfolio-media`.
- **Token:** `npx wrangler secret put GITHUB_TOKEN --name portfolio` (a
  fine-grained token: this repo only, Contents read/write).

## Safety

- The admin Worker checks the Access login on every request itself, so a
  misconfigured Access app can't expose the API. The public Worker has no API route at all.
- The GitHub token can only touch this one repo's files.
- Saving an edited post sends the version you opened; if it changed since
  (say, edited from another device), the save is refused instead of overwriting.

## Post format

```md
---
title: How a memory becomes permanent
subtitle: Consolidation, sleep, and the proteins that hold it together.
date: "2026-10-02"
category: biology        # engineering | life | biology
tags:
  - memory
  - neuroscience
cover: /media/writing/abc123.jpg   # optional
draft: true              # optional; drafts never appear on the live site
---

Markdown body. `## Headings` become sections in the reading pill.
Images: ![alt text](/media/... "Caption shown under the image")
Footnotes: text[^1] … and at the end: [^1]: The note.
```
