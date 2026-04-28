import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEventDefaultsStore } from '../../../stores/eventDefaultsStore'
import { useEventTagListCache } from '../../../repositories/caches/eventTagListCache'
import { APP_FALLBACK_DEFAULT_COLOR } from '../../../domain/tag/resolveEventTag'

interface Props {
  onClose: () => void
}

interface TagOption {
  id: string | null
  name: string
  color: string
}

export function DefaultTagPickerPanel({ onClose }: Props) {
  const { t } = useTranslation()
  const tags = useEventTagListCache(s => s.tags)
  const defaultTagColors = useEventTagListCache(s => s.defaultTagColors)
  const defaultTagId = useEventDefaultsStore(s => s.defaultTagId)
  const setDefaults = useEventDefaultsStore(s => s.setDefaults)

  const baseDefaultColor =
    defaultTagColors?.default && defaultTagColors.default.length > 0
      ? defaultTagColors.default
      : APP_FALLBACK_DEFAULT_COLOR

  const options: TagOption[] = useMemo(() => [
    { id: null, name: t('tag.default_name', '기본'), color: baseDefaultColor },
    ...Array.from(tags.values()).map(tag => ({
      id: tag.uuid,
      name: tag.name,
      color: tag.color_hex ?? APP_FALLBACK_DEFAULT_COLOR,
    })),
  ], [tags, baseDefaultColor, t])

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('settings.back')}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:text-[#1f1f1f] hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="flex-1 text-lg font-semibold text-[#1f1f1f]">
          {t('settings.default_tag')}
        </h2>
      </div>

      <ul className="divide-y divide-gray-100">
        {options.map(opt => {
          const isSelected = opt.id === defaultTagId
          return (
            <li key={opt.id ?? '__default__'}>
              <button
                type="button"
                onClick={() => setDefaults({ defaultTagId: opt.id })}
                className={cn(
                  'w-full flex items-center gap-3 py-3 text-left transition-colors',
                  isSelected ? 'text-[#1f1f1f] font-semibold' : 'text-[#1f1f1f] hover:bg-gray-50',
                )}
              >
                <span
                  className="inline-block h-5 w-5 shrink-0 rounded-full"
                  style={{ backgroundColor: opt.color }}
                  aria-hidden="true"
                />
                <span className="flex-1 truncate text-sm">{opt.name}</span>
                {isSelected && <Check className="h-4 w-4 text-[#1f1f1f] shrink-0" strokeWidth={3} />}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
