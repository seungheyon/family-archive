/**
 * 앨범을 눌렀을 때 서버 응답(약 1초, 대부분 Worker/Next.js 자체 기본 응답시간)을 기다리는
 * 동안 빈 화면에 멈춰 있지 않도록 같은 모양의 뼈대를 먼저 보여준다. 절대 시간이 줄지는
 * 않지만 "눌렀는데 반응이 없다"는 느낌이 사라진다.
 */
export default function AlbumDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-4 h-5 w-24 animate-pulse rounded bg-black/10 dark:bg-white/10" />

      <div className="mb-8 flex items-center justify-between gap-2">
        <div className="h-8 w-56 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="h-10 w-14 shrink-0 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
      </div>

      <div className="album-frame">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="photo-slot">
              <div className="aspect-square w-full animate-pulse rounded-md bg-black/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
