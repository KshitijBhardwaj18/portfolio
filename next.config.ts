import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  pageExtensions: ["ts", "tsx"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Plugins are named as strings: Turbopack can't take JS functions.
const withMDX = createMDX({
  extension: /\.md$/, // posts are plain .md
  options: {
    remarkPlugins: [
      "remark-frontmatter",
      ["remark-mdx-frontmatter", { name: "frontmatter" }], // exposes the YAML block as `frontmatter`
      "remark-gfm", // tables, footnotes, strikethrough
    ],
    rehypePlugins: [
      "rehype-slug", // ids on headings, for the section pill
      ["rehype-pretty-code", { theme: { light: "github-light", dark: "github-dark" }, keepBackground: false }],
    ],
  },
});

export default withMDX(nextConfig);
