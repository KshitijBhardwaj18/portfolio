"use client";

import { evaluate } from "@mdx-js/mdx";
import { useEffect, useState, type ComponentType } from "react";
import * as runtime from "react/jsx-runtime";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { PostView } from "@/components/post-view";
import { useMDXComponents } from "@/mdx-components";
import { readingMinutes } from "@/lib/writing-meta";
import type { Draft } from "@/lib/admin";

// Compiles the markdown with the same plugins as the site build, then renders it
// through PostView: the preview is the real post page, not an approximation.
export function Preview({ draft }: { draft: Draft }) {
  const [Body, setBody] = useState<ComponentType<{ components?: object }> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      try {
        // Code colouring (shiki) is heavy, so it's only loaded when the preview is open.
        const { default: rehypePrettyCode } = await import("rehype-pretty-code");
        const mod = await evaluate(draft.body, {
          ...runtime,
          format: "md",
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeSlug, [rehypePrettyCode, { theme: { light: "github-light", dark: "github-dark" }, keepBackground: false }]],
        });
        if (live) {
          setBody(() => mod.default as ComponentType<{ components?: object }>);
          setError("");
        }
      } catch (e) {
        if (live) setError((e as Error).message);
      }
    }, 250); // wait for a pause in typing
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [draft.body]);

  const components = useMDXComponents();
  return (
    <PostView f={{ ...draft, title: draft.title || "Untitled" }} minutes={readingMinutes(draft.body)}>
      {error ? <p className="text-sm text-red-500">Preview error: {error}</p> : Body ? <Body components={components} /> : null}
    </PostView>
  );
}
