import type { ResolvedTag } from '../tag/resolveEventTag'

// i18next TFunction의 최소 부분집합 — 런타임 의존 없이 도메인 레이어에서 번역을 수행하기 위한 계약
// bivariance hack: 인터페이스 메서드로 정의하면 TypeScript가 bivariant로 처리해
// i18next TFunction(다중 오버로드)과의 호환성 문제가 발생하지 않는다.
interface TranslateFn {
  (key: string, defaultValue: string): string
}

export function tagDisplayName(resolved: ResolvedTag, t: TranslateFn): string {
  switch (resolved.kind) {
    case 'explicit': return resolved.tag.name
    case 'default':  return t('tag.default_name', 'Default')
    case 'holiday':  return t('tag.holiday_name', 'Holiday')
    default: {
      const _exhaustive: never = resolved
      return _exhaustive
    }
  }
}
