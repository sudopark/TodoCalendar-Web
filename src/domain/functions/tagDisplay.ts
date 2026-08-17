import type { ResolvedTag } from '../tag/resolveEventTag'
import type { TranslateFn } from './translate'

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
