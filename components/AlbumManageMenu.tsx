"use client";

import { useEffect, useRef, useState } from "react";
import { AlbumTitleForm } from "@/components/AlbumTitleForm";
import { DeleteButton } from "@/components/DeleteButton";

interface AlbumOption {
  id: string;
  title: string;
}

export function AlbumManageMenu({
  albumId,
  initialTitle,
  otherAlbums,
  admin,
}: {
  albumId: string;
  initialTitle: string;
  otherAlbums: AlbumOption[];
  admin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="앨범 관리"
        title="앨범 관리"
        className="btn-outline px-3"
      >
        ⋮
      </button>
      {open && (
        <div className="card absolute right-0 top-12 z-20 flex w-72 flex-col gap-3 p-3">
          <div>
            <p className="mb-1 text-xs text-muted">앨범 이름 변경</p>
            <AlbumTitleForm albumId={albumId} initialTitle={initialTitle} />
          </div>

          {admin && otherAlbums.length > 0 && (
            <form
              action={`/api/albums/${albumId}/merge`}
              method="POST"
              className="flex flex-wrap items-center gap-2"
            >
              <select name="target_album_id" required defaultValue="" className="select">
                <option value="" disabled hidden>
                  합칠 앨범 선택
                </option>
                {otherAlbums.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                title="이 앨범의 사진을 선택한 앨범으로 옮기고, 이 앨범은 삭제해요"
                className="btn-outline"
              >
                합치기
              </button>
            </form>
          )}

          {admin && (
            <form action={`/api/albums/${albumId}/delete`} method="POST">
              <DeleteButton
                label="앨범 삭제"
                confirmMessage="앨범을 삭제할까요? 사진은 지워지지 않고 미분류로 남아요."
                className="btn-danger w-full"
              />
            </form>
          )}
        </div>
      )}
    </div>
  );
}
