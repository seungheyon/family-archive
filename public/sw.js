/* 가족 아카이브 알림용 서비스워커 */

// 서버가 보내는 푸시에는 본문이 없다(lib/webpush.ts 참고). 문구는 여기서 정한다 —
// 앨범 이름처럼 건건이 다른 내용이 필요해지면 푸시 본문 암호화를 얹고 여기서 읽으면 된다.
const DEFAULT_TITLE = "가족 아카이브";
const DEFAULT_BODY = "[테스트] 작년 오늘의 추억이 있어요. 보러 갈까요?";

self.addEventListener("push", (event) => {
  let title = DEFAULT_TITLE;
  let body = DEFAULT_BODY;

  // 나중에 본문을 실어 보내게 되면 여기서 자연스럽게 받아쓴다
  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.title || title;
      body = payload.body || body;
    } catch {
      const text = event.data.text();
      if (text) body = text;
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "family-archive-anniversary",
      data: { url: "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  // 이미 열린 탭이 있으면 그쪽으로 보내고, 없으면 새로 연다
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});
