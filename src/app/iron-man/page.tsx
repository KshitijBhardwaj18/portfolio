import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteNav } from "@/components/site-nav";

// Docs for the react-iron-man package, served at ironman.kshitijbhardwaj.space
// (worker/index.ts maps that host's / here). The demo is the real thing: the
// footer flies Iron Man on every page, this one included.

export const metadata: Metadata = {
  title: "react-iron-man",
  description: "Iron Man flies around your React site, heckles your visitors, and plays catch with their real hand.",
};

const INSTALL = "npm i react-iron-man";

const USAGE = `import { Heroes } from "react-iron-man";

export default function Layout({ children }) {
  return (
    <>
      {children}
      <Heroes />
    </>
  );
}`;

const NEXT = `// app/layout.tsx: it's already a client component, so a Server layout can render it.
import { Heroes } from "react-iron-man";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Heroes contentWidth={720} />
        <p>Iron Man by Grant Riley (CC BY-NC)</p>
      </body>
    </html>
  );
}`;

const BATMAN = `const [batman, setBatman] = useState(false);

<button onClick={() => setBatman((b) => !b)}>Summon Batman</button>
<Heroes batman={batman} />`;

const SELF_HOST = `cp node_modules/react-iron-man/models/*.glb public/models/

<Heroes models={{ ironMan: "/models/iron-man.glb", batman: "/models/batman.glb" }} />`;

const CREDIT = `<a href="https://sketchfab.com/3d-models/iron-man-69dde1ad49e94852984e3d83928efd65">Iron Man</a> by Grant Riley (CC BY-NC)`;

const PROPS: [string, string, string, string][] = [
  ["batman", "boolean", "false", "Batman joins Iron Man while true. They banter, swap sides, and he can be chased too."],
  ["models", "{ ironMan?: string; batman?: string }", "jsDelivr", "URLs of self-hosted .glb models, instead of loading them from the CDN."],
  ["contentWidth", "number", "900", "Width of your page's centred content column, in px. They keep to the empty margins beside it."],
];

const DOES = [
  "Lives in your page's side margin, bobbing on his thrusters, and turns to watch the cursor.",
  "Heckles whatever the visitor points at: links, GitHub, LinkedIn, email links, images, buttons.",
  "Gets left behind when you scroll, then flies back to his spot. Complains if you scroll too fast.",
  "Swaps sides of the page every so often and talks when things are quiet.",
  "Poke him and the page becomes a game of catch: he dodges, barrel-rolls, and overheats after five dodges in a row. That's your window.",
  "Only a real hand can catch him. The webcam tracks it in the browser; pinch right on him to grab, let go to throw him.",
];

const REQUIRES: [string, ReactNode][] = [
  ["React 18 or newer", "Any React setup: Next.js (App or Pages Router), Vite, Remix, Astro islands. No Tailwind or CSS import needed; it brings its own styles."],
  ["A browser with WebGL", "Every current desktop browser. Best on wide screens, where he has a margin to live in; on phones he keeps to the edge."],
  ["HTTPS, for the game", "Browsers only give camera access on HTTPS pages (and localhost). Without a camera he still flies, talks and dodges; he just can't be caught."],
  ["About 1 MB on page load", "Iron Man's model (1.0 MB) loads in the background after the page. Batman (0.3 MB) loads only when summoned."],
  ["About 11 MB on the first poke", "The hand tracker: the MediaPipe runtime (3 MB compressed, from jsDelivr) and its hand model (7.8 MB, from Google). Loaded only when someone starts the game, then cached."],
  ["A CSP that allows it", <>If your site sets a Content Security Policy, allow <Mono>cdn.jsdelivr.net</Mono> and <Mono>storage.googleapis.com</Mono> in <Mono>connect-src</Mono> and <Mono>script-src</Mono>, plus <Mono>&apos;wasm-unsafe-eval&apos;</Mono>.</>],
  ["Room at z-index 40–60", "He flies above your page at z-index 55 and the game overlay sits at 50–60. Keep modals you need on top above 60."],
  ["Non-commercial use", "The Iron Man model is CC BY-NC: personal sites, portfolios and hobby projects only, with credit. See the license below."],
];

function Mono({ children }: { children: ReactNode }) {
  return <code className="rounded bg-neutral-200/60 px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/10">{children}</code>;
}

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-50 p-4 font-mono text-[13px] leading-relaxed text-neutral-800 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200">
      <code>{children}</code>
    </pre>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-medium tracking-wider text-neutral-500 uppercase dark:text-neutral-400">{title}</h2>
      <div className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">{children}</div>
    </section>
  );
}

