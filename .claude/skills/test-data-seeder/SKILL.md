---
name: test-data-seeder
description: Use when the user asks to add, remove, or modify test data injected by the dev-only 🧪 button — triggers on phrases like "테스트 데이터 추가", "시드 데이터 수정", "test data seeder", "주입되는 데이터", or any request touching `src/dev/testDataSeeder.ts`, `src/components/dev/TestDataSeederButton.tsx`, or the dev-env data injection flow
---

# Test Data Seeder

로컬 `npm run dev`에서만 노출되는 🧪 버튼으로, 프로젝트 전체 기능 검증용 데이터셋을 멱등하게 재주입하는 기능. 이 스킬은 그 구조를 빠르게 복구해 수정 요청을 처리하기 위함.

## Files

- `src/dev/testDataSeeder.ts` — 단일 소스. 태그/todo/일정/foremost/done todo 정의와 cleanup·seed 엔트리.
- `src/components/dev/TestDataSeederButton.tsx` — UI(🧪 버튼), cleanup→seed 실행 + 스토어 전체 재조회.
- `src/components/TopToolbar.tsx` — `import.meta.env.DEV && <TestDataSeederButton />` 가드로 우측 클러스터(Refresh 앞)에 배치.

## Core Convention

- **`TEST_PREFIX = '[TEST] '`** — 생성되는 모든 엔티티 이름(tag/todo/schedule/done todo) 앞에 붙여야 cleanup에 잡힘. **프리픽스 없이 만들면 영구 잔존**.
- cleanup 전략: foremost 해제 → 프리픽스 태그 `deleteTagAndEvents` cascade → 태그 없는 잔여 todo/schedule/done todo 개별 삭제.
- cleanup 조회 범위는 오늘 기준 ±730일. 생성 날짜가 이 범위를 벗어나면 cleanup에 안 잡히므로 주의.
- 모든 API 호출은 `safe(label, errors, fn)` 래퍼 + `Promise.allSettled`로 감싸 부분 실패해도 진행.

## Where to Edit for Common Asks

| 요청 | 편집 위치 |
|------|-----------|
| 태그 추가/삭제/색상 변경 | `testDataSeeder.ts`의 `TAGS: SeederTag[]` 배열 |
| todo 케이스 추가 (현재/시간지정/반복/알림 등) | `seedTestData()` 안의 `todoDefs` 배열 |
| 일정 케이스 추가 | `seedTestData()` 안의 `scheduleDefs` 배열 |
| foremost 지정 대상 변경 | `todoDefs` 엔트리의 `setForemost: true` 플래그 이동 |
| 완료 기록(done todo) 개수/내용 | `seedTestData()` 끝부분의 `doneDefs` 배열 |
| 프리픽스 변경 | `TEST_PREFIX` 상수 하나 (생성·cleanup 자동 일관) |
| 버튼 위치/아이콘/레이블 | `TestDataSeederButton.tsx` + `TopToolbar.tsx` 삽입 위치 |

## Helper Utilities (이미 존재하니 재사용)

`testDataSeeder.ts` 내부 헬퍼 — 새 케이스 작성 시 이걸로 조립:

- 시간 기준: `dateAt(offsetDays, hour, minute?)` — 오늘 기준 ±offset일의 특정 시각 Date
- EventTime 빌더: `at(date)` / `period(start, end)` / `allday(offsetStartDays, offsetEndDays?)`
- Repeating 빌더: `everyDay(start)` / `everyWeek(start, dayOfWeek[])` / `everyMonthOnDays(start, days[])`
- 알림: `notifyMinutesBefore(minutes)` → `NotificationOption`
- 타임존: `tz()` (Intl 기반), GMT offset: `secondsFromGmt()` (allday 생성 시 자동 사용)

## Invariants (깨뜨리지 말 것)

1. 새로 추가하는 모든 엔티티 `name`에 `TEST_PREFIX` 필수.
2. 타임스탬프는 Unix **초** 단위 (`Math.floor(date.getTime()/1000)`). `dateAt` + 빌더 헬퍼를 쓰면 자동 처리.
3. 반복 규칙에는 항상 `timeZone: tz()` 전달 (모델 요구).
4. 수정 후 **cleanup이 여전히 수정 대상 항목을 전부 잡아내는지** 확인 — prefix 빠진 항목, ±730일 범위 밖 날짜 확인.
5. 새 엔티티 종류(예: 새로 추가된 도메인 모델)를 시딩하려면, 해당 스토어의 `fetch/refresh` 호출도 `TestDataSeederButton.tsx`의 주입 후 재조회 목록에 추가해야 화면 반영됨.

## Dev-Environment Gate

- 버튼은 `import.meta.env.DEV`일 때만 `TopToolbar`에서 렌더. 프로덕션 빌드는 Vite가 상수 `false`로 tree-shake.
- 컴포넌트 내부에서 조건부 early-return + `useState`는 React rules 위반 위험이 있어, **가드는 반드시 부모(`TopToolbar`)에서** 처리.

## Quick Sanity Check

수정 후:
1. `npx tsc --noEmit` 통과
2. `npm run dev` → 로컬에서 🧪 버튼 보이는지
3. 클릭 → 토스트 "완료" + 태그/일정/todo 카운트 일치
4. 한 번 더 클릭 → cleanup이 이전 데이터 싹 지우고 같은 카운트 재주입 (누적 X)
