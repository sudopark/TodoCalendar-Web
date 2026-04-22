import type { EventTag, DefaultTagColors } from '../../models'
import { DEFAULT_TAG_ID, HOLIDAY_TAG_ID } from './constants'
import {
  APP_FALLBACK_DEFAULT_COLOR,
  APP_FALLBACK_HOLIDAY_COLOR,
} from './resolveEventTag'

export type TagRowKind = 'default' | 'holiday' | 'custom'

export interface TagRowModel {
  id: string
  kind: TagRowKind
  name: string
  color: string
}

type Translate = (key: string, fallback?: string) => string

export function buildTagRows(
  tags: Map<string, EventTag>,
  defaultColors: DefaultTagColors | null,
  t: Translate,
): TagRowModel[] {
  const defaultColor =
    defaultColors?.default && defaultColors.default.length > 0
      ? defaultColors.default
      : APP_FALLBACK_DEFAULT_COLOR
  const holidayColor =
    defaultColors?.holiday && defaultColors.holiday.length > 0
      ? defaultColors.holiday
      : APP_FALLBACK_HOLIDAY_COLOR

  const userRows: TagRowModel[] = Array.from(tags.values())
    .filter(tag => tag.uuid !== DEFAULT_TAG_ID && tag.uuid !== HOLIDAY_TAG_ID)
    .map(tag => ({
      id: tag.uuid,
      kind: 'custom',
      name: tag.name,
      color: tag.color_hex && tag.color_hex.length > 0 ? tag.color_hex : defaultColor,
    }))

  return [
    { id: DEFAULT_TAG_ID, kind: 'default', name: t('tag.default_name', '기본'), color: defaultColor },
    { id: HOLIDAY_TAG_ID, kind: 'holiday', name: t('tag.holiday_name', '공휴일'), color: holidayColor },
    ...userRows,
  ]
}
