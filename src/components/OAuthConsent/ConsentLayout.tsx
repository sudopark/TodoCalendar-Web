import type { ReactNode } from 'react'

interface Props {
  header: ReactNode
  body: ReactNode
  actions: ReactNode
}

export function ConsentLayout({ header, body, actions }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* 상단 로고 + 서비스명 — 메인앱 TopToolbar 패턴 */}
      <div className="border-b border-line bg-surface h-16 flex items-center">
        <div className="max-w-2xl mx-auto w-full px-6 flex items-center gap-2">
          <img src="/logo-light.png" alt="To-do Calendar" className="h-7 shrink-0 dark:invert" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-fg whitespace-nowrap">
            To-do Calendar
          </span>
        </div>
      </div>

      {/* 메인 컨텐츠 — 풀 페이지 단일 컬럼 */}
      <main role="main" className="flex-1 max-w-2xl mx-auto w-full px-6 py-12 sm:py-16">
        {header && <div className="mb-12 sm:mb-14">{header}</div>}
        <div>{body}</div>
        {actions && (
          <div className="mt-12 flex flex-col-reverse sm:flex-row gap-3">{actions}</div>
        )}
      </main>
    </div>
  )
}
