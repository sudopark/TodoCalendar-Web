import { useEventTagStore } from '../stores/eventTagStore'
import { useEventDefaultsStore } from '../stores/eventDefaultsStore'
import { resolveEventTag, type ResolvedTag } from '../domain/tag/resolveEventTag'

export function useResolvedEventTag(eventTagId: string | null | undefined): ResolvedTag {
  const tags = useEventTagStore(s => s.tags)
  const defaultColors = useEventTagStore(s => s.defaultTagColors)
  const defaultTagId = useEventDefaultsStore(s => s.defaultTagId)
  return resolveEventTag(eventTagId, { tags, defaultTagId, defaultColors })
}
