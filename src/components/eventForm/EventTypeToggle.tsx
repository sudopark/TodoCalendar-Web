import { useTranslation } from 'react-i18next'
import { CheckCircle2, CalendarDays } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useEventFormStore } from '../../stores/eventFormStore'

export function EventTypeToggle() {
  const { t } = useTranslation()
  const eventType = useEventFormStore(s => s.eventType)
  const setEventType = useEventFormStore(s => s.setEventType)

  return (
    <ToggleGroup
      value={[eventType]}
      onValueChange={(values: string[]) => {
        // 빈 배열(현재 선택 해제) 방지 — 둘 중 하나는 반드시 선택
        const next = values[0]
        if (next === 'todo' || next === 'schedule') setEventType(next)
      }}
      aria-label={t('eventType.label', '이벤트 유형')}
      className="w-full rounded-full bg-surface-sunken p-0.5"
    >
      <ToggleGroupItem
        value="todo"
        className="flex-1 h-8 gap-1.5 rounded-full text-xs font-medium text-fg-secondary aria-pressed:bg-white aria-pressed:text-fg aria-pressed:shadow-sm transition-all"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t('eventType.todo', 'Todo')}
      </ToggleGroupItem>
      <ToggleGroupItem
        value="schedule"
        className="flex-1 h-8 gap-1.5 rounded-full text-xs font-medium text-fg-secondary aria-pressed:bg-white aria-pressed:text-fg aria-pressed:shadow-sm transition-all"
      >
        <CalendarDays className="h-3.5 w-3.5" />
        {t('eventType.schedule', 'Schedule')}
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
