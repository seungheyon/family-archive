"use client";

import { useState } from "react";

export default function UploadPage() {
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
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
        사진 업로드
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="file"
          name="photos"
          accept="image/*"
          multiple
          required
          className="rounded-md border border-black/10 p-4 dark:border-white/10"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {submitting ? "업로드 중..." : "업로드"}
        </button>
        {status && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{status}</p>
        )}
      </form>
    </div>
  );
}
