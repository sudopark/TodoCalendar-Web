import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
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

  useEffect(() => {
    if (categoryId !== undefined && !isSettingCategoryId(categoryId)) {
      navigate('/settings', { replace: true })
    }
  }, [categoryId, navigate])

  const handleSelect = (id: SettingCategoryId) => {
    navigate(`/settings/${id}`)
  }

  const handleBack = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="md:grid md:grid-cols-[15rem_minmax(0,1fr)] md:max-w-5xl">
        <aside
          className={cn(
            'border-r border-gray-100',
            hasExplicitCategory ? 'hidden md:block' : 'block',
          )}
        >
          <SettingsMenu selected={selected} onSelect={handleSelect} onBack={handleBack} />
        </aside>

        <main
          className={cn(
            'px-4 py-6 md:px-10 md:py-10',
            hasExplicitCategory ? 'block' : 'hidden md:block',
          )}
        >
          {hasExplicitCategory && (
            <div className="md:hidden flex items-center gap-2 mb-8 -mx-4 px-4 pb-3 border-b border-gray-100">
              <button
                type="button"
                onClick={() => navigate('/settings')}
                aria-label={t('settings.back')}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:text-[#1f1f1f] hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-base font-semibold text-[#1f1f1f]">
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
