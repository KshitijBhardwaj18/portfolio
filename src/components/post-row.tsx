import Link from "next/link";
import { LuArrowRight } from "react-icons/lu";
import { formatDate, type PostMeta } from "@/lib/writing-meta";

export function PostRow({ post }: { post: PostMeta }) {
  return (
    <Link
      href={`/writing/${post.slug}`}
      className="group -mx-3 flex items-center justify-between gap-6 rounded-xl px-3 py-3.5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900/70"
    >
      <div className="min-w-0">
        <h3 className="font-medium tracking-tight text-black dark:text-white">
          {post.title}
          {post.draft && <span className="ml-2 align-middle text-[10px] font-medium tracking-wider text-amber-600 uppercase">Draft</span>}
        </h3>
        <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{post.subtitle}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
          <span className="capitalize">{post.category}</span>
          <span aria-hidden>·</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden>·</span>
          <span>{post.minutes} min read</span>
        </div>
      </div>
      <LuArrowRight className="size-4 shrink-0 text-neutral-400 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-neutral-900 dark:group-hover:text-neutral-100" />
    </Link>
  );
}
