// .md posts compile through @next/mdx just like .mdx ones.
declare module "*.md" {
  import type { MDXProps } from "mdx/types";
  export const frontmatter: Record<string, unknown>;
  export default function MDXContent(props: MDXProps): React.JSX.Element;
}
