const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30일

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return toHex(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export type SessionRole = "admin" | "family";

export interface Session {
  role: SessionRole;
}

export async function createSessionToken(
  secret: string,
  role: SessionRole,
): Promise<string> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const payload = `${expiresAt}.${role}`;
  const sig = await hmacHex(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
): Promise<Session | null> {
  if (!token) return null;
  const [expiresAtRaw, role, sig] = token.split(".");
  if (!expiresAtRaw || !role || !sig) return null;

  const payload = `${expiresAtRaw}.${role}`;
  const expected = await hmacHex(secret, payload);
  if (!timingSafeEqual(sig, expected)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  if (role !== "admin" && role !== "family") return null;

  return { role };
}
