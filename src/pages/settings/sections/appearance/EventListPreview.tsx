import { useTranslation } from 'react-i18next'

const SAMPLE_EVENTS = [
  { name: '디자인 리뷰', time: '10:00 — 11:00', color: '#AB47BC' },
  { name: '점심 약속', time: '12:30', color: '#FFA726' },
  { name: '주간 리포트 작성', time: '15:00 — 16:30', color: '#5096FF' },
]

const SAMPLE_UNCOMPLETED = [
  { name: '메일 회신' },
]

interface Props {
  eventListFontSizeWeight: number
  showHolidayInEventList: boolean
  showLunarCalendar: boolean
  showUncompletedTodos: boolean
}

/**
 * 우측 패널(이벤트 리스트) 미리보기 — 글꼴 크기/공휴일/음력/미완료 옵션 즉시 반영
 */
export function EventListPreview({ eventListFontSizeWeight, showHolidayInEventList, showLunarCalendar, showUncompletedTodos }: Props) {
  const { t } = useTranslation()

  const nameFontSize = `${14 + eventListFontSizeWeight}px`

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 space-y-4">
      {/* 날짜 헤더 */}
      <div>
        <h3 className="text-base font-bold text-[#323232]">2026년 4월 27일</h3>
        <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
          <p className="text-xs text-[#969696]">월요일</p>
          {showLunarCalendar && (
            <p className="text-xs text-[#969696]">· {t('settings.lunar_prefix', '음력')} 3월 9일</p>
          )}
        </div>
        {showHolidayInEventList && (
          <p className="mt-1 text-xs text-red-400 font-medium">{t('settings.preview_holiday_sample', '식목일')}</p>
        )}
      </div>

      {/* 미완료 */}
      {showUncompletedTodos && (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#bbb]">
              {t('todo.uncompleted', '미완료')}
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          {SAMPLE_UNCOMPLETED.map(t2 => (
            <div key={t2.name} className="flex items-center gap-2 py-1">
              <span className="h-2 w-2 rounded-full ring-2 ring-white shrink-0" style={{ backgroundColor: '#EC407A' }} />
              <span className="font-semibold text-[#ea4444]" style={{ fontSize: nameFontSize }}>{t2.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* 이벤트 */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#bbb]">
            {t('main.events_title', 'Events')}
          </span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>
        {SAMPLE_EVENTS.map(e => (
          <div key={e.name} className="flex items-start gap-2 py-1">
            <span className="h-2 w-2 mt-1.5 rounded-full ring-2 ring-white shrink-0" style={{ backgroundColor: e.color }} />
            <div className="min-w-0">
              <p className="font-semibold text-[#1f1f1f]" style={{ fontSize: nameFontSize }}>{e.name}</p>
              <p className="text-[11px] text-[#aaa]">{e.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
