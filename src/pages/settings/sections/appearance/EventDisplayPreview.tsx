import { useTranslation } from 'react-i18next'
import { PRESET_COLORS } from '../../../../components/ColorPalette'
import type { EventDisplayLevel } from '../../../../repositories/caches/settingsCache'

// 의미별 색 인덱스 — iOS suggestColorHexes 27색 팔레트 기준
const C_BLUE = 11   // #1E90FF
const C_ORANGE = 4  // #FFA02E
const C_GREEN = 20  // #3CB371
const C_PURPLE = 7  // #6800f2
const C_YELLOW = 5  // #F6DC41
const C_PINK = 3    // #FD838F

interface Props {
  eventDisplayLevel: EventDisplayLevel
  eventFontSizeWeight: number
  showEventNames: boolean
}

/**
 * 이벤트 표시 레벨 미리보기 — minimal/medium/full 차이를 한 행으로 시연
 */
export function EventDisplayPreview({ eventDisplayLevel, eventFontSizeWeight, showEventNames }: Props) {
  const { t } = useTranslation()
  const fontSize = `${10 + eventFontSizeWeight}px`

  const sampleEventsByDay: { day: number; name: string; color: string }[][] = [
    [{ day: 1, name: t('settings.preview_event.meeting'), color: PRESET_COLORS[C_BLUE] }],
    [{ day: 2, name: t('settings.preview_event.coffee_chat'), color: PRESET_COLORS[C_ORANGE] }, { day: 2, name: t('settings.preview_event.review_pr'), color: PRESET_COLORS[C_GREEN] }],
    [
      { day: 3, name: t('settings.preview_event.design_review'), color: PRESET_COLORS[C_PURPLE] },
      { day: 3, name: t('settings.preview_event.lunch'), color: PRESET_COLORS[C_YELLOW] },
      { day: 3, name: t('settings.preview_event.exercise'), color: PRESET_COLORS[C_GREEN] },
    ],
    [{ day: 4, name: t('settings.preview_event.weekly_report'), color: PRESET_COLORS[C_BLUE] }],
    [],
    [{ day: 6, name: t('settings.preview_event.birthday'), color: PRESET_COLORS[C_PINK] }],
    [],
  ]

  const renderCell = (idx: number, events: typeof sampleEventsByDay[number]) => {
    if (eventDisplayLevel === 'minimal') {
      return (
        <div className="flex flex-col items-stretch">
          <div className="text-xs text-fg mb-1">{idx + 1}</div>
          <div className="flex gap-0.5">
            {events.slice(0, 3).map((e, i) => (
              <span key={i} className="h-1 w-1 rounded-full" style={{ backgroundColor: e.color }} />
            ))}
          </div>
        </div>
      )
    }
    const visible = eventDisplayLevel === 'full' ? events : events.slice(0, 2)
    const hidden = events.length - visible.length
    return (
      <div className="flex flex-col items-stretch gap-0.5">
        <div className="text-xs text-fg mb-0.5">{idx + 1}</div>
        {visible.map((e, i) => (
          <div
            key={i}
            className="flex items-center rounded px-1 py-0.5 leading-tight overflow-hidden"
            style={{ backgroundColor: `${e.color}22`, fontSize }}
          >
            <span className="inline-block h-[5px] w-[5px] rounded-full mr-1 shrink-0" style={{ backgroundColor: e.color }} />
            <span className="truncate font-medium text-fg">
              {showEventNames ? e.name : ' '}
            </span>
          </div>
        ))}
        {hidden > 0 && (
          <span className="text-[9px] font-medium text-fg-tertiary px-1">+{hidden}</span>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="grid grid-cols-7 gap-1">
        {sampleEventsByDay.map((events, i) => (
          <div key={i} className="min-h-[60px] p-1 border-r border-line last:border-r-0">
            {renderCell(i, events)}
          </div>
        ))}
      </div>
    </div>
  )
}
