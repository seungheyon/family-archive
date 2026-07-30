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
    <nav className="flex items-center gap-6 border-b border-border bg-surface px-6 py-4 text-sm">
      <Link
        href="/"
        aria-current={pathname === "/" ? "page" : undefined}
        className={`font-semibold ${
          pathname === "/"
            ? "text-accent"
            : "text-foreground hover:text-accent"
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
                ? "font-medium text-accent underline underline-offset-4"
                : "text-muted hover:text-accent"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
