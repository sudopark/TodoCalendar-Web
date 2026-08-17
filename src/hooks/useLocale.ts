import { useTranslation } from 'react-i18next'
import { DEFAULT_LOCALE } from '../utils/locale'

/** 현재 활성 언어 태그. 언어가 바뀌면 소비 컴포넌트가 재렌더된다. */
export function useLocale(): string {
  const { i18n } = useTranslation()
  return i18n.language || DEFAULT_LOCALE
}
