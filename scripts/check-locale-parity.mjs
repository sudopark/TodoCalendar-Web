import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// .ts 를 .mjs 에서 직접 import 하면 Node ≥22.18 의 type-stripping 이 필요해 .nvmrc(메이저만 고정)
// 범위 안의 구버전 Node 22 에서 ERR_UNKNOWN_FILE_EXTENSION 으로 죽는다. supportedLanguages.ts 가
// 참조하는 JSON을 여기서도 직접 읽어 같은 소스를 공유한다.
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const { codes: SUPPORTED_LANGUAGES } = JSON.parse(
  readFileSync(path.resolve(scriptDir, '../src/i18n/supportedLanguages.json'), 'utf-8'),
)

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
    if (isIgnored(key)) continue
    if (!(key in reference)) violations.push(`[${code}] en 에 없는 키: ${key}`)
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
