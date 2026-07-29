"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/upload", label: "업로드" },
  { href: "/review", label: "앨범 정리" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-6 border-b border-black/10 px-6 py-4 text-sm dark:border-white/10">
      <Link
        href="/"
        aria-current={pathname === "/" ? "page" : undefined}
        className={`font-medium ${
          pathname === "/"
            ? "text-black underline dark:text-zinc-50"
            : "text-zinc-500 hover:text-black dark:hover:text-zinc-50"
        }`}
      >
        가족 아카이브
      </Link>
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "text-black underline dark:text-zinc-50"
                : "text-zinc-500 hover:text-black hover:underline dark:hover:text-zinc-50"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