export default function IronManPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 pt-8 pb-16 sm:px-8 md:px-10 md:pt-10 md:pb-24">
      <SiteNav />

      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-4xl">react-iron-man</h1>
          <span className="rounded-full border border-amber-500/40 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-400">
            Non-commercial
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-base text-neutral-600 dark:text-neutral-400">
          Iron Man flies around your React site, heckles your visitors, and plays catch with their real hand through the
          webcam. One component, one line.
        </p>
      </header>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50/80 p-5 dark:border-white/10 dark:bg-neutral-900/95">
        <p className="font-serif text-2xl">This page is the demo.</p>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          He&apos;s already here, in the margin. Move your cursor and he watches it; point at a link and he&apos;ll have
          something to say; scroll fast and he gets left behind. <strong className="font-medium text-neutral-900 dark:text-white">Click him</strong> to
          start a game of catch, allow the camera, and pinch your fingers right on him to grab. Press Esc to stop. For
          Batman, find the faint bat in the footer.
        </p>
      </div>

      <div className="mt-12 space-y-12">
        <Section title="Install">
          <Code>{INSTALL}</Code>
        </Section>

        <Section title="Use">
          <p>Render it once, anywhere on the page. It positions itself, so where it sits in your tree doesn&apos;t matter.</p>
          <Code>{USAGE}</Code>
          <p className="mt-6">In Next.js, put it in your root layout so he stays across pages:</p>
          <Code>{NEXT}</Code>
          <p className="mt-6">Batman is opt-in. Hide a switch somewhere for visitors to find:</p>
          <Code>{BATMAN}</Code>
        </Section>

        <Section title="Props">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-neutral-500">
                <tr className="border-b border-neutral-200 dark:border-white/10">
                  <th className="py-2 pr-4 font-medium">Prop</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Default</th>
                  <th className="py-2 font-medium">What it does</th>
                </tr>
              </thead>
              <tbody>
                {PROPS.map(([name, type, def, what]) => (
                  <tr key={name} className="border-b border-neutral-200 align-top dark:border-white/10">
                    <td className="py-2.5 pr-4"><Mono>{name}</Mono></td>
                    <td className="py-2.5 pr-4 font-mono text-xs">{type}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">{def}</td>
                    <td className="py-2.5">{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4">
            Dark mode follows a <Mono>.dark</Mono> or <Mono>[data-theme=&quot;dark&quot;]</Mono> class on any ancestor,
            usually <Mono>&lt;html&gt;</Mono>.
          </p>
        </Section>

        <Section title="What your visitors get">
          <ul className="list-disc space-y-2 pl-5">
            {DOES.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </Section>

        <Section title="Requirements">
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {REQUIRES.map(([term, detail]) => (
              <div key={term}>
                <dt className="font-medium text-neutral-900 dark:text-white">{term}</dt>
                <dd className="mt-1 text-sm">{detail}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="Privacy">
          <p>
            Hand tracking runs entirely in the visitor&apos;s browser. Camera frames never leave their device and nothing
            is recorded: the game box shows only an outline of the hand, never the video. The camera turns off the moment
            the game ends. Visitors who prefer reduced motion get a calmer Iron Man.
          </p>
        </Section>

        <Section title="Self-host the models">
          <p>
            By default the models load from jsDelivr. To serve them from your own domain, copy them out of the package
            and point <Mono>models</Mono> at them:
          </p>
          <Code>{SELF_HOST}</Code>
        </Section>

        <Section title="License and credits">
          <p>
            The code is MIT. The models are not: the{" "}
            <a className="underline underline-offset-2" href="https://sketchfab.com/3d-models/iron-man-69dde1ad49e94852984e3d83928efd65">
              Iron Man model
            </a>{" "}
            by Grant Riley is <strong className="font-medium text-neutral-900 dark:text-white">CC BY-NC 4.0, so non-commercial use only</strong>,
            and the{" "}
            <a className="underline underline-offset-2" href="https://sketchfab.com/3d-models/arkham-city-batman-648984b9b606483383260c25099d81b9">
              Batman model
            </a>{" "}
            by LKFisto1707 is CC BY 4.0. Both require credit. Paste this anywhere visible, like your footer:
          </p>
          <Code>{CREDIT}</Code>
          <p className="mt-4 text-sm">
            Iron Man and Batman are trademarks of Marvel and DC. This is an unofficial fan project, not affiliated with or
            endorsed by either.
          </p>
        </Section>
      </div>
    </main>
  );
}
