"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";
import { DOTS_ICON_HTML } from "@/components/DotsIcon";

interface Photo {
  id: string;
  width?: number;
  height?: number;
}

const FALLBACK_DIMENSION = 1600;

interface AlbumOption {
  id: string;
  title: string;
}

const LONG_PRESS_MS = 500;

export function AlbumGrid({
  photos,
  albums,
  admin,
}: {
  photos: Photo[];
  albums: AlbumOption[];
  admin: boolean;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<PhotoSwipeLightbox | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [movePickerOpen, setMovePickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // PhotoSwipe는 선택 모드가 아닐 때만 초기화 — 선택 모드에서는 탭이 선택 토글로만 동작해야 함
  useEffect(() => {
    const container = containerRef.current;
    if (!container || selectionMode) return;

    const lightbox = new PhotoSwipeLightbox({
      gallery: container,
      children: "a",
      pswpModule: () => import("photoswipe"),
    });

    lightbox.on("uiRegister", () => {
      lightbox.pswp?.ui?.registerElement({
        name: "manage-button",
        ariaLabel: "사진 관리",
        order: 9,
        isButton: true,
        appendTo: "bar",
        html: DOTS_ICON_HTML,
        onClick: (_e, el) => {
          const pswp = lightbox.pswp;
          const currEl = pswp?.currSlide?.data?.element as HTMLElement | undefined;
          const photoId = currEl?.dataset.photoId;
          if (photoId) openPhotoMenu(photoId, el);
        },
      });
    });

    lightbox.init();
    lightboxRef.current = lightbox;

    return () => {
      lightbox.destroy();
      lightboxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionMode, photos.length]);

  function openPhotoMenu(photoId: string, anchorEl: HTMLElement) {
    document.getElementById("pswp-photo-menu")?.remove();

    const menu = document.createElement("div");
    menu.id = "pswp-photo-menu";
    menu.className = "card absolute z-[10000] flex flex-col gap-1 p-2 text-sm";
    const rect = anchorEl.getBoundingClientRect();
    menu.style.position = "fixed";
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;

    const moveBtn = document.createElement("button");
    moveBtn.type = "button";
    moveBtn.className = "btn-outline";
    moveBtn.textContent = "다른 앨범으로 이동";
    moveBtn.onclick = () => {
      menu.remove();
      const sub = document.createElement("div");
      sub.className = "card absolute z-[10000] flex flex-col gap-1 p-2 text-sm";
      sub.style.position = "fixed";
      sub.style.top = `${rect.bottom + 4}px`;
      sub.style.right = `${window.innerWidth - rect.right}px`;
      albums.forEach((a) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn-outline";
        b.textContent = a.title;
        b.onclick = async () => {
          sub.remove();
          await movePhotos([photoId], a.id);
          lightboxRef.current?.pswp?.close();
        };
        sub.appendChild(b);
      });
      document.body.appendChild(sub);
      setTimeout(() => document.addEventListener("click", () => sub.remove(), { once: true }), 0);
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-danger";
    deleteBtn.textContent = "삭제";
    deleteBtn.style.display = admin ? "" : "none";
    deleteBtn.onclick = async () => {
      menu.remove();
      if (!confirm("정말 삭제할까요? 되돌릴 수 없어요.")) return;
      await deletePhotos([photoId]);
      lightboxRef.current?.pswp?.close();
    };

    menu.appendChild(moveBtn);
    menu.appendChild(deleteBtn);
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener("click", () => menu.remove(), { once: true }), 0);
  }

  async function movePhotos(ids: string[], albumId: string) {
    setBusy(true);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/photos/${id}/assign`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ album_id: albumId }),
          }),
        ),
      );
      exitSelectionMode();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deletePhotos(ids: string[]) {
    setBusy(true);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/photos/${id}/delete`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ redirect_to: window.location.pathname }),
          }),
        ),
      );
      exitSelectionMode();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelected(new Set());
    setMovePickerOpen(false);
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startPress(id: string) {
    longPressFired.current = false;
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setSelectionMode(true);
      setSelected(new Set([id]));
    }, LONG_PRESS_MS);
  }

  function cancelPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }

  function handleThumbClick(e: React.MouseEvent, id: string) {
    if (longPressFired.current) {
      // 롱프레스가 이미 발동했으면 이번 클릭(눌렀다 뗄 때 같이 발생)은 무시
      longPressFired.current = false;
      e.preventDefault();
      return;
    }
    if (selectionMode) {
      e.preventDefault();
      toggleSelected(id);
    }
    // 선택 모드가 아니면 기본 동작(PhotoSwipe 오픈)을 그대로 둔다
  }

  return (
    <div>
      <div
        ref={containerRef}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
      >
        {photos.map((photo) => (
          <a
            key={photo.id}
            href={`/api/photos/${photo.id}/file`}
            data-photo-id={photo.id}
            data-pswp-width={photo.width ?? FALLBACK_DIMENSION}
            data-pswp-height={photo.height ?? FALLBACK_DIMENSION}
            className={`relative block ${
              selectionMode && selected.has(photo.id)
                ? "ring-4 ring-accent"
                : ""
            }`}
            onMouseDown={() => startPress(photo.id)}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={() => startPress(photo.id)}
            onTouchEnd={cancelPress}
            onClick={(e) => handleThumbClick(e, photo.id)}
            onContextMenu={(e) => e.preventDefault()}
            style={{ WebkitTouchCallout: "none", userSelect: "none" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photos/${photo.id}/file`}
              alt=""
              loading="lazy"
              draggable={false}
              className="aspect-square w-full rounded-md object-cover"
            />
            {selectionMode && (
              <span
                className={`absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs ${
                  selected.has(photo.id)
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-white bg-black/40 text-white"
                }`}
              >
                {selected.has(photo.id) ? "✓" : ""}
              </span>
            )}
          </a>
        ))}
      </div>

      {selectionMode && (
        <div className="card fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center gap-2">
          <span className="text-sm text-muted">{selected.size}장 선택됨</span>
          <button
            type="button"
            className="btn-outline"
            disabled={selected.size === 0 || busy}
            onClick={() => setMovePickerOpen((v) => !v)}
          >
            이동
          </button>
          {admin && (
            <button
              type="button"
              className="btn-danger"
              disabled={selected.size === 0 || busy}
              onClick={() => {
                if (confirm(`선택한 사진 ${selected.size}장을 삭제할까요? 되돌릴 수 없어요.`)) {
                  deletePhotos([...selected]);
                }
              }}
            >
              삭제
            </button>
          )}
          <button type="button" className="btn-outline" onClick={exitSelectionMode}>
            취소
          </button>
          {movePickerOpen && (
            <div className="card absolute bottom-full left-0 mb-2 flex flex-col gap-1">
              {albums.length === 0 && (
                <span className="text-sm text-muted">이동할 앨범이 없어요.</span>
              )}
              {albums.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="btn-outline"
                  onClick={() => movePhotos([...selected], a.id)}
                >
                  {a.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
