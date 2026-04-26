import { useCalendarAppearanceStore } from '../../../../stores/calendarAppearanceStore'

const SAMPLE_EVENTS_BY_DAY: { day: number; name: string; color: string }[][] = [
  [{ day: 1, name: '회의', color: '#5096FF' }],
  [{ day: 2, name: '커피챗', color: '#FF8A65' }, { day: 2, name: '리뷰 PR', color: '#7CB342' }],
  [
    { day: 3, name: '디자인 리뷰', color: '#AB47BC' },
    { day: 3, name: '점심 약속', color: '#FFA726' },
    { day: 3, name: '운동', color: '#26A69A' },
  ],
  [{ day: 4, name: '주간 리포트', color: '#5096FF' }],
  [],
  [{ day: 6, name: '생일 🎂', color: '#EC407A' }],
  [],
]

/**
 * 이벤트 표시 레벨 미리보기 — minimal/medium/full 차이를 한 행으로 시연
 */
export function EventDisplayPreview() {
  const { eventDisplayLevel, eventFontSizeWeight, showEventNames } = useCalendarAppearanceStore()

  const fontSize = `${10 + eventFontSizeWeight}px`

  const renderCell = (idx: number, events: typeof SAMPLE_EVENTS_BY_DAY[number]) => {
    if (eventDisplayLevel === 'minimal') {
      return (
        <div className="flex flex-col items-stretch">
          <div className="text-xs text-[#1f1f1f] mb-1">{idx + 1}</div>
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
        <div className="text-xs text-[#1f1f1f] mb-0.5">{idx + 1}</div>
        {visible.map((e, i) => (
          <div
            key={i}
            className="flex items-center rounded px-1 py-0.5 leading-tight overflow-hidden"
            style={{ backgroundColor: `${e.color}22`, fontSize }}
          >
            <span className="inline-block h-[5px] w-[5px] rounded-full mr-1 shrink-0" style={{ backgroundColor: e.color }} />
            <span className="truncate font-medium text-[#1f1f1f]">
              {showEventNames ? e.name : ' '}
            </span>
          </div>
        ))}
        {hidden > 0 && (
          <span className="text-[9px] font-medium text-[#969696] px-1">+{hidden}</span>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3">
      <div className="grid grid-cols-7 gap-1">
        {SAMPLE_EVENTS_BY_DAY.map((events, i) => (
          <div key={i} className="min-h-[60px] p-1 border-r border-gray-50 last:border-r-0">
            {renderCell(i, events)}
          </div>
        ))}
      </div>
    </div>
  )
}
