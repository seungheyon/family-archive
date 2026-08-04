/**
 * 웹 푸시 발송 (VAPID 인증, 페이로드 없음).
 *
 * 푸시에 본문을 실어 보내려면 RFC 8291의 aes128gcm 암호화를 직접 구현해야 하는데, 테스트
 * 없이 맞추기 까다로워 1차에서는 **본문 없는 푸시**만 보낸다. 브라우저는 본문 없이도 push
 * 이벤트를 받으므로, 서비스워커가 미리 정해둔 문구로 알림을 띄운다(public/sw.js).
 * 앨범 이름처럼 건건이 다른 문구가 필요해지면 그때 암호화를 얹는다.
 */

function b64urlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function bytesToB64url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importVapidKey(privateKeyD: string, publicKey: string): Promise<CryptoKey> {
  const pub = b64urlToBytes(publicKey);
  // 비압축 P-256 포인트(0x04 + X(32) + Y(32))에서 좌표를 떼어내 JWK로 조립한다
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: privateKeyD,
    x: bytesToB64url(pub.slice(1, 33)),
    y: bytesToB64url(pub.slice(33, 65)),
    ext: true,
  };
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

/** VAPID JWT(ES256) 생성 — 푸시 서비스에 "이 발신자가 맞다"를 증명한다 */
async function createVapidJwt(
  audience: string,
  subject: string,
  key: CryptoKey,
): Promise<string> {
  const header = bytesToB64url(
    new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })),
  );
  const payload = bytesToB64url(
    new TextEncoder().encode(
      JSON.stringify({
        aud: audience,
        // 규격상 24시간을 넘기면 안 된다 — 여유를 두고 12시간으로 잡는다
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: subject,
      }),
    ),
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  );

  return `${header}.${payload}.${bytesToB64url(signature)}`;
}

export interface PushSubscriptionRecord {
  endpoint: string;
}

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export interface PushResult {
  endpoint: string;
  status: number;
  /** 구독이 만료·해지된 경우(404/410) — 정리 대상 */
  gone: boolean;
}

export async function sendPush(
  subscription: PushSubscriptionRecord,
  vapid: VapidConfig,
): Promise<PushResult> {
  const audience = new URL(subscription.endpoint).origin;
  const key = await importVapidKey(vapid.privateKey, vapid.publicKey);
  const jwt = await createVapidJwt(audience, vapid.subject, key);

  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      TTL: "86400",
      Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
      // 본문이 없으므로 Content-Length는 0
      "Content-Length": "0",
    },
  });

  return {
    endpoint: subscription.endpoint,
    status: res.status,
    gone: res.status === 404 || res.status === 410,
  };
}
