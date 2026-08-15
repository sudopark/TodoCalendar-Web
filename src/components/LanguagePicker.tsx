import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Globe, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { loadLanguage, storeLanguage } from '../i18n'
import { LANGUAGE_NATIVE_NAMES } from '../i18n/supportedLanguages'
import { LANGUAGE_OPTIONS, filterLanguages } from '../i18n/languageOptions'

interface Props {
  /** icon: 주변 UI 가 이미 현재 언어로 그려진 자리 / labeled: 현재 언어를 트리거로만 알 수 있는 자리 */
  variant?: 'icon' | 'labeled'
  className?: string
}

export function LanguagePicker({ variant = 'icon', className }: Props) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const current = i18n.language
  const filtered = useMemo(() => filterLanguages(LANGUAGE_OPTIONS, query), [query])
  const label = t('language.label')
  const currentNativeName = LANGUAGE_NATIVE_NAMES[current] ?? current

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setQuery('')
  }

  const handleSelect = (code: string) => {
    handleOpenChange(false)
    if (code === current) return
    loadLanguage(code)
      .then(() => storeLanguage(code))
      .catch(() => {
        // 번들 로드 실패 — 현재 언어를 유지하고 저장하지 않는다
      })
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const first = filtered[0]
    if (first) handleSelect(first.code)
  }

  // 31개 중 현재 언어가 목록 뒤쪽이면 열었을 때 화면 밖이라 선택 상태가 보이지 않는다.
  const focusSelectedRow = useCallback((node: HTMLButtonElement | null) => {
    node?.scrollIntoView?.({ block: 'nearest' })
  }, [])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        aria-label={variant === 'labeled' ? `${label}: ${currentNativeName}` : label}
        className={cn(
          'flex items-center rounded-full text-fg-quaternary hover:text-fg hover:bg-surface-elevated transition-colors',
          variant === 'labeled' ? 'gap-1.5 px-3 py-1.5 text-sm text-fg-tertiary' : 'p-2',
          className,
        )}
      >
        <Globe className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        {variant === 'labeled' && (
          <span className="truncate">{currentNativeName}</span>
        )}
      </PopoverTrigger>

      <PopoverContent className="w-64 gap-0 p-0" side="bottom" align="end">
        <div className="relative border-b border-line p-2">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-quaternary"
            aria-hidden="true"
          />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t('language.search_placeholder')}
            aria-label={t('language.search_placeholder')}
            className="w-full rounded-md bg-surface-elevated py-2 pl-8 pr-2 text-sm text-fg placeholder:text-fg-quaternary outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-fg-quaternary">
            {t('language.no_results')}
          </p>
        ) : (
          <ul role="listbox" aria-label={label} className="max-h-72 overflow-y-auto py-1">
            {filtered.map(option => {
              const selected = option.code === current
              return (
                <li key={option.code} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    ref={selected ? focusSelectedRow : undefined}
                    onClick={() => handleSelect(option.code)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-[15px] transition-colors',
                      selected ? 'font-semibold text-fg bg-surface-elevated' : 'text-fg hover:bg-surface-elevated',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.nativeName}</span>
                    {selected && <Check className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden="true" />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
