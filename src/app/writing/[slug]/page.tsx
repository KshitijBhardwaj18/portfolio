import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostView } from "@/components/post-view";
import { SiteNav } from "@/components/site-nav";
import { getPost, getPosts } from "@/lib/writing";

type Props = { params: Promise<{ slug: string }> };

// Static export needs at least one page here. Until something is published
// (drafts are left out of production), that page is a placeholder that 404s.
const NONE = "_";

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.length ? posts.map((p) => ({ slug: p.slug })) : [{ slug: NONE }];
}
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === NONE) return {};
  const { frontmatter: f } = await getPost(slug);
  return { title: `${f.title} · Kshitij Bhardwaj`, description: f.subtitle };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  if (slug === NONE) notFound();
  const { default: Body, frontmatter: f } = await getPost(slug);
  const meta = (await getPosts()).find((p) => p.slug === slug)!;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 pt-8 pb-16 sm:px-8 md:px-10 md:pt-10 md:pb-24">
      <SiteNav />

      <PostView f={{ ...f, date: meta.date }} minutes={meta.minutes}>
        <Body />
      </PostView>
    </main>
  );
}
