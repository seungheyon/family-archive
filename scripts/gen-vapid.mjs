import { webcrypto } from "node:crypto";

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const pair = await webcrypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);

// 공개키는 웹푸시 규격상 비압축 P-256 포인트(65바이트)로 전달한다
const rawPublic = await webcrypto.subtle.exportKey("raw", pair.publicKey);
// 개인키는 Worker에서 다시 import하기 쉽도록 JWK의 d 값만 저장한다
const jwk = await webcrypto.subtle.exportKey("jwk", pair.privateKey);

console.log("VAPID_PUBLIC_KEY=" + b64url(rawPublic));
console.log("VAPID_PRIVATE_KEY=" + jwk.d);
