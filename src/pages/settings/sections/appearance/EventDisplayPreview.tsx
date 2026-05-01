import { PRESET_COLORS } from '../../../../components/ColorPalette'
import type { EventDisplayLevel } from '../../../../repositories/caches/settingsCache'

const SAMPLE_EVENTS_BY_DAY: { day: number; name: string; color: string }[][] = [
  [{ day: 1, name: '회의', color: PRESET_COLORS[4] }],          // blue
  [{ day: 2, name: '커피챗', color: PRESET_COLORS[1] }, { day: 2, name: '리뷰 PR', color: PRESET_COLORS[3] }],  // orange, green
  [
    { day: 3, name: '디자인 리뷰', color: PRESET_COLORS[5] },   // purple
    { day: 3, name: '점심 약속', color: PRESET_COLORS[2] },     // yellow
    { day: 3, name: '운동', color: PRESET_COLORS[3] },           // green
  ],
  [{ day: 4, name: '주간 리포트', color: PRESET_COLORS[4] }],   // blue
  [],
  [{ day: 6, name: '생일 🎂', color: PRESET_COLORS[6] }],      // pink
  [],
]

interface Props {
  eventDisplayLevel: EventDisplayLevel
  eventFontSizeWeight: number
  showEventNames: boolean
}

/**
 * 이벤트 표시 레벨 미리보기 — minimal/medium/full 차이를 한 행으로 시연
 */
export function EventDisplayPreview({ eventDisplayLevel, eventFontSizeWeight, showEventNames }: Props) {
  const fontSize = `${10 + eventFontSizeWeight}px`

  const renderCell = (idx: number, events: typeof SAMPLE_EVENTS_BY_DAY[number]) => {
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
        {SAMPLE_EVENTS_BY_DAY.map((events, i) => (
          <div key={i} className="min-h-[60px] p-1 border-r border-line last:border-r-0">
            {renderCell(i, events)}
          </div>
        ))}
      </div>
    </div>
  )
}
