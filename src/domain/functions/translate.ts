// i18next TFunction의 최소 부분집합 — 런타임 의존 없이 도메인 레이어에서 번역을 수행하기 위한 계약
// 인터페이스 호출 시그니처 + 오버로드 분리라야 TFunction(다중 오버로드)과 호환된다. 파라미터를 union 하나로 합치면 안 맞는다
export interface TranslateFn {
  (key: string, defaultValue: string): string
  (key: string, interpolation?: Record<string, string | number>): string
}
