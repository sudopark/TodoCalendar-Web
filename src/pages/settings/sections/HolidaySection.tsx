import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HolidayCountry } from '../../../repositories/caches/holidayCache'
import { SettingsSection, settingsInput, settingsLabel } from '../SettingsSection'

interface CountryRowProps {
  country: HolidayCountry
  selected: boolean
  onClick: () => void
}

function CountryRow({ country, selected, onClick }: CountryRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
        selected ? 'text-fg font-semibold bg-gray-50' : 'text-fg hover:bg-gray-50',
      )}
    >
      <span className="flex-1 truncate">{country.name}</span>
      <span className="shrink-0 text-xs uppercase tracking-wider text-gray-400">{country.regionCode}</span>
      {selected && <Check className="h-4 w-4 text-fg shrink-0" strokeWidth={3} />}
    </button>
  )
}

interface Props {
  country: HolidayCountry
  availableCountries: HolidayCountry[]
  availableCountriesLoaded: boolean
  fetchAvailableCountries: () => Promise<void>
  setCountry: (country: HolidayCountry) => void
}

export function HolidaySection({
  country,
  availableCountries,
  availableCountriesLoaded,
  fetchAvailableCountries,
  setCountry,
}: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetchAvailableCountries().catch(() => {})
  }, [fetchAvailableCountries])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return availableCountries
    return availableCountries.filter(c =>
      c.name.toLowerCase().includes(q) || c.regionCode.toLowerCase().includes(q),
    )
  }, [availableCountries, query])

  const selectedFromList = useMemo(
    () => availableCountries.find(c => c.code === country.code),
    [availableCountries, country.code],
  )
  const pinnedCountry = selectedFromList ?? country

  const handleSelect = (next: HolidayCountry) => {
    if (next.code === country.code) return
    setCountry(next)
  }

  return (
    <SettingsSection title={t('settings.holiday_country')}>
      <div className="space-y-2">
        <p className={settingsLabel}>{t('settings.country_current', '현재 선택')}</p>
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <CountryRow country={pinnedCountry} selected onClick={() => { /* already selected */ }} />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('settings.country_search', '국가 검색')}
          className={cn(settingsInput, 'pl-9')}
        />
      </div>

      <ul className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100 rounded-lg border border-gray-100">
        {!availableCountriesLoaded && availableCountries.length === 0 && (
          <li className="px-3 py-4 text-sm text-gray-400 text-center">
            {t('common.loading', '불러오는 중...')}
          </li>
        )}
        {availableCountriesLoaded && filtered.length === 0 && (
          <li className="px-3 py-4 text-sm text-gray-400 text-center">
            {t('settings.country_no_results', '검색 결과 없음')}
          </li>
        )}
        {filtered.map(c => (
          <li key={c.code}>
            <CountryRow
              country={c}
              selected={c.code === country.code}
              onClick={() => handleSelect(c)}
            />
          </li>
        ))}
      </ul>
    </SettingsSection>
  )
}
