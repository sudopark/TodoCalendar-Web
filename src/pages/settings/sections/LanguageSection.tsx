import { useTranslation } from 'react-i18next'
import { SettingsSection, settingsInput } from '../SettingsSection'
import { loadLanguage, storeLanguage } from '../../../i18n'
import { SUPPORTED_LANGUAGES, LANGUAGE_NATIVE_NAMES } from '../../../i18n/supportedLanguages'

// #200 이 검색 가능한 언어 선택 UI로 이 컨트롤을 대체할 예정 — 그때까지는 평범한 select 유지.
export function LanguageSection() {
  const { t, i18n } = useTranslation()

  return (
    <SettingsSection title={t('settings.language')}>
      <select
        className={settingsInput}
        value={i18n.language}
        onChange={e => {
          const lang = e.target.value
          loadLanguage(lang)
            .then(() => storeLanguage(lang))
            .catch(() => {
              // 번들 로드 실패 — 현재 언어를 유지하고 저장하지 않는다
            })
        }}
      >
        {SUPPORTED_LANGUAGES.map(code => (
          <option key={code} value={code}>{LANGUAGE_NATIVE_NAMES[code]}</option>
        ))}
      </select>
    </SettingsSection>
  )
}
