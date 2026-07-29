"use client";

import { useState } from "react";

export function AlbumTitleForm({
  albumId,
  initialTitle,
}: {
  albumId: string;
  initialTitle: string;
}) {
  const [value, setValue] = useState(initialTitle);
  const dirty = value.trim().length > 0 && value.trim() !== initialTitle;

  return (
    <form
      action={`/api/albums/${albumId}`}
      method="POST"
      className="flex items-center gap-2"
    >
      <input
        type="text"
        name="title"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 rounded-md border border-black/10 bg-transparent px-2 py-1 dark:border-white/10"
      />
      <button
        type="submit"
        disabled={!dirty}
        title={dirty ? "변경한 이름 저장" : "이름을 바꾸면 저장할 수 있어요"}
        className="rounded-full border border-black/10 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
      >
        저장
      </button>
    </form>
  );
}
