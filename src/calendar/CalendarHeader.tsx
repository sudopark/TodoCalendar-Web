import { formatMonthTitle } from './calendarUtils'
import { useLocale } from '../hooks/useLocale'

interface CalendarHeaderProps {
  year: number
  month: number
  onPrev: () => void
  onNext: () => void
}

export default function CalendarHeader({ year, month, onPrev, onNext }: CalendarHeaderProps) {
  const locale = useLocale()
  return (
    <div className="mb-4 flex items-center justify-between">
      <button
        onClick={onPrev}
        className="rounded px-3 py-1 hover:bg-surface-sunken text-fg-tertiary"
        aria-label="Previous month"
      >
        ‹
      </button>
      <h2 className="text-lg font-semibold text-fg">{formatMonthTitle(year, month, locale)}</h2>
      <button
        onClick={onNext}
        className="rounded px-3 py-1 hover:bg-surface-sunken text-fg-tertiary"
        aria-label="Next month"
      >
        ›
      </button>
    </div>
  )
}
