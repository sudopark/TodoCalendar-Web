import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { SettingsMenu } from './SettingsMenu'
import {
  DEFAULT_SETTING_CATEGORY,
  findSettingCategory,
  isSettingCategoryId,
  type SettingCategoryId,
} from './settingCategory'
import { AppearanceSection } from './sections/AppearanceSection'
import { EditEventSection } from './sections/EditEventSection'
import { HolidaySection } from './sections/HolidaySection'
import { TimezoneSection } from './sections/TimezoneSection'
import { LanguageSection } from './sections/LanguageSection'
import { NotificationSection } from './sections/NotificationSection'
import { GoogleCalendarSection } from './sections/GoogleCalendarSection'
import { AccountSection } from './sections/AccountSection'

function renderSection(id: SettingCategoryId) {
  switch (id) {
    case 'appearance': return <AppearanceSection />
    case 'editEvent': return <EditEventSection />
    case 'holiday': return <HolidaySection />
    case 'timezone': return <TimezoneSection />
    case 'language': return <LanguageSection />
    case 'notification': return <NotificationSection />
    case 'googleCalendar': return <GoogleCalendarSection />
    case 'account': return <AccountSection />
  }
}

export function SettingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { categoryId } = useParams<{ categoryId?: string }>()

  const hasExplicitCategory = isSettingCategoryId(categoryId)
  const selected: SettingCategoryId = hasExplicitCategory ? categoryId : DEFAULT_SETTING_CATEGORY
  const category = findSettingCategory(selected)

  // 유효하지 않은 categoryId로 진입하면 기본 경로로 정규화 (히스토리에 잘못된 URL 남지 않도록)
  useEffect(() => {
    if (categoryId !== undefined && !isSettingCategoryId(categoryId)) {
      navigate('/settings', { replace: true })
    }
  }, [categoryId, navigate])

  const handleSelect = (id: SettingCategoryId) => {
    navigate(`/settings/${id}`)
  }

  // 히스토리에 이전 항목이 있으면 뒤로, 없으면(딥링크 진입) 홈으로 이동
  const handleBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="md:grid md:grid-cols-[16rem_minmax(0,1fr)] md:max-w-5xl md:mx-auto">
        {/* 좌측 메뉴 — 모바일에서는 카테고리 명시 선택 전까지만 보임 */}
        <aside
          className={[
            'border-r border-gray-200 dark:border-gray-700',
            hasExplicitCategory ? 'hidden md:block' : 'block',
          ].join(' ')}
        >
          <SettingsMenu
            selected={selected}
            onSelect={handleSelect}
            onBack={handleBack}
          />
        </aside>

        {/* 우측 상세 — 모바일에서는 카테고리 선택 시에만 보임 */}
        <main
          className={[
            'px-4 py-6 md:px-8 md:py-8',
            hasExplicitCategory ? 'block' : 'hidden md:block',
          ].join(' ')}
        >
          {/* 모바일 전용 상단 바: 뒤로가기로 메뉴로 복귀 */}
          {hasExplicitCategory && (
            <div className="md:hidden flex items-center gap-2 mb-4 -mx-4 px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate('/settings')}
                aria-label={t('settings.back')}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {category && t(category.labelKey)}
              </h2>
            </div>
          )}

          {renderSection(selected)}
        </main>
      </div>
    </div>
  )
}
