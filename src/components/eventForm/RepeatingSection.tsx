import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Repeat } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RepeatingPickerShadcn } from './RepeatingPickerShadcn'
import type { EventTime, Repeating } from '../../models'

interface RepeatingSectionProps {
  eventTime: EventTime | null
  repeating: Repeating | null
  onRepeatingChange: (v: Repeating | null) => void
}

export function RepeatingSection({ eventTime, repeating, onRepeatingChange }: RepeatingSectionProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  if (!eventTime) return null

  const isOn = repeating !== null
  const summary = isOn
    ? t('repeating.summary_on', '반복 설정됨')
    : t('repeating.summary_off', '반복 안 함')

  return (
    <div className="flex items-center gap-3">
      <Repeat className="w-4 h-4 text-muted-foreground shrink-0" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className="flex-1 flex items-center justify-between rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm hover:bg-surface-sunken focus-visible:ring-2 focus-visible:ring-ring/50 outline-none transition-colors"
        >
          <span className={isOn ? 'text-fg font-medium' : 'text-fg-tertiary'}>
            {summary}
          </span>
          <span className="text-xs text-fg-tertiary">
            {t('repeating.edit', '수정')}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] max-h-[60vh] overflow-y-auto p-4" side="bottom" align="start">
          <RepeatingPickerShadcn
            eventTime={eventTime}
            repeating={repeating}
            onRepeatingChange={onRepeatingChange}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
