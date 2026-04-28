import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { useEventTagListCache } from '../repositories/caches/eventTagListCache'
import { useResolvedEventTag } from '../hooks/useResolvedEventTag'
import { tagDisplayName } from '../domain/functions/tagDisplay'

const DEFAULT_SENTINEL = '__default__'

interface TagDropdownProps {
  value: string | null | undefined
  onChange: (tagId: string | null) => void
  showManageLink?: boolean
}

export function TagDropdown({ value, onChange, showManageLink = false }: TagDropdownProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const tags = useEventTagListCache(s => s.tags)
  const resolvedDefault = useResolvedEventTag(null)
  const resolvedCurrent = useResolvedEventTag(value ?? null)

  const tagList = Array.from(tags.values())
  const currentName = tagDisplayName(resolvedCurrent, t)
  const currentColor = resolvedCurrent.color

  function handleValueChange(next: string | null) {
    onChange(next === DEFAULT_SENTINEL || next === null ? null : next)
  }

  return (
    <div className="space-y-2">
      <Select value={value ?? DEFAULT_SENTINEL} onValueChange={handleValueChange}>
        <SelectTrigger
          className="w-full justify-start gap-2"
          data-testid="tag-dropdown-trigger"
        >
          <SelectValue>
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: currentColor }}
              aria-hidden="true"
            />
            <span className="truncate">{currentName}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT_SENTINEL}>
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: resolvedDefault.color }}
              aria-hidden="true"
            />
            <span className="truncate">{tagDisplayName(resolvedDefault, t)}</span>
          </SelectItem>
          {tagList.map(tag => (
            <SelectItem key={tag.uuid} value={tag.uuid}>
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: tag.color_hex ?? 'transparent' }}
                aria-hidden="true"
              />
              <span className="truncate">{tag.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showManageLink && (
        <button
          type="button"
          className="text-xs text-[#1f1f1f] underline underline-offset-2 hover:opacity-60 transition-opacity"
          onClick={() => navigate('/settings/editEvent/tags')}
        >
          {t('tag.manage')} &gt;
        </button>
      )}
    </div>
  )
}
