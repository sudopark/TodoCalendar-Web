import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function Header() {
  const { t } = useTranslation()
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-xs md:text-sm font-medium transition-colors ${
      isActive ? 'bg-surface-sunken text-fg' : 'text-fg-tertiary hover:text-fg-secondary'
    }`

  return (
    <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-line bg-surface px-4">
      <span className="text-sm font-bold text-fg">TodoCalendar</span>
      <nav className="flex gap-1">
        <NavLink to="/" end className={linkClass}>{t('nav.calendar')}</NavLink>
        <NavLink to="/settings" className={linkClass}>{t('nav.settings')}</NavLink>
      </nav>
    </header>
  )
}
