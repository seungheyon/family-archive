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
        <div className="toast-bubble absolute left-0 top-full z-10 mt-2 text-xs">
          💡 힌트: 정현승현 생일
        </div>
      )}
    </div>
  );
}
