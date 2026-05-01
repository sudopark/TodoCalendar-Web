import type { ReactNode } from 'react'

interface SettingsSectionProps {
  title: string
  children: ReactNode
  tone?: 'default' | 'danger'
}

export function SettingsSection({ title, children, tone = 'default' }: SettingsSectionProps) {
  const titleColor = tone === 'danger' ? 'text-red-400' : 'text-fg-quaternary'
  const ruleColor = tone === 'danger' ? 'bg-red-100' : 'bg-line'
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <span className={`text-[11px] font-semibold uppercase tracking-widest shrink-0 ${titleColor}`}>
          {title}
        </span>
        <div className={`flex-1 h-px ${ruleColor}`} />
      </div>
      <div className="space-y-7">{children}</div>
    </section>
  )
}

export const settingsBtnPrimary =
  'inline-flex items-center rounded-full bg-action text-action-fg px-4 h-9 text-sm font-semibold hover:bg-action/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
export const settingsBtnSecondary =
  'inline-flex items-center rounded-full border border-line text-fg px-4 h-9 text-sm font-medium hover:bg-surface-elevated transition-colors'
export const settingsBtnDanger =
  'inline-flex items-center rounded-full border border-red-200 text-red-500 px-4 h-9 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
export const settingsInput =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-action transition-colors'
export const settingsLabel = 'text-xs font-medium text-fg-secondary'
