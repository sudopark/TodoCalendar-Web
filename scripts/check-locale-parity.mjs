import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SUPPORTED_LANGUAGES } from '../src/i18n/supportedLanguages.ts'

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

export function duplicateKeysOf(rawJson) {
  const seen = new Set()
  const dupes = new Set()
  for (const m of rawJson.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm)) {
    const key = m[1]
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
