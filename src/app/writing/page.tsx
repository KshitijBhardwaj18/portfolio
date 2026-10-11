import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteNav } from "@/components/site-nav";
import { PostRow } from "@/components/post-row";
import { WritingIndex } from "@/components/writing-index";
import { getPosts } from "@/lib/writing";

export const metadata: Metadata = {
  title: "Writing · Kshitij Bhardwaj",
  description: "Notes on engineering, life and biology.",
};

export default async function WritingPage() {
  const posts = await getPosts();
  const rows = Object.fromEntries(posts.map((p) => [p.slug, <PostRow key={p.slug} post={p} />]));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 pt-8 pb-16 sm:px-8 md:px-10 md:pt-10 md:pb-24">
      <SiteNav />

      <h1 className="font-serif text-4xl">Writing</h1>
      <p className="mt-2 text-base text-neutral-600 dark:text-neutral-400">
        Notes on engineering, life and biology. Mostly written to think more clearly.
      </p>

      <div className="mt-10">
        {/* Suspense: the filters read the URL, which only exists in the browser on a static site */}
        <Suspense>
          <WritingIndex posts={posts} rows={rows} />
        </Suspense>
      </div>
    </main>
  );
}
