import data from './supportedLanguages.json'

// 데이터는 supportedLanguages.json 단일 소스 — scripts/check-locale-parity.mjs(.mjs 라 .ts 를
// 직접 import 할 수 없다)도 같은 JSON을 읽어 언어 코드 목록을 이중 관리하지 않는다.

/** 앱(TodoCalendar #626)과 동일한 지원 언어 세트. en 이 원문. */
export const SUPPORTED_LANGUAGES: readonly string[] = data.codes

export const LANGUAGE_NATIVE_NAMES: Record<string, string> = data.nativeNames

/** 검색 매칭용 — 현재 UI 언어를 읽지 못하는 사용자가 라틴 문자로 자기 언어를 찾을 수 있게 한다. */
export const LANGUAGE_ENGLISH_NAMES: Record<string, string> = data.englishNames
