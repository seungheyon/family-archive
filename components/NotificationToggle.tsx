"use client";

import { useEffect, useState } from "react";

type State = "unsupported" | "checking" | "off" | "on" | "denied" | "working";

/** base64url VAPID 공개키를 PushManager가 요구하는 바이트 버퍼로 변환 */
function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

export function NotificationToggle({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  async function enable() {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToBuffer(vapidPublicKey),
        }));

      const json = subscription.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      });

      setState(res.ok ? "on" : "off");
    } catch {
      setState("off");
    }
  }

  async function disable() {
    setState("working");
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
    }
  }

  if (state === "checking" || state === "unsupported") return null;

  if (state === "denied") {
    return (
      <p className="text-xs text-muted">
        알림이 차단되어 있어요. 브라우저 사이트 설정에서 알림을 허용해 주세요.
      </p>
    );
  }

  return (
    <button
      type="button"
      className="btn-tinted"
      disabled={state === "working"}
      onClick={state === "on" ? disable : enable}
    >
      {state === "working"
        ? "설정 중..."
        : state === "on"
          ? "추억 알림 끄기"
          : "추억 알림 받기"}
    </button>
  );
}
