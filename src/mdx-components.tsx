import type { MDXComponents } from "mdx/types";

// Applies to every post. Text styling comes from the `prose` classes on the article;
// this only adds what markdown can't express on its own.
const components: MDXComponents = {
  // ![alt](src "caption") renders as an image with a caption underneath.
  // Spans, not <figure>, because markdown wraps images in a <p>.
  img: ({ src, alt, title }) => (
    <span className="my-8 block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt ?? ""} className="m-0! w-full rounded-xl border border-neutral-200 dark:border-white/10" />
      {title && <span className="mt-2.5 block text-center text-sm text-neutral-500 italic">{title}</span>}
    </span>
  ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
