"use client";

import { useState } from "react";
import { UploadForm } from "@/components/UploadForm";

export function QuickUploadButton() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="btn-tinted" onClick={() => setOpen(true)}>
        앨범 없이 사진만 추가할래요!
      </button>
    );
  }

  return (
    <div className="card w-full">
      <UploadForm />
      <button
        type="button"
        className="btn-outline mt-2"
        onClick={() => setOpen(false)}
      >
        닫기
      </button>
    </div>
  );
}
