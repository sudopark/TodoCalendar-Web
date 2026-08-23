import { useTranslation } from 'react-i18next'
import { showsDocLanguageSwitch, type PublicDoc } from '../../domain/publicDocs'
import { PublicDocFooter } from './PublicDocFooter'

const BAR_WIDTHS = ['45%', '100%', '100%', '72%', '100%', '58%']

/** 본문 자리를 미리 잡아 두는 바. 문서가 앉을 칼럼 안에서만 쓴다. */
export function PublicDocSkeletonBody() {
  const { t } = useTranslation()
  return (
    <div role="status" aria-live="polite" data-testid="public-doc-loading" className="space-y-3">
      <span className="sr-only">{t('publicDoc.loading')}</span>
      {BAR_WIDTHS.map((width, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={`animate-pulse rounded bg-surface-sunken ${i === 0 ? 'mb-6 h-7' : 'h-4'}`}
          style={{ width }}
        />
      ))}
    </div>
  )
}

/**
 * 문서 청크를 받아오는 동안 쓰는 폴백. 본문 로딩 화면과 같은 헤더·칼럼을 그려서
 * 청크 도착 → 본문 도착으로 넘어갈 때 레이아웃이 튀지 않게 한다.
 */
export function PublicDocSkeleton({ doc }: { doc: PublicDoc }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {showsDocLanguageSwitch(doc) && (
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-3xl items-center justify-end px-6 py-4">
            <div
              aria-hidden="true"
              className="h-[30px] w-32 animate-pulse rounded-lg bg-surface-sunken"
            />
          </div>
        </header>
      )}
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <PublicDocSkeletonBody />
      </main>
      <PublicDocFooter />
    </div>
  )
}
