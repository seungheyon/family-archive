"use client";

import { useState } from "react";

export function UploadForm() {
  const [status, setStatus] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setSubmitting(true);
    setStatus("업로드 중...");

    try {
      const res = await fetch("/api/photos", { method: "POST", body: formData });
      const data = (await res.json()) as {
        results?: Array<{ filename: string; ok: boolean; error?: string }>;
      };
      const okCount = data.results?.filter((r) => r.ok).length ?? 0;
      const failCount = (data.results?.length ?? 0) - okCount;
      setStatus(
        `완료: ${okCount}장 성공${failCount > 0 ? `, ${failCount}장 실패` : ""}`,
      );
      form.reset();
    } catch {
      setStatus("업로드 중 오류가 발생했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="file"
        name="photos"
        accept="image/*"
        multiple
        required
        className="card"
      />
      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? "업로드 중..." : "업로드"}
      </button>
      {status && <p className="text-sm text-muted">{status}</p>}
    </form>
  );
}
