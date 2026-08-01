"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-surface text-sm">
      <div className="mx-auto flex max-w-3xl items-center gap-6 px-6 py-4">
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
        <ThemeSwitcher />
      </div>
    </nav>
  );
}
