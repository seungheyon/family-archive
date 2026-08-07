"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between border-b border-border bg-surface px-6 py-4 text-sm">
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
    </nav>
  );
}
