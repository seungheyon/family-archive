"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";
import { createThumbnail } from "@/lib/clientThumbnail";

interface UploadResult {
  filename: string;
  ok: boolean;
  error?: string;
}

export function UploadForm({ albumId }: { albumId?: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>("");
  const [okCount, setOkCount] = useState(0);
  const [toastKey, setToastKey] = useState(0);
  const [failures, setFailures] = useState<UploadResult[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    setSubmitting(true);
    setStatus("");
    setOkCount(0);
    setFailures([]);

    try {
      const formData = new FormData();
      if (albumId) formData.set("album_id", albumId);

      // 원본은 그대로 올리되, 썸네일과 실제 표시 크기를 함께 보내 서버가 R2를 다시 읽지
      // 않아도 되게 한다. 썸네일 생성이 실패한 파일은 인덱스만 빠지고 원본은 정상 업로드된다.
      const dimensions: { index: number; width: number; height: number }[] = [];
      for (const [index, file] of files.entries()) {
        formData.append("photos", file);
        const thumb = await createThumbnail(file);
        if (thumb) {
          formData.append(`thumb_${index}`, thumb.blob, `thumb_${index}.jpg`);
          dimensions.push({ index, width: thumb.width, height: thumb.height });
        }
      }
      formData.set("dimensions", JSON.stringify(dimensions));

      const res = await fetch("/api/photos", { method: "POST", body: formData });
      const data = (await res.json()) as { results?: UploadResult[] };
      const results = data.results ?? [];
      const succeeded = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok);
      setOkCount(succeeded);
      setFailures(failed);
      if (succeeded === 0 && failed.length > 0) {
        setStatus("업로드에 실패했어요.");
      }
      if (succeeded > 0) {
        setToastKey((k) => k + 1);
        router.refresh();
      }
    } catch {
      setStatus("업로드 중 오류가 발생했어요.");
    } finally {
      setSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-3">
      {/* 파일 선택창+업로드 버튼 2단계 대신, 버튼 하나로 선택과 동시에 바로 업로드되게 한다 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={submitting}
        onClick={() => fileInputRef.current?.click()}
        className="btn-primary"
      >
        {submitting ? "업로드 중..." : "사진 업로드"}
      </button>
      {okCount > 0 && (
        <Toast
          key={toastKey}
          message={`🎉 사진 ${okCount}장 업로드 완료!`}
          onDismiss={() => setOkCount(0)}
        />
      )}
      {status && <p className="text-sm text-muted">{status}</p>}
      {failures.length > 0 && (
        <ul className="card flex w-full flex-col gap-1 text-sm text-red-600 dark:text-red-400">
          {failures.map((f, i) => (
            <li key={i}>
              {f.filename}: {f.error ?? "알 수 없는 오류"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
