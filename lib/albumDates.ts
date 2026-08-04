export interface PhotoDateRow {
  album_id: string | null;
  taken_at: string | null;
  uploaded_at: string | null;
}

export interface DateRange {
  start: string;
  end: string;
}

/**
 * 앨범별 날짜 범위를 사진에서 직접 계산한다.
 *
 * `albums.date_start`/`date_end`는 자동분류로 만들어진 앨범에만 채워지고, 사용자가 직접
 * 만든 앨범은 비어 있다 — 그래서 어떤 앨범은 날짜가 보이고 어떤 앨범은 안 보였다. 또 사진을
 * 다른 앨범으로 옮기면 그 값이 실제와 어긋나기도 한다. 저장된 값을 신뢰하는 대신 매번
 * 사진에서 계산하면 두 문제가 함께 사라진다.
 *
 * 촬영일자(EXIF)가 없는 사진은 업로드 시각으로 대체한다 — 카톡으로 받은 사진처럼 EXIF가
 * 지워진 경우가 흔해서, 그런 앨범이 통째로 날짜 없음으로 빠지는 걸 막는다.
 */
export function buildAlbumDateRanges(
  rows: PhotoDateRow[],
): Map<string, DateRange> {
  const ranges = new Map<string, DateRange>();

  for (const row of rows) {
    if (!row.album_id) continue;
    const raw = row.taken_at ?? row.uploaded_at;
    if (!raw) continue;
    const day = raw.slice(0, 10);

    const current = ranges.get(row.album_id);
    if (!current) {
      ranges.set(row.album_id, { start: day, end: day });
      continue;
    }
    if (day < current.start) current.start = day;
    if (day > current.end) current.end = day;
  }

  return ranges;
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${y}.${m}.${d}`;
}

export function formatDateRange(range: DateRange) {
  return range.start === range.end
    ? formatDate(range.start)
    : `${formatDate(range.start)} ~ ${formatDate(range.end)}`;
}
