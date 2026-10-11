# Writing admin

`/admin` is a private editor for posts on `/writing`. Posts are Markdown files in
`src/content/writing/`; the admin just reads and writes those files.

```
/admin (browser) ──► /api ──► GitHub commit ──► Cloudflare rebuilds ──► live (~1 min)
                       └────► images in R2, served at /media/...
```

## Writing locally

```bash
pnpm dev   # site + admin at http://localhost:3000/admin
```

`pnpm dev` also starts the local API (`scripts/admin-dev-server.mjs`), which saves
posts to `src/content/writing` and images to `public/media`.

Locally nothing is committed or published: you get files on disk, and drafts
(`draft: true`) show up on the dev site but never in a production build.

## Going live (one-time setup)

1. **Deploy from GitHub.** Push the repo, then in the Cloudflare dashboard:
   Workers & Pages → Create → Import a repository → `portfolio`.
   - Build command: `pnpm build`
   - Deploy command: `npx wrangler deploy`

   Every push to `main` now rebuilds and deploys the site.

2. **Image storage.**

   ```bash
   npx wrangler r2 bucket create portfolio-media
   ```

3. **GitHub token for saving posts.** GitHub → Settings → Developer settings →
   Fine-grained tokens → Generate:
   - Repository access: only `KshitijBhardwaj18/portfolio`
   - Permissions: **Contents: Read and write** (nothing else)

   Then store it as a Worker secret (it's never in the code):

   ```bash
   npx wrangler secret put GITHUB_TOKEN
   ```

4. **Login (Cloudflare Access).** Cloudflare dashboard → Zero Trust → Access →
   Applications → Add → Self-hosted:
   - Domain: your site's domain, two entries: path `admin` and path `api`
   - Policy: Allow → Emails → your email
   - Login method: One-time PIN (a code is emailed to you)

   From the application's overview, copy the **Application Audience (AUD) tag**,
   and from Zero Trust → Settings, your **team domain**
   (`https://<team>.cloudflareaccess.com`). Put both in `wrangler.jsonc`:

   ```jsonc
   "ACCESS_TEAM_DOMAIN": "https://<team>.cloudflareaccess.com",
   "ACCESS_AUD": "<aud tag>"
   ```

   Commit and push. Until both are set, `/admin` and `/api` answer
   "Admin is not configured" to everyone.

## Safety

- The Worker checks the Access login on every `/admin` and `/api` request itself,
  so a misconfigured Access app can't expose the API.
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
