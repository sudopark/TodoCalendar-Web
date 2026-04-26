import type { ReactNode } from 'react'

interface SettingsSectionProps {
  title: string
  children: ReactNode
  tone?: 'default' | 'danger'
}

export function SettingsSection({ title, children, tone = 'default' }: SettingsSectionProps) {
  const titleColor = tone === 'danger' ? 'text-red-400' : 'text-[#bbb]'
  const ruleColor = tone === 'danger' ? 'bg-red-100' : 'bg-gray-100'
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
  'inline-flex items-center rounded-full bg-[#1f1f1f] text-white px-4 h-9 text-sm font-semibold hover:bg-[#323232] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
export const settingsBtnSecondary =
  'inline-flex items-center rounded-full border border-gray-200 text-[#1f1f1f] px-4 h-9 text-sm font-medium hover:bg-gray-50 transition-colors'
export const settingsBtnDanger =
  'inline-flex items-center rounded-full border border-red-200 text-red-500 px-4 h-9 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
export const settingsInput =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1f1f1f] outline-none focus:border-[#1f1f1f] transition-colors'
export const settingsLabel = 'text-xs font-medium text-[#6b6b6b]'
