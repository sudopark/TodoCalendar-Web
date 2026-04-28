import { useEventTagListCache } from '../repositories/caches/eventTagListCache'
import { useSettingsCache } from '../repositories/caches/settingsCache'
import { resolveEventTag, type ResolvedTag } from '../domain/tag/resolveEventTag'

export function useResolvedEventTag(eventTagId: string | null | undefined): ResolvedTag {
  const tags = useEventTagListCache(s => s.tags)
  const defaultColors = useEventTagListCache(s => s.defaultTagColors)
  const defaultTagId = useSettingsCache(s => s.eventDefaults.defaultTagId)
  return resolveEventTag(eventTagId, { tags, defaultTagId, defaultColors })
}
