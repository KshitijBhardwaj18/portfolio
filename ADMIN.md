# Writing admin

`/admin` is a private editor for posts on `/writing`. Posts are Markdown files in
`src/content/writing/`; the admin just reads and writes those files.

```
admin.kshitijbhardwaj.space   (behind Cloudflare Access; / goes to /admin)
   └─ /api ─► portfolio (internal service binding) ─► GitHub commit ─► rebuild ─► live (~1 min)
                                                 └──► images in R2, served at /media/...
```

Live site: **https://kshitijbhardwaj.space** · Live admin: **https://admin.kshitijbhardwaj.space**

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
  - `portfolio`: the public site, on `kshitijbhardwaj.space`. It has no `/admin` or `/api`. It also holds the
    `GITHUB_TOKEN` secret and exports `AdminApi`, which is reachable only through
    a service binding, never from the internet.
  - `portfolio-admin`: the same static files plus `/admin`, on `admin.kshitijbhardwaj.space`. The whole Worker sits
    behind Cloudflare Access, and it forwards `/api` to `AdminApi`.
- **Builds:** each Worker has its own Workers Build on this repo. Every push to
  `main` runs `pnpm run build` for both, then `npx wrangler deploy` (portfolio)
  and `npx wrangler deploy --env admin` (portfolio-admin). Keep them separate:
  a build always deploys onto the Worker it's connected to, whatever the config says.
- **Login:** Zero Trust → Access → Applications → "Portfolio admin" (team
  `young-fire-f72a`). It covers `admin.kshitijbhardwaj.space` (the `portfolio-admin`
  Worker; workers.dev addresses are off), with the policy
  "Only me" (kshitij.ghss@gmail.com). Its audience tag is `ACCESS_AUD` under
  `env.admin` in `wrangler.jsonc`.
- **Domains:** custom domains in `wrangler.jsonc` (`routes`); deploying creates
  their DNS records in the `kshitijbhardwaj.space` zone.
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
