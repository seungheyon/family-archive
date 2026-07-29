"use client";

export function DeleteButton({
  label = "삭제",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm("정말 삭제할까요? 되돌릴 수 없어요.")) {
          e.preventDefault();
        }
      }}
      className={
        className ??
        "rounded-full border border-black/10 px-3 py-1 text-sm text-red-600 dark:border-white/10 dark:text-red-400"
      }
    >
      {label}
    </button>
  );
}
