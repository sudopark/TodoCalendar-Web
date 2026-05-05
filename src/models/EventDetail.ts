/**
 * 다른 클라이언트(예: iOS 앱)가 저장한 장소는 좌표를 포함한 객체 형태로 응답된다.
 * 웹은 입력은 문자열만 지원하지만, 응답에서 객체를 받았을 때도 안전하게 표시할 수 있어야 한다.
 */
export interface Place {
  name?: string | null
  address?: string | null
  coordinate?: { latitude: number; longitude: number } | null
}

export type EventDetailPlace = string | Place

export interface EventDetail {
  place?: EventDetailPlace | null
  url?: string | null
  memo?: string | null
}

export function displayPlace(place: EventDetailPlace | null | undefined): string {
  if (!place) return ''
  if (typeof place === 'string') return place
  return place.name ?? place.address ?? ''
}
