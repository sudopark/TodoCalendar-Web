import { useTranslation } from 'react-i18next'
import { PRESET_COLORS } from '../../../../components/ColorPalette'

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

  const sampleEvents = [
    { name: t('settings.preview_event.design_review'), time: '10:00 — 11:00', color: PRESET_COLORS[5] },      // purple
    { name: t('settings.preview_event.lunch'), time: '12:30', color: PRESET_COLORS[2] },                       // yellow
    { name: t('settings.preview_event.weekly_report_write'), time: '15:00 — 16:30', color: PRESET_COLORS[4] }, // blue
  ]

  const sampleUncompleted = [
    { name: t('settings.preview_todo.mail_reply') },
  ]

  return (
    <div className="rounded-lg border border-line bg-surface p-4 space-y-4">
      {/* 날짜 헤더 */}
      <div>
        <h3 className="text-base font-bold text-fg">{t('settings.preview_date')}</h3>
        <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
          <p className="text-xs text-fg-tertiary">{t('settings.preview_weekday')}</p>
          {showLunarCalendar && (
            <p className="text-xs text-fg-tertiary">· {t('settings.lunar_prefix')} {t('settings.preview_lunar_date')}</p>
          )}
        </div>
        {showHolidayInEventList && (
          <p className="mt-1 text-xs text-danger font-medium">{t('settings.preview_holiday_sample', '식목일')}</p>
        )}
      </div>

      {/* 미완료 */}
      {showUncompletedTodos && (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-meta font-semibold uppercase tracking-widest text-fg-quaternary">
              {t('todo.uncompleted', '미완료')}
            </span>
            <div className="flex-1 h-px bg-line" />
          </div>
          {sampleUncompleted.map(t2 => (
            <div key={t2.name} className="flex items-center gap-2 py-1">
              <span className="h-2 w-2 rounded-full ring-2 ring-surface shrink-0" style={{ backgroundColor: PRESET_COLORS[6] }} />
              <span className="font-semibold text-danger" style={{ fontSize: nameFontSize }}>{t2.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* 이벤트 */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-meta font-semibold uppercase tracking-widest text-fg-quaternary">
            {t('main.events_title', 'Events')}
          </span>
          <div className="flex-1 h-px bg-line" />
        </div>
        {sampleEvents.map(e => (
          <div key={e.name} className="flex items-start gap-2 py-1">
            <span className="h-2 w-2 mt-1.5 rounded-full ring-2 ring-surface shrink-0" style={{ backgroundColor: e.color }} />
            <div className="min-w-0">
              <p className="font-semibold text-fg" style={{ fontSize: nameFontSize }}>{e.name}</p>
              <p className="text-[11px] text-fg-quaternary">{e.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
