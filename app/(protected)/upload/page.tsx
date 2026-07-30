import type { Metadata } from "next";
import { UploadForm } from "@/components/UploadForm";

export const metadata: Metadata = {
  title: "업로드",
};

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="mb-2 text-2xl font-semibold text-foreground">
        사진 업로드
      </h1>
      <p className="mb-6 text-sm text-muted">
        여러 장을 한 번에 선택할 수 있어요. 업로드된 사진은 &quot;앨범
        정리&quot;에서 앨범으로 분류하세요.
      </p>
      <UploadForm />
    </div>
  );
}
