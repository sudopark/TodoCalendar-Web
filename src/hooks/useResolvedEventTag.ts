import { useEventTagListCache } from '../repositories/caches/eventTagListCache'
import { useEventDefaultsStore } from '../stores/eventDefaultsStore'
import { resolveEventTag, type ResolvedTag } from '../domain/tag/resolveEventTag'

export function useResolvedEventTag(eventTagId: string | null | undefined): ResolvedTag {
  const tags = useEventTagListCache(s => s.tags)
  const defaultColors = useEventTagListCache(s => s.defaultTagColors)
  const defaultTagId = useEventDefaultsStore(s => s.defaultTagId)
  return resolveEventTag(eventTagId, { tags, defaultTagId, defaultColors })
}
