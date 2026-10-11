// Shared by server and client code, so no Node imports here.
// Posts live in src/content/writing/<slug>.mdx with a YAML block at the top:
//   title, subtitle, date ("YYYY-MM-DD"), category, tags, cover? (path under /public), draft?
// A future editor only has to write files in this shape and commit them.
export const CATEGORIES = ["engineering", "life", "biology"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Frontmatter = {
  title: string;
  subtitle: string;
  date: string;
  category: Category;
  tags: string[];
  cover?: string;
  draft?: boolean;
};
export type PostMeta = Frontmatter & { slug: string; minutes: number };

// Same chip as the product tags on the homepage.
export const tagClass =
  "rounded-md bg-neutral-200/60 px-2 py-0.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-white/5 dark:text-neutral-400 dark:hover:bg-white/10";

export const formatDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

// ~230 words a minute, never less than one.
export const readingMinutes = (text: string) => Math.max(1, Math.round(text.split(/\s+/).length / 230));
