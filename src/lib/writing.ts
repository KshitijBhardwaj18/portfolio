import fs from "node:fs";
import path from "node:path";
import type { ComponentType } from "react";

import { readingMinutes, type Frontmatter, type PostMeta } from "./writing-meta";

export * from "./writing-meta";

const DIR = path.join(process.cwd(), "src/content/writing");
// Drafts show while developing and are left out of the production build.
const SHOW_DRAFTS = process.env.NODE_ENV !== "production";

// Posts are .md files (what the admin editor writes). Plain markdown, so stray
// { or < in prose can't break the build the way they would in .mdx.
export async function getPost(slug: string) {
  return (await import(`@/content/writing/${slug}.md`)) as { default: ComponentType; frontmatter: Frontmatter };
}

export async function getPosts(): Promise<PostMeta[]> {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".md") && !f.startsWith("_")); // _.md is a placeholder
  const posts = await Promise.all(
    files.map(async (file) => {
      const slug = file.replace(/\.md$/, "");
      const { frontmatter } = await getPost(slug);
      const minutes = readingMinutes(fs.readFileSync(path.join(DIR, file), "utf8"));
      return { ...frontmatter, date: String(frontmatter.date), slug, minutes };
    }),
  );
  return posts.filter((p) => SHOW_DRAFTS || !p.draft).sort((a, b) => b.date.localeCompare(a.date));
}
