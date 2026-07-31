"use client";

export function DeleteButton({
  label = "삭제",
  confirmMessage = "정말 삭제할까요? 되돌릴 수 없어요.",
  className,
}: {
  label?: string;
  confirmMessage?: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
      className={className ?? "btn-danger"}
    >
      {label}
    </button>
  );
}
