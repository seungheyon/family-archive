import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/session";

/**
 * app/api/* 라우트는 (protected) 레이아웃의 인증 게이트를 거치지 않으므로
 * (레이아웃은 페이지 렌더링에만 적용됨), 상태를 바꾸거나 사진을 서빙하는
 * 모든 Route Handler는 이 함수로 직접 세션을 확인해야 한다.
 */
export async function isAuthenticated(sessionSecret: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  return verifySessionToken(token, sessionSecret);
}
