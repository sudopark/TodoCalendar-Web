import { useTranslation } from 'react-i18next'
import { useEventTagStore, DEFAULT_TAG_ID, HOLIDAY_TAG_ID } from '../stores/eventTagStore'

export function useTagName() {
  const { t } = useTranslation()
  const tags = useEventTagStore(s => s.tags)

  return function getTagName(tagId: string | null | undefined): string {
    if (!tagId) return ''
    if (tagId === DEFAULT_TAG_ID) return t('tag.default_name', 'Default')
    if (tagId === HOLIDAY_TAG_ID) return t('tag.holiday_name', 'Holiday')
    return tags.get(tagId)?.name ?? ''
  }
}
