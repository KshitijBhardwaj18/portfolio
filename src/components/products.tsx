import { LuArrowUpRight } from "react-icons/lu";

const PRODUCTS = [
  {
    name: "OurNotch",
    url: "https://ournotch.app",
    logo: "https://ournotch.app/logo.svg",
    image: "https://ournotch.app/og.png",
    description:
      "Puts your person in your MacBook notch: their face, their mood, and the whispers, kisses and photos you send each other.",
    tags: ["macOS", "One license, two Macs"],
  },
];

export function Products() {
  return (
    <section>
      <h2 className="text-xs font-medium tracking-wider text-neutral-500 uppercase dark:text-neutral-400">Products</h2>
      <p className="mt-1 text-base text-neutral-600 dark:text-neutral-400">Things I&apos;ve built and shipped.</p>

      <div className="mt-5 space-y-4">
        {PRODUCTS.map((p) => (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-5 rounded-2xl border border-neutral-200 bg-neutral-50/80 p-3 transition-colors duration-300 hover:border-neutral-300 sm:flex-row sm:items-center sm:p-4 dark:border-white/10 dark:bg-neutral-900/95 dark:hover:border-white/20"
          >
            <div className="overflow-hidden rounded-xl shadow-md shadow-black/20 sm:w-[46%] sm:shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image}
                alt={`${p.name} preview`}
                loading="lazy"
                className="aspect-[1200/630] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3 px-1 pb-1 sm:p-0">
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.logo} alt="" className="size-7 rounded-lg" />
                <span className="font-serif text-2xl leading-none">{p.name}</span>
                <span className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-2 py-0.5 text-[11px] text-neutral-500 dark:border-white/10 dark:text-neutral-400">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </span>
                <LuArrowUpRight className="ml-auto size-4 text-neutral-400 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-neutral-900 dark:group-hover:text-neutral-100" />
              </div>
              <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{p.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-neutral-200/60 px-1.5 py-0.5 text-xs text-neutral-600 dark:bg-white/5 dark:text-neutral-400"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
