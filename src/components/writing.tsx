import Link from "next/link";
import { PostRow } from "@/components/post-row";
import { getPosts } from "@/lib/writing";

// Homepage section: the latest three posts. Hidden until something is published.
export async function Writing() {
  const posts = (await getPosts()).slice(0, 3);
  if (!posts.length) return null;
  return (
    <section>
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xs font-medium tracking-wider text-neutral-500 uppercase dark:text-neutral-400">Writing</h2>
          <p className="mt-1 text-base text-neutral-600 dark:text-neutral-400">Notes on engineering, life and biology.</p>
        </div>
        <Link href="/writing" className="text-sm text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100">
          All writing →
        </Link>
      </div>
      <div className="mt-4">
        {posts.map((p) => (
          <PostRow key={p.slug} post={p} />
        ))}
      </div>
    </section>
  );
}
