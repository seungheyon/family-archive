"use client";

import { useState } from "react";

export function CreateAlbumButton() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="btn-tinted" onClick={() => setOpen(true)}>
        새 앨범을 만들어요!
      </button>
    );
  }

  return (
    <form
      action="/api/albums"
      method="POST"
      className="flex flex-wrap items-center gap-2"
    >
      <input
        type="text"
        name="title"
        required
        autoFocus
        placeholder="새 앨범 이름"
        className="input"
      />
      <button type="submit" className="btn-primary">
        만들기
      </button>
      <button type="button" className="btn-outline" onClick={() => setOpen(false)}>
        취소
      </button>
    </form>
  );
}
