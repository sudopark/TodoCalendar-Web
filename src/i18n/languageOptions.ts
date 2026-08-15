import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NATIVE_NAMES,
  LANGUAGE_ENGLISH_NAMES,
} from './supportedLanguages'

export interface LanguageOption {
  readonly code: string
  readonly nativeName: string
  readonly englishName: string
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = SUPPORTED_LANGUAGES.map(code => ({
  code,
  nativeName: LANGUAGE_NATIVE_NAMES[code] ?? code,
  englishName: LANGUAGE_ENGLISH_NAMES[code] ?? code,
}))

// 라틴 키보드로 "cestina" 를 쳐도 "Čeština" 이 걸리도록 결합 문자를 떼고 비교한다.
function foldForSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export function filterLanguages(
  options: readonly LanguageOption[],
  query: string,
): LanguageOption[] {
  const needle = foldForSearch(query.trim())
  if (needle === '') return [...options]

  return options.filter(option =>
    [option.nativeName, option.englishName, option.code].some(field =>
      foldForSearch(field).includes(needle),
    ),
  )
}
