"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/writing", label: "Writing" },
];

export function SiteNav() {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <nav className="mb-12 flex items-center justify-between md:mb-16">
      <div className="-ml-2.5 flex items-center gap-1">
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={`rounded-full px-2.5 py-1 text-sm transition-colors ${
              isActive(href)
                ? "text-neutral-900 dark:text-white"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
      <ThemeToggle />
    </nav>
  );
}
