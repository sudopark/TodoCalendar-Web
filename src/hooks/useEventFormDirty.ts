export interface EventFormSnapshot {
  name: string
  tagId: string | null
  eventTime: unknown  // EventTime | null — unknown으로 받아 훅 재사용성 높임
  repeating: unknown  // Repeating | null
  notifications: unknown  // NotificationOption[]
  place: string
  url: string
  memo: string
}

// 원본 스냅샷과 현재 값 비교.
// 원본이 null(=신규 모드)이면 항상 dirty(true)로 간주 → 신규에서는 이름 검증이 별도 가드.
export function useEventFormDirty(
  original: EventFormSnapshot | null,
  current: EventFormSnapshot
): boolean {
  if (!original) return true
  return JSON.stringify(original) !== JSON.stringify(current)
}
