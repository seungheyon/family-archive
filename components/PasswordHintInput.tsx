"use client";

import { useRef, useState } from "react";

export function PasswordHintInput() {
  const [showHint, setShowHint] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleFocus() {
    setShowHint(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowHint(false), 5000);
  }

  return (
    <div className="relative">
      <input
        type="password"
        name="password"
        placeholder="비밀번호 (숫자 4자)를 입력해 주세요"
        required
        autoFocus
        onFocus={handleFocus}
        onClick={handleFocus}
        className="input"
      />
      {showHint && (
        // 모바일(카드가 화면 폭을 거의 다 채움)은 옆에 놓을 공간이 없어 기존처럼 아래로 밀어내고,
        // sm 이상에서는 카드 오른쪽 여백에 절대 위치시켜 제목/버튼을 침범하지 않게 한다.
        <div className="toast-bubble mt-2 w-fit text-xs sm:absolute sm:left-full sm:top-1/2 sm:mt-0 sm:ml-3 sm:w-40 sm:-translate-y-1/2">
          💡 힌트: 정현승현 생일
        </div>
      )}
    </div>
  );
}
