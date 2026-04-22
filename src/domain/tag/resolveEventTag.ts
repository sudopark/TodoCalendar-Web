import { DEFAULT_TAG_ID, HOLIDAY_TAG_ID } from './constants'
import type { EventTag, DefaultTagColors } from '../../models'

export const APP_FALLBACK_DEFAULT_COLOR = '#4A90D9'
export const APP_FALLBACK_HOLIDAY_COLOR = '#ef4444'

export type ResolvedTag =
  | { kind: 'explicit'; tag: EventTag; color: string }
  | { kind: 'default'; color: string }
  | { kind: 'holiday'; color: string }

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
    const fromServer = ctx.defaultColors?.holiday
    return { kind: 'holiday', color: fromServer && fromServer.length > 0 ? fromServer : APP_FALLBACK_HOLIDAY_COLOR }
  }
  if (eventTagId === DEFAULT_TAG_ID) {
    const fromServer = ctx.defaultColors?.default
    return { kind: 'default', color: fromServer && fromServer.length > 0 ? fromServer : APP_FALLBACK_DEFAULT_COLOR }
  }
  if (eventTagId) {
    const tag = ctx.tags.get(eventTagId)
    if (tag) return { kind: 'explicit', tag, color: tag.color_hex ?? APP_FALLBACK_DEFAULT_COLOR }
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
        color: fallbackTag.color_hex ?? APP_FALLBACK_DEFAULT_COLOR,
      }
    }
  }
  const fromServer = ctx.defaultColors?.default
  return { kind: 'default', color: fromServer && fromServer.length > 0 ? fromServer : APP_FALLBACK_DEFAULT_COLOR }
}
