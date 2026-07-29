export interface PhotoForClustering {
  id: string;
  taken_at: string;
}

export interface PhotoCluster {
  photoIds: string[];
  dateStart: string;
  dateEnd: string;
}

/**
 * 촬영일자 간격이 gapDays를 넘으면 새 앨범 후보로 분리한다.
 * EXIF 촬영일자가 있는 사진만 대상(호출부에서 필터링).
 */
export function clusterPhotosByDate(
  photos: PhotoForClustering[],
  gapDays = 3,
): PhotoCluster[] {
  const sorted = [...photos].sort(
    (a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime(),
  );

  const clusters: PhotoCluster[] = [];
  let current: PhotoForClustering[] = [];

  const flush = () => {
    if (current.length === 0) return;
    clusters.push({
      photoIds: current.map((p) => p.id),
      dateStart: current[0].taken_at.slice(0, 10),
      dateEnd: current[current.length - 1].taken_at.slice(0, 10),
    });
    current = [];
  };

  for (const photo of sorted) {
    if (current.length === 0) {
      current = [photo];
      continue;
    }
    const prev = current[current.length - 1];
    const gapMs =
      new Date(photo.taken_at).getTime() - new Date(prev.taken_at).getTime();
    const gapDaysActual = gapMs / (1000 * 60 * 60 * 24);

    if (gapDaysActual > gapDays) {
      flush();
      current = [photo];
    } else {
      current.push(photo);
    }
  }
  flush();

  return clusters;
}
