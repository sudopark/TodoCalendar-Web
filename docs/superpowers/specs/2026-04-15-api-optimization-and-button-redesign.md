# API 호출 고도화 (#54) + 새 이벤트 버튼 디자인 (#52)

## 1. 년도 단위 이벤트 조회 + 캐시 (#54)

### 변경 대상
- `src/stores/calendarEventsStore.ts`
- `src/calendar/MainCalendar.tsx`

### 설계

`calendarEventsStore`에 년도 단위 캐시 도입:

```ts
interface CalendarEventsState {
  eventsByDate: Map<string, CalendarEvent[]>
  loadedYears: Set<number>        // 이미 조회한 년도
  loading: boolean
}
```

**fetchEventsForYear(year: number)**:
- `loadedYears`에 이미 있으면 스킵
- 없으면 해당 년도 1/1 00:00:00 ~ 12/31 23:59:59 범위로 `todoApi.getTodos()` + `scheduleApi.getSchedules()` 호출
- 결과를 `eventsByDate`에 병합 (기존 데이터 유지, 새 년도 데이터 추가)
- `loadedYears`에 year 추가

**MainCalendar useEffect 변경**:
- 기존: `fetchEventsForRange(lower, upper)` (그리드 날짜 범위)
- 변경: 그리드에 포함된 년도들 추출 → 각 년도에 대해 `fetchEventsForYear(year)` 호출
- 12월 그리드에 다음 해 1월이 보이면 다음 해도 조회

**기존 `fetchEventsForRange`, `lastRange`, `refreshCurrentRange` 제거** → `fetchEventsForYear`, `loadedYears`, `refreshYears`로 대체.

### 새로고침

**refreshYears(years: number[])**:
- `loadedYears`에서 해당 년도들 제거
- `eventsByDate`에서 해당 년도 이벤트 제거
- 해당 년도들 다시 조회
- 공휴일도 해당 년도 재조회 (`holidayStore.refreshHolidays(years)`)

---

## 2. Holiday API 400 에러 수정 (#54)

### 변경 대상
- `src/models/Holiday.ts`
- `src/stores/holidayStore.ts`

### 원인
`holidayApi.getHolidays(year, locale, code)`의 `code` 파라미터에 ISO 국가코드(`KR`)를 보내야 하는데 `region` 값(`south_korea`)을 보내고 있음.

### 수정
- `HolidayCountry` 모델에 `code: string` 필드 추가
- 기본값: `{ locale: 'ko', region: 'south_korea', code: 'KR' }`
- `fetchHolidays()`에서 `country.code`를 API에 전달

---

## 3. 반복 이벤트 수정/삭제 시 메모리 업데이트 (#54)

### 변경 대상
- `src/pages/TodoFormPage.tsx`
- `src/pages/ScheduleFormPage.tsx`
- `src/utils/todoActions.ts`

### 현재 문제
반복 이벤트 수정/삭제 시 API 응답을 무시하고 `refreshCurrentRange()`로 전체 재조회.

### 수정: Schedule 반복 수정

**scope === 'all'**:
```ts
const updated = await scheduleApi.updateSchedule(id, { ... })
removeEvent(id)
addEvent({ type: 'schedule', event: updated })
```

**scope === 'this'**:
```ts
const excluded = await scheduleApi.excludeRepeating(id, { exclude_repeatings: [...] })
const newSingle = await scheduleApi.createSchedule({ ... })
removeEvent(id)
addEvent({ type: 'schedule', event: excluded })
addEvent({ type: 'schedule', event: newSingle })
```

**scope === 'future'**:
```ts
const ended = await scheduleApi.updateSchedule(id, { repeating: { ...original.repeating, end: cutoff } })
const newSeries = await scheduleApi.createSchedule({ ... })
removeEvent(id)
addEvent({ type: 'schedule', event: ended })
addEvent({ type: 'schedule', event: newSeries })
```

### 수정: Schedule 반복 삭제

**scope === 'all'**:
```ts
await scheduleApi.deleteSchedule(id)
removeEvent(id)
```

**scope === 'this'**:
```ts
const excluded = await scheduleApi.excludeRepeating(id, { exclude_repeatings: [...] })
removeEvent(id)
addEvent({ type: 'schedule', event: excluded })
```

**scope === 'future'**:
```ts
const ended = await scheduleApi.updateSchedule(id, { repeating: { ...original.repeating, end: cutoff } })
removeEvent(id)
addEvent({ type: 'schedule', event: ended })
```

### 수정: Todo 반복 수정

**scope === 'this'**:
```ts
const result = await todoApi.replaceTodo(id, { ... })
removeEvent(id)
addEvent({ type: 'todo', event: result.new_todo })
if (result.next_repeating) {
  addEvent({ type: 'todo', event: result.next_repeating })
}
```

**scope === 'future'**:
```ts
const ended = await todoApi.patchTodo(id, { repeating: { ...original.repeating, end: cutoff } })
removeEvent(id)
addEvent({ type: 'todo', event: ended })
if (eventTime) {
  const newSeries = await todoApi.createTodo({ ... })
  addEvent({ type: 'todo', event: newSeries })
}
```

### 수정: Todo 반복 삭제

**scope === 'this'**:
```ts
const next = nextRepeatingTime(...)
if (next) {
  const updated = await todoApi.patchTodo(id, { event_time: next.time, repeating_turn: next.turn })
  removeEvent(id)
  addEvent({ type: 'todo', event: updated })
} else {
  await todoApi.deleteTodo(id)
  removeEvent(id)
}
```

**scope === 'future'**:
```ts
const ended = await todoApi.patchTodo(id, { repeating: { ...original.repeating, end: cutoff } })
removeEvent(id)
addEvent({ type: 'todo', event: ended })
```

### 수정: todoActions.ts - skipRepeatingTodo

`refreshAllTodoStores()` 내의 `refreshCurrentRange()` 제거. skip 결과로 받은 업데이트된 이벤트로 메모리 업데이트.

---

## 4. 새로고침 버튼 (#54)

### 변경 대상
- `src/components/TopToolbar.tsx`
- `src/stores/calendarEventsStore.ts`

### 설계
- TopToolbar 우측 영역(아카이브/설정 버튼 앞)에 새로고침 아이콘 버튼 추가
- 클릭 시: 현재 캘린더 그리드에 포함된 년도들에 대해 `refreshYears([...years])` 호출
- 로딩 중에는 버튼 비활성화 또는 스피너 표시

---

## 5. 우측 패널 새 이벤트 버튼 디자인 수정 (#52)

### 변경 대상
- `src/components/CreateEventButton.tsx`

### 현재 디자인
- `bg-[#303646]` 진회색 배경, 흰색 텍스트
- `rounded-[5px]`, `px-3 py-2.5`

### 변경 디자인
좌측 사이드바 Create 버튼 스타일과 통일:
- `bg-white border border-gray-200 rounded-full shadow-sm hover:shadow`
- 아이콘: `text-[#323232]`, 텍스트: `text-sm font-medium text-[#323232]`
- 드롭다운 화살표 포함

단, 이슈 요구사항에 따라:
- 너비: `w-full` (우측 패널 꽉 채움, 컨테이너 패딩으로 최소 여백)
- 높이: 적절히 조절 (`py-2.5` 유지)
