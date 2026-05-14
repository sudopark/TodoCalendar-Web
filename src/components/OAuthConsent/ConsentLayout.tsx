import type { ReactNode } from 'react'

interface Props {
  header: ReactNode
  body: ReactNode
  actions: ReactNode
}

export function ConsentLayout({ header, body, actions }: Props) {
  return (
    <main role="main" className="min-h-screen flex flex-col bg-surface">
      {/* 상단 wordmark — 외부 사용자에게 본 앱 브랜드 식별 신호 */}
      <div className="flex h-12 items-center border-b border-line bg-surface px-4">
        <span className="text-sm font-bold text-fg">TodoCalendar</span>
      </div>

      {/* 중앙 카드 */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-surface-elevated rounded-2xl shadow-md overflow-hidden border border-line">
            {/* 브랜드 thin bar — 카드 상단 시각 시그니처 */}
            <div className="h-1 bg-brand" aria-hidden />
            <div className="p-6 sm:p-8">
              {header && <div className="mb-6">{header}</div>}
              <div className="mb-6">{body}</div>
              {actions && (
                <div className="flex flex-col-reverse sm:flex-row gap-3">{actions}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
