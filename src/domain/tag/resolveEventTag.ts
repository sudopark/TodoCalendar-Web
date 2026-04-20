import { DEFAULT_TAG_ID, HOLIDAY_TAG_ID } from '../../stores/eventTagStore'
import type { EventTag, DefaultTagColors } from '../../models'

export const FALLBACK_TAG_COLOR = '#9ca3af'

export type ResolvedTag =
  | { kind: 'explicit'; tag: EventTag; color: string }
  | { kind: 'default'; color: string }
  | { kind: 'holiday'; color: string }
  | { kind: 'none'; color: string }

export interface ResolveContext {
  tags: Map<string, EventTag>
  defaultTagId: string | null
  defaultColors: DefaultTagColors | null
}

export function resolveEventTag(
  eventTagId: string | null | undefined,
  ctx: ResolveContext,
): ResolvedTag {
  if (eventTagId === HOLIDAY_TAG_ID) {
    return { kind: 'holiday', color: ctx.defaultColors?.holiday ?? FALLBACK_TAG_COLOR }
  }
  if (eventTagId === DEFAULT_TAG_ID) {
    return { kind: 'default', color: ctx.defaultColors?.default ?? FALLBACK_TAG_COLOR }
  }
  if (eventTagId) {
    const tag = ctx.tags.get(eventTagId)
    if (tag) return { kind: 'explicit', tag, color: tag.color_hex ?? FALLBACK_TAG_COLOR }
  }
  const { defaultTagId } = ctx
  if (
    defaultTagId &&
    defaultTagId !== DEFAULT_TAG_ID &&
    defaultTagId !== HOLIDAY_TAG_ID &&
    defaultTagId !== eventTagId
  ) {
    const fallbackTag = ctx.tags.get(defaultTagId)
    if (fallbackTag) {
      return {
        kind: 'explicit',
        tag: fallbackTag,
        color: fallbackTag.color_hex ?? FALLBACK_TAG_COLOR,
      }
    }
  }
  if (ctx.defaultColors?.default) {
    return { kind: 'default', color: ctx.defaultColors.default }
  }
  return { kind: 'none', color: FALLBACK_TAG_COLOR }
}
