import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { CalendarAppearance, EventDisplayLevel, WeekStartDay } from '../../../repositories/caches/settingsCache'
import {
  SettingsSection,
  settingsBtnSecondary,
  settingsLabel,
} from '../SettingsSection'
import { CalendarAppearancePreview } from './appearance/CalendarAppearancePreview'
import { EventDisplayPreview } from './appearance/EventDisplayPreview'
import { EventListPreview } from './appearance/EventListPreview'

const WEEKDAY_OPTIONS: { value: WeekStartDay; key: string }[] = [
  { value: 0, key: 'sun' },
  { value: 1, key: 'mon' },
  { value: 2, key: 'tue' },
  { value: 3, key: 'wed' },
  { value: 4, key: 'thu' },
  { value: 5, key: 'fri' },
  { value: 6, key: 'sat' },
]

const EVENT_DISPLAY_OPTIONS: { value: EventDisplayLevel; key: string }[] = [
  { value: 'minimal', key: 'minimal' },
  { value: 'medium', key: 'medium' },
  { value: 'full', key: 'full' },
]

function ToggleSwitch({ on, onChange, ariaLabel }: { on: boolean; onChange: () => void; ariaLabel?: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={on}
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0',
        on ? 'bg-action' : 'bg-line-strong',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-action-fg shadow transition-transform',
          on ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}

interface FieldProps {
  label: string
  children: React.ReactNode
}
function Field({ label, children }: FieldProps) {
  return (
    <div className="space-y-3">
      <p className={settingsLabel}>{label}</p>
      {children}
    </div>
  )
}

interface Props {
  theme: 'system' | 'light' | 'dark'
  setTheme: (theme: 'system' | 'light' | 'dark') => void
  calendarAppearance: CalendarAppearance
  setAppearance: (updates: Partial<CalendarAppearance>) => void
  resetAppearanceToDefaults: () => void
}

export function AppearanceSection({
  theme,
  setTheme,
  calendarAppearance,
  setAppearance,
  resetAppearanceToDefaults,
}: Props) {
  const { t } = useTranslation()
  const {
    weekStartDay,
    accentDays,
    eventDisplayLevel,
    eventFontSizeWeight,
    showEventNames,
    eventListFontSizeWeight,
    showHolidayInEventList,
    showLunarCalendar,
    showUncompletedTodos,
  } = calendarAppearance

  const themeOptions = [
    { id: 'system' as const, label: t('settings.theme_system') },
    { id: 'light' as const, label: t('settings.theme_light') },
    { id: 'dark' as const, label: t('settings.theme_dark') },
  ]

  return (
    <div className="space-y-14">
      {/* === 캘린더 외관 === */}
      <SettingsSection title={t('settings.calendar_appearance', '캘린더 외관')}>
        <CalendarAppearancePreview
          weekStartDay={weekStartDay}
          accentDays={accentDays}
        />

        <Field label={t('settings.week_start_day', '주 시작 요일')}>
          <div className="flex gap-1.5 flex-wrap">
            {WEEKDAY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAppearance({ weekStartDay: opt.value })}
                className={cn(
                  'rounded-full px-3 h-8 text-sm font-medium transition-colors',
                  weekStartDay === opt.value
                    ? 'bg-action text-action-fg'
                    : 'bg-surface-sunken text-fg hover:bg-surface-sunken',
                )}
              >
                {t(`calendar.weekdays.${opt.key}`, opt.key.toUpperCase())}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t('settings.accent_days', '강조 날짜')}>
          <div className="space-y-3">
            {(['holiday', 'sunday', 'saturday'] as const).map(key => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-fg">{t(`settings.accent_${key}`, key)}</span>
                <ToggleSwitch
                  on={accentDays[key]}
                  onChange={() => setAppearance({ accentDays: { ...accentDays, [key]: !accentDays[key] } })}
                  ariaLabel={t(`settings.accent_${key}`, key)}
                />
              </div>
            ))}
          </div>
        </Field>

        <Field label={t('settings.theme', '테마')}>
          <div className="flex gap-2">
            {themeOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className={cn(
                  'rounded-full px-4 h-9 text-sm font-medium transition-colors',
                  theme === opt.id
                    ? 'bg-action text-action-fg'
                    : 'bg-surface-sunken text-fg hover:bg-surface-sunken',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>
      </SettingsSection>

      {/* === 캘린더 내 이벤트 표시 === */}
      <SettingsSection title={t('settings.event_display_section', '캘린더 이벤트 표시')}>
        <EventDisplayPreview
          eventDisplayLevel={eventDisplayLevel}
          eventFontSizeWeight={eventFontSizeWeight}
          showEventNames={showEventNames}
        />

        <Field label={t('settings.event_display_level', '이벤트 표시 레벨')}>
          <div className="flex gap-2">
            {EVENT_DISPLAY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAppearance({ eventDisplayLevel: opt.value })}
                className={cn(
                  'rounded-full px-4 h-9 text-sm font-medium transition-colors',
                  eventDisplayLevel === opt.value
                    ? 'bg-action text-action-fg'
                    : 'bg-surface-sunken text-fg hover:bg-surface-sunken',
                )}
              >
                {t(`settings.event_display_${opt.key}`, opt.key)}
              </button>
            ))}
          </div>
        </Field>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={settingsLabel}>{t('settings.event_font_size', '이벤트 글꼴 크기 가중치')}</span>
            <span className={settingsLabel}>{eventFontSizeWeight > 0 ? `+${eventFontSizeWeight}` : eventFontSizeWeight}</span>
          </div>
          <input
            type="range"
            min={-7}
            max={7}
            value={eventFontSizeWeight}
            onChange={e => setAppearance({ eventFontSizeWeight: Number(e.target.value) })}
            className="w-full accent-action"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-fg">{t('settings.show_event_names', '이벤트 이름 표시')}</span>
          <ToggleSwitch
            on={showEventNames}
            onChange={() => setAppearance({ showEventNames: !showEventNames })}
            ariaLabel={t('settings.show_event_names', '이벤트 이름 표시')}
          />
        </div>
      </SettingsSection>

      {/* === 이벤트 리스트(우측 패널) 옵션 === */}
      <SettingsSection title={t('settings.event_list_section', '이벤트 리스트 표시')}>
        <EventListPreview
          eventListFontSizeWeight={eventListFontSizeWeight}
          showHolidayInEventList={showHolidayInEventList}
          showLunarCalendar={showLunarCalendar}
          showUncompletedTodos={showUncompletedTodos}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={settingsLabel}>{t('settings.event_list_font_size', '리스트 글꼴 크기 가중치')}</span>
            <span className={settingsLabel}>{eventListFontSizeWeight > 0 ? `+${eventListFontSizeWeight}` : eventListFontSizeWeight}</span>
          </div>
          <input
            type="range"
            min={-7}
            max={7}
            value={eventListFontSizeWeight}
            onChange={e => setAppearance({ eventListFontSizeWeight: Number(e.target.value) })}
            className="w-full accent-action"
          />
        </div>

        <div className="space-y-3">
          {[
            { key: 'showHolidayInEventList', label: t('settings.show_holidays_in_list', '공휴일 표시'), value: showHolidayInEventList },
            { key: 'showLunarCalendar', label: t('settings.show_lunar_calendar', '음력 표시'), value: showLunarCalendar },
            { key: 'showUncompletedTodos', label: t('settings.show_uncompleted_todos', '미완료 할 일 표시'), value: showUncompletedTodos },
          ].map(opt => (
            <div key={opt.key} className="flex items-center justify-between">
              <span className="text-sm text-fg">{opt.label}</span>
              <ToggleSwitch
                on={opt.value}
                onChange={() => setAppearance({ [opt.key]: !opt.value } as never)}
                ariaLabel={opt.label}
              />
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* === 외관 전체 초기화 (페이지 푸터) === */}
      <div className="pt-2">
        <button className={settingsBtnSecondary} onClick={resetAppearanceToDefaults}>
          {t('settings.reset_defaults')}
        </button>
      </div>
    </div>
  )
}
