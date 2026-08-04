import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 같은 이름의 앨범이 이미 있는지 확인한다.
 *
 * DB에 unique 제약을 거는 방법도 있지만, 이미 같은 이름의 앨범이 존재하는 상태였어서
 * (2026-08-04에 빈 쪽 하나를 정리) 앱 레벨에서 막는 쪽을 택했다. 대소문자/앞뒤 공백만
 * 다른 것도 같은 이름으로 본다 — 사람 눈에 구분이 안 되는 이름이 둘 생기는 게 문제이므로.
 */
export async function findDuplicateAlbumTitle(
  supabase: SupabaseClient,
  title: string,
  excludeId?: string,
): Promise<boolean> {
  const normalized = title.trim();
  if (!normalized) return false;

  let query = supabase.from("albums").select("id").ilike("title", normalized);
  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query.returns<{ id: string }[]>();
  return (data ?? []).length > 0;
}

export const DUPLICATE_TITLE_MESSAGE = "같은 이름의 앨범이 이미 있어요.";
