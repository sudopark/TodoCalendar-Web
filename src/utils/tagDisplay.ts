import type { TFunction } from 'i18next'
import type { ResolvedTag } from '../domain/tag/resolveEventTag'

export function tagDisplayName(resolved: ResolvedTag, t: TFunction): string {
  switch (resolved.kind) {
    case 'explicit': return resolved.tag.name
    case 'default':  return t('tag.default_name', 'Default')
    case 'holiday':  return t('tag.holiday_name', 'Holiday')
    case 'none':     return ''
  }
}
