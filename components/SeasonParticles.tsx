import { PARTICLE_COUNT, type Season } from "@/lib/season";

/**
 * 계절마다 화면을 가로질러 떠다니는 요소(벚꽃잎·햇살 반짝임·낙엽·눈).
 *
 * 서버에서 그대로 그려 내려보내는 정적 마크업이다 — 클라이언트 JS 없이 CSS 애니메이션만
 * 쓰므로 번들이 늘지 않고, 애니메이션 대상도 transform/opacity로만 제한해 저사양 폰에서
 * 리플로우가 생기지 않는다. 개수도 14개로 묶어 발열·배터리 부담을 억제했다.
 *
 * `left`는 퍼센트로만 배치하고 컨테이너에 overflow:hidden을 둬서, 입자가 화면 밖으로
 * 나가며 가로 스크롤을 만드는 일(이전에 겪은 화면 밀림)이 생기지 않게 한다.
 */
export function SeasonParticles({ season }: { season: Season }) {
  // 규칙적으로 흩어지되 매번 같은 자리에 나오도록 결정적으로 계산한다
  // (서버·클라이언트 렌더 결과가 달라지면 hydration 경고가 난다)
  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const left = ((i * 37) % 100) + (i % 3) * 0.7;
    const delay = (i * 1.7) % 12;
    const duration = 11 + ((i * 5) % 9);
    const scale = 0.6 + ((i * 13) % 7) / 10;
    const drift = ((i % 5) - 2) * 22;
    return { left, delay, duration, scale, drift, i };
  });

  return (
    <div className="season-particles" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.i}
          className={`season-particle season-particle-${season}`}
          style={
            {
              left: `${p.left}%`,
              animationDelay: `-${p.delay}s`,
              animationDuration: `${p.duration}s`,
              "--particle-scale": p.scale,
              "--particle-drift": `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
