import { FaGithub, FaLinkedin } from "react-icons/fa6";
import { LuMail } from "react-icons/lu";
import { SiteNav } from "@/components/site-nav";
import { Books } from "@/components/books";
import { ChessCard } from "@/components/chess";
import { Products } from "@/components/products";
import { Writing } from "@/components/writing";
import { ActivityCard, MusicCard, type Track } from "@/components/widgets";

const SOCIALS = [
  { label: "GitHub", href: "https://github.com/KshitijBhardwaj18", icon: FaGithub },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/kshitij-bhardwaj-39675438a/", icon: FaLinkedin },
  { label: "Email", href: "mailto:kshitij.ghss@gmail.com", icon: LuMail },
];

// "Recently played": metadata + 30s preview come from iTunes at build time.
const TRACK_ID = 1875907951; // 5-7, Karan Aujla

async function getTrack(): Promise<Track> {
  const res = await fetch(`https://itunes.apple.com/lookup?id=${TRACK_ID}`);
  const t = (await res.json()).results[0];
  return {
    name: t.trackName,
    artist: t.artistName,
    art: t.artworkUrl100.replace("100x100bb", "600x600bb"),
    preview: t.previewUrl,
    url: t.trackViewUrl,
  };
}

export default async function Home() {
  const track = await getTrack();
  return (
    <main className="relative mx-auto w-full max-w-4xl flex-1 px-5 pt-8 pb-16 sm:px-8 md:px-10 md:pt-10 md:pb-24">
      <SiteNav />
      <div className="relative space-y-12">
        <header>
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://github.com/KshitijBhardwaj18.png"
              alt="Kshitij Bhardwaj"
              className="size-16 shrink-0 rounded-xl object-cover outline-2 outline-offset-[3px] outline-neutral-400 dark:outline-neutral-600"
            />
            <div className="flex flex-col">
              <h1 className="font-serif text-2xl md:text-3xl">
                Kshitij Bhardwaj
              </h1>
              <p className="text-base text-neutral-500 dark:text-neutral-400">
                Homo sapien, 22
              </p>
            </div>
          </div>

          <div className="mt-4 -ml-1.5 flex items-center gap-1">
            {SOCIALS.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                title={label}
                {...(href.startsWith("http") && { target: "_blank", rel: "noopener noreferrer" })}
                className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <Icon className="size-[18px]" />
              </a>
            ))}
          </div>

          <p className="mt-4 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
            This is where I think out loud. A living notebook of what I&apos;m
            building, breaking, and figuring out, written down so the work
            outlives the moment it happened in.
          </p>

          <h2 className="mt-4 text-xs font-medium tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
            Currently
          </h2>
          <p className="mt-1 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
            Studying how the brain remembers, and borrowing its tricks to give
            AI agents a memory of their own.
          </p>
        </header>

        {/* One row: music spans two columns and is exactly one tile tall */}
        <section className="@container grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MusicCard track={track} />
          <ActivityCard />
          <ChessCard />
        </section>
        <Products />
        <Writing />
        <Books />
      </div>
    </main>
  );
}
