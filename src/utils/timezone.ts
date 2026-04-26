export interface TimezoneInfo {
  identifier: string
  title: string
  abbreviation: string
}

function readTimeZoneNamePart(
  identifier: string,
  locale: string,
  style: 'long' | 'longGeneric' | 'short',
): string {
  try {
    const fmt = new Intl.DateTimeFormat(locale, { timeZone: identifier, timeZoneName: style })
    const parts = fmt.formatToParts(new Date())
    return parts.find(p => p.type === 'timeZoneName')?.value ?? ''
  } catch {
    return ''
  }
}

export function getAllTimezoneIdentifiers(): string[] {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf
    if (typeof fn === 'function') return fn.call(Intl, 'timeZone')
  } catch { /* fallthrough */ }
  return []
}

export function getTimezoneInfo(identifier: string, locale: string): TimezoneInfo {
  const title = readTimeZoneNamePart(identifier, locale, 'longGeneric') || identifier
  const abbreviation = readTimeZoneNamePart(identifier, locale, 'short')
  return { identifier, title, abbreviation }
}

export function buildTimezoneList(locale: string): TimezoneInfo[] {
  const ids = getAllTimezoneIdentifiers()
  return ids
    .map(id => getTimezoneInfo(id, locale))
    .sort((a, b) => a.identifier.localeCompare(b.identifier))
}

export function filterTimezones(list: TimezoneInfo[], query: string): TimezoneInfo[] {
  const q = query.trim().toLowerCase()
  if (!q) return list
  return list.filter(tz =>
    tz.identifier.toLowerCase().includes(q)
    || tz.title.toLowerCase().includes(q)
    || tz.abbreviation.toLowerCase().includes(q),
  )
}
