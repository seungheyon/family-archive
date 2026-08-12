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

export function formatMonth(iso: string) {
  const [y, m] = iso.split("-");
  return `${y}.${m}`;
}

/** 사람이 직접 지정한 기간의 정밀도. 날짜가 확실치 않을 때 월까지만 고를 수 있다 */
export type DatePrecision = "day" | "month";

export function formatDateRange(
  range: DateRange,
  precision: DatePrecision = "day",
) {
  const fmt = precision === "month" ? formatMonth : formatDate;
  const start = fmt(range.start);
  const end = fmt(range.end);
  return start === end ? start : `${start} ~ ${end}`;
}

/**
 * 화면에 보여줄 기간을 고른다.
 *
 * 사람이 직접 지정한 값이 있으면 그것이 이긴다. 없으면 지금까지처럼 사진에서 계산한 값을
 * 쓴다 — 자동분류가 채워둔 `date_start`는 사용자가 만든 앨범에서 비어 있고 사진을 옮기면
 * 실제와 어긋나서, 사람이 손대지 않은 앨범에서는 계속 신뢰하지 않는다.
 */
export function resolveAlbumDates(
  album: {
    date_start: string | null;
    date_end: string | null;
    dates_manual: boolean | null;
    date_precision: string | null;
  },
  computed: DateRange | undefined,
): { range: DateRange; precision: DatePrecision } | null {
  if (album.dates_manual && album.date_start && album.date_end) {
    return {
      range: { start: album.date_start, end: album.date_end },
      precision: album.date_precision === "month" ? "month" : "day",
    };
  }
  return computed ? { range: computed, precision: "day" } : null;
}

/** 월 단위로 고른 경우 그 달의 1일 / 말일로 채운다(정렬·기념일 판정은 계속 날짜로 동작) */
export function monthToRangeEdges(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(last).padStart(2, "0")}` };
}
