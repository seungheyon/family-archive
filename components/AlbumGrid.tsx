"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { photoItem, photoStagger } from "@/lib/motion";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";
import { DOTS_ICON_HTML } from "@/components/DotsIcon";
import { UploadForm } from "@/components/UploadForm";

interface Photo {
  id: string;
  width?: number;
  height?: number;
  hasThumb?: boolean;
}

const FALLBACK_DIMENSION = 1600;

interface AlbumOption {
  id: string;
  title: string;
}

const LONG_PRESS_MS = 400;

export function AlbumGrid({
  photos,
  albums,
  admin,
  albumId,
  emptyMessage = "이 앨범엔 아직 사진이 없어요.",
}: {
  photos: Photo[];
  albums: AlbumOption[];
  admin: boolean;
  albumId?: string;
  emptyMessage?: string;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<PhotoSwipeLightbox | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const suppressNextClick = useRef(false);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [movePickerOpen, setMovePickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelected(new Set());
    setMovePickerOpen(false);
  }, []);

  // PhotoSwipe는 선택 모드가 아닐 때만 초기화 — 선택 모드에서는 탭이 선택 토글로만 동작해야 함
  useEffect(() => {
    const container = containerRef.current;
    if (!container || selectionMode) return;

    const lightbox = new PhotoSwipeLightbox({
      gallery: container,
      children: "a",
      pswpModule: () => import("photoswipe"),
      // 마우스 클릭 경로: 사진 바깥 어두운 배경을 클릭하면 닫는다.
      bgClickAction: "close",
      // 터치 경로: PhotoSwipe는 탭을 bgClick이 아니라 tapAction으로만 처리하고,
      // 기본값이 'toggle-controls'라 배경을 탭해도 닫히지 않았다(라이브러리 소스 확인).
      // 탭 지점이 사진(.pswp__img)이 아니면 닫고, 사진 위면 기존처럼 컨트롤을 토글한다.
      tapAction: (_point, originalEvent) => {
        const target = originalEvent.target as HTMLElement | null;
        const pswp = lightboxRef.current?.pswp;
        if (target && !target.classList.contains("pswp__img")) {
          pswp?.close();
          return;
        }
        pswp?.element?.classList.toggle("pswp--ui-visible");
      },
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

  // 선택 모드에서 사진/툴바가 아닌 곳을 탭하면 선택 해제. 문서 전체에 걸어야
  // 앨범 프레임 바깥(미분류 페이지의 상단 안내문 등)을 탭해도 해제된다.
  useEffect(() => {
    if (!selectionMode) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-photo-id]") || target.closest("[data-selection-ui]")) {
        return;
      }
      exitSelectionMode();
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [selectionMode, exitSelectionMode]);

  // 라이트박스 위에 뜨는 팝업이라 앱 테마(라이트/다크)를 따라가지 않고 항상 밝은 배경으로 고정 —
  // 사진 위 오버레이는 일관된 대비가 테마 일치보다 중요하다고 판단(상단바와 동일한 방침).
  function styleFloatingMenu(el: HTMLDivElement, rect: DOMRect) {
    el.style.position = "fixed";
    el.style.top = `${rect.bottom + 4}px`;
    el.style.right = `${window.innerWidth - rect.right}px`;
    // PhotoSwipe 루트 자체가 z-index:100000(--pswp-root-z-index)이라, 그보다 낮으면
    // 사진 레이어 뒤에 가려지고 클릭도 사진 쪽으로 먹힌다. 확실히 더 높게 잡는다.
    el.style.zIndex = "100010";
    el.style.display = "flex";
    el.style.flexDirection = "column";
    el.style.gap = "4px";
    el.style.padding = "8px";
    el.style.borderRadius = "12px";
    el.style.background = "#fbf6ec";
    el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.25)";
  }

  function floatingMenuButton(label: string, danger = false): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.whiteSpace = "nowrap";
    b.style.borderRadius = "9999px";
    b.style.padding = "8px 16px";
    b.style.fontSize = "14px";
    b.style.border = "1px solid #e5e5e5";
    b.style.background = "#fbf6ec";
    b.style.color = danger ? "#dc2626" : "#22262b";
    return b;
  }

  function openPhotoMenu(photoId: string, anchorEl: HTMLElement) {
    document.getElementById("pswp-photo-menu")?.remove();

    const menu = document.createElement("div");
    menu.id = "pswp-photo-menu";
    const rect = anchorEl.getBoundingClientRect();
    styleFloatingMenu(menu, rect);

    const moveBtn = floatingMenuButton("다른 앨범으로 이동");
    moveBtn.onclick = () => {
      menu.remove();
      const sub = document.createElement("div");
      styleFloatingMenu(sub, rect);
      albums.forEach((a) => {
        const b = floatingMenuButton(a.title);
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

    const deleteBtn = floatingMenuButton("삭제", true);
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

  async function movePhotos(ids: string[], targetAlbumId: string) {
    setBusy(true);
    try {
      await fetch("/api/photos/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "move", ids, albumId: targetAlbumId }),
      });
      exitSelectionMode();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function moveToNewAlbum(ids: string[]) {
    const title = prompt("새 앨범 이름을 입력해 주세요.");
    if (title === null) return;
    if (!title.trim()) {
      alert("앨범 이름을 입력해 주세요.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/photos/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "move-to-new-album", ids, title }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(data.error ?? "앨범을 만들지 못했어요.");
        return;
      }
      exitSelectionMode();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deletePhotos(ids: string[]) {
    setBusy(true);
    try {
      await fetch("/api/photos/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids }),
      });
      exitSelectionMode();
      router.refresh();
    } finally {
      setBusy(false);
    }
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
    if (pressTimer.current) clearTimeout(pressTimer.current);
    // 이미 선택 모드면 롱프레스를 아예 걸지 않는다. 예전에는 여기서 선택 목록을
    // [방금 누른 것] 하나로 덮어써서, 여러 장 고르는 중 조금 오래 누르면 그때까지
    // 고른 게 전부 풀리는 버그가 있었다.
    if (selectionMode) return;
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      suppressNextClick.current = true;
      setSelectionMode(true);
      setSelected(new Set([id]));
    }, LONG_PRESS_MS);
  }

  function cancelPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }

  function handleThumbClick(e: React.MouseEvent, id: string) {
    if (suppressNextClick.current) {
      // 롱프레스로 방금 선택 모드에 진입했으면, 손을 뗄 때 따라오는 클릭은 무시
      suppressNextClick.current = false;
      e.preventDefault();
      return;
    }
    if (selectionMode) {
      e.preventDefault();
      toggleSelected(id);
    }
    // 선택 모드가 아니면 기본 동작(PhotoSwipe 오픈)을 그대로 둔다
  }

  const allSelected = photos.length > 0 && selected.size === photos.length;

  return (
    <div className="album-frame">
      {/* 펼쳐진 뒤 내지 사진들이 순차적으로 나타난다(스킬 명세: 50~100ms 간격) */}
      <motion.div
        ref={containerRef}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
        variants={photoStagger}
        initial="hidden"
        animate="visible"
      >
        {photos.map((photo) => (
          <motion.a
            key={photo.id}
            variants={photoItem}
            whileHover={{ y: -4, scale: 1.03 }}
            href={`/api/photos/${photo.id}/file`}
            data-photo-id={photo.id}
            data-pswp-width={photo.width ?? FALLBACK_DIMENSION}
            data-pswp-height={photo.height ?? FALLBACK_DIMENSION}
            className={`photo-slot ${
              selectionMode && selected.has(photo.id)
                ? "ring-4 ring-accent"
                : ""
            }`}
            onMouseDown={() => startPress(photo.id)}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={() => startPress(photo.id)}
            onTouchEnd={cancelPress}
            onTouchMove={cancelPress}
            onClick={(e) => handleThumbClick(e, photo.id)}
            onContextMenu={(e) => e.preventDefault()}
            style={{ WebkitTouchCallout: "none", userSelect: "none" }}
          >
            {/* 그리드에는 썸네일만 내려받는다. 썸네일이 없는 예전 사진은 서버가 원본으로
                폴백하므로 URL은 동일하게 유지해도 안전하다. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photos/${photo.id}/file?variant=thumb`}
              alt=""
              loading="lazy"
              decoding="async"
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
          </motion.a>
        ))}
      </motion.div>

      {photos.length === 0 && (
        <p className="mt-4 text-sm text-muted">{emptyMessage}</p>
      )}

      {/* 사진 목록보다 먼저 업로드 영역이 큰 자리를 차지하지 않도록 목록 아래, 버튼 하나로 축약.
          미분류 사진 페이지처럼 특정 앨범이 없는 곳에서는 업로드 자체를 노출하지 않는다. */}
      {albumId && (
        <div className="mt-6">
          <UploadForm albumId={albumId} />
        </div>
      )}

      {selectionMode && (
        <div
          data-selection-ui
          className="card fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center gap-2"
        >
          <span className="text-sm text-muted">{selected.size}장 선택됨</span>
          <button
            type="button"
            className="btn-outline"
            disabled={busy}
            onClick={() =>
              setSelected(allSelected ? new Set() : new Set(photos.map((p) => p.id)))
            }
          >
            {allSelected ? "전체 해제" : "전체 선택"}
          </button>
          <button
            type="button"
            className="btn-outline"
            disabled={selected.size === 0 || busy}
            onClick={() => setMovePickerOpen((v) => !v)}
          >
            이동
          </button>
          <button
            type="button"
            className="btn-outline"
            disabled={selected.size === 0 || busy}
            onClick={() => moveToNewAlbum([...selected])}
          >
            새 앨범으로
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
            <div
              data-selection-ui
              className="card absolute bottom-full left-0 mb-2 flex flex-col gap-1"
            >
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
