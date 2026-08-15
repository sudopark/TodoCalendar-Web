import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// .ts 를 .mjs 에서 직접 import 하면 Node ≥22.18 의 type-stripping 이 필요해 .nvmrc(메이저만 고정)
// 범위 안의 구버전 Node 22 에서 ERR_UNKNOWN_FILE_EXTENSION 으로 죽는다. supportedLanguages.ts 가
// 참조하는 JSON을 여기서도 직접 읽어 같은 소스를 공유한다.
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const {
  codes: SUPPORTED_LANGUAGES,
  nativeNames: LANGUAGE_NATIVE_NAMES,
  englishNames: LANGUAGE_ENGLISH_NAMES,
} = JSON.parse(readFileSync(path.resolve(scriptDir, '../src/i18n/supportedLanguages.json'), 'utf-8'))

export const IGNORED_PREFIXES = ['dev.']

const isIgnored = key => IGNORED_PREFIXES.some(p => key.startsWith(p))

export function placeholdersOf(value) {
  if (typeof value !== 'string') {
    return [`(문자열 아님: ${typeof value})`]
  }
  return (value.match(/\{\{\s*[^}]+\s*\}\}/g) ?? [])
    .map(m => `{{${m.slice(2, -2).trim()}}}`)
    .sort()
}

/**
 * 로케일 JSON은 항상 평평한 `{ "key": "value", ... }` 형태(중첩 없음)라는 전제로,
 * 줄바꿈에 기대지 않고 따옴표 문자열 리터럴을 escape 인지하며 순서대로 뽑아 짝수 번째(0-based)를
 * key 로 취급한다. 한 줄에 여러 key 가 있어도, 값 안에 `":` 시퀀스가 있어도 흔들리지 않는다.
 */
export function duplicateKeysOf(rawJson) {
  const strings = [...rawJson.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m => m[1])
  const seen = new Set()
  const dupes = new Set()
  for (let i = 0; i < strings.length; i += 2) {
    const key = strings[i]
    if (seen.has(key)) dupes.add(key)
    seen.add(key)
  }
  return [...dupes]
}

const PLURAL_SUFFIXES = ['zero', 'one', 'two', 'few', 'many', 'other']

/**
 * i18next 는 {{count}} 를 쓰는 키에 한해 `키_few` 같은 접미사 항목으로 언어별 복수형을 고른다.
 * 러시아어·폴란드어처럼 복수형이 3형 이상인 언어는 이 항목이 있어야 문장이 맞으므로, en 에 없어도
 * 허용하고 대신 원본 키와 같은 플레이스홀더를 요구한다. 대응하는 en 키를 반환, 아니면 null.
 */
export function pluralBaseKeyOf(key, reference) {
  const cut = key.lastIndexOf('_')
  if (cut < 0) return null
  if (!PLURAL_SUFFIXES.includes(key.slice(cut + 1))) return null
  const base = key.slice(0, cut)
  if (!(base in reference)) return null
  return placeholdersOf(reference[base]).includes('{{count}}') ? base : null
}

export function checkLocale(reference, target, rawTarget, code) {
  const violations = []

  for (const key of duplicateKeysOf(rawTarget)) {
    violations.push(`[${code}] 중복 키: ${key}`)
  }

  for (const key of Object.keys(reference)) {
    if (isIgnored(key)) continue
    if (!(key in target)) {
      violations.push(`[${code}] 누락 키: ${key}`)
      continue
    }
    const expected = placeholdersOf(reference[key])
    const actual = placeholdersOf(target[key])
    if (expected.join('|') !== actual.join('|')) {
      violations.push(
        `[${code}] 플레이스홀더 불일치: ${key} — en=${expected.join(',') || '(없음)'} / ${code}=${actual.join(',') || '(없음)'}`
      )
    }
  }

  for (const key of Object.keys(target)) {
    if (isIgnored(key) || key in reference) continue
    const base = pluralBaseKeyOf(key, reference)
    if (base == null) {
      violations.push(`[${code}] en 에 없는 키: ${key}`)
      continue
    }
    const expected = placeholdersOf(reference[base])
    const actual = placeholdersOf(target[key])
    if (expected.join('|') !== actual.join('|')) {
      violations.push(
        `[${code}] 플레이스홀더 불일치: ${key} — en=${base}:${expected.join(',') || '(없음)'} / ${code}=${actual.join(',') || '(없음)'}`
      )
    }
  }

  return violations
}

/**
 * 로케일 파일 목록을 SUPPORTED_LANGUAGES 와 양방향으로 대조한다.
 * unknown: 지원 목록에 없는데 파일이 있는 경우 (오타·오타 코드 등) — 하드 위반 대상.
 * missing: 지원 목록엔 있는데 파일이 아직 없는 경우 (en 제외) — 정보성, 실패 대상 아님.
 */
export function diffLanguageFiles(fileCodes, supported) {
  const fileSet = new Set(fileCodes)
  const supportedSet = new Set(supported)
  const unknown = fileCodes.filter(code => !supportedSet.has(code)).sort()
  const missing = supported.filter(code => code !== 'en' && !fileSet.has(code)).sort()
  return { unknown, missing }
}

/**
 * codes 에 언어를 추가하고 표시 이름을 빠뜨리면 LanguagePicker 목록·검색이 코드 문자열로 폴백해
 * 조용히 반쪽으로 동작한다. 코드 쪽 폴백은 런타임 방어일 뿐이라 여기서 누락 자체를 막는다.
 */
export function missingDisplayNames(codes, nativeNames, englishNames) {
  const violations = []
  for (const code of codes) {
    if (!nativeNames[code]) violations.push(`[parity] ${code}: nativeNames 누락`)
    if (!englishNames[code]) violations.push(`[parity] ${code}: englishNames 누락`)
  }
  return violations
}

function main() {
  const dir = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../src/locales')
  const rawEn = readFileSync(path.join(dir, 'en.json'), 'utf-8')
  const reference = JSON.parse(rawEn)

  const all = []
  for (const dup of duplicateKeysOf(rawEn)) all.push(`[en] 중복 키: ${dup}`)

  const jsonFiles = readdirSync(dir).filter(f => f.endsWith('.json')).sort()
  const fileCodes = jsonFiles.map(f => f.replace(/\.json$/, ''))
  const { unknown, missing } = diffLanguageFiles(fileCodes, SUPPORTED_LANGUAGES)

  for (const code of unknown) {
    all.push(`[parity] SUPPORTED_LANGUAGES 에 없는 파일: ${code}.json`)
  }

  all.push(...missingDisplayNames(SUPPORTED_LANGUAGES, LANGUAGE_NATIVE_NAMES, LANGUAGE_ENGLISH_NAMES))

  const files = jsonFiles.filter(f => f !== 'en.json')
  for (const file of files) {
    const code = file.replace(/\.json$/, '')
    const raw = readFileSync(path.join(dir, file), 'utf-8')
    all.push(...checkLocale(reference, JSON.parse(raw), raw, code))
  }

  if (missing.length > 0) {
    console.log(`[info] 파일 없는 지원 언어 (${missing.length}개 — #201 예정): ${missing.join(', ')}`)
  }

  if (all.length > 0) {
    console.error(all.join('\n'))
    console.error(`\n총 ${all.length}건 위반 (검사 대상 ${files.length}개 언어)`)
    process.exit(1)
  }
  console.log(`파리티 통과 — ${files.length}개 언어, en 기준 ${Object.keys(reference).length}키`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
