import Link from "next/link";

export function Nav() {
  return (
    <nav className="flex items-center gap-6 border-b border-black/10 px-6 py-4 text-sm dark:border-white/10">
      <Link href="/" className="font-medium text-black dark:text-zinc-50">
        가족 아카이브
      </Link>
      <Link
        href="/upload"
        className="text-zinc-500 hover:text-black hover:underline dark:hover:text-zinc-50"
      >
        업로드
      </Link>
      <Link
        href="/review"
        className="text-zinc-500 hover:text-black hover:underline dark:hover:text-zinc-50"
      >
        앨범 정리
      </Link>
    </nav>
  );
}
