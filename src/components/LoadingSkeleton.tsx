interface Props { lines?: number; className?: string }

// 라우트 폴백으로 쓰이므로 본문이 앉을 칼럼을 미리 잡는다 — 컨테이너가 없으면
// 바가 뷰포트 좌상단에 붙어, 화면이 도착하는 순간 통째로 자리를 옮긴다.
export function LoadingSkeleton({ lines = 3, className = '' }: Props) {
  return (
    <div className={`mx-auto w-full max-w-3xl animate-pulse space-y-3 px-6 py-10 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-4 rounded bg-surface-sunken" style={{ width: `${Math.max(30, 85 - i * 10)}%` }} />
      ))}
    </div>
  )
}
