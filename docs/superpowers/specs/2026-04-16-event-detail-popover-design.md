# EventDetailPopover 설계

## 개요

메인화면에서 이벤트 클릭 시 페이지 이동 없이, 클릭한 요소 근처에 앵커링되는 팝오버로 이벤트 상세 정보를 읽기 전용으로 표시한다. 기존 EventPreviewCard와 EventDetailPage를 대체한다.

관련 이슈: #57

## 진입점

- 캘린더 그리드의 이벤트 바 클릭
- 우측 패널의 EventItem 클릭 (DayEventList, CurrentTodoList 등)

## 표시 정보 (읽기 전용)

- 이벤트 이름 + 태그 색상
- 이벤트 시간
- 반복 설정
- 알림 설정
- 추가 정보 (장소, URL, 메모)

Foremost(고정) 토글은 이번 범위에서 제외.

## 버튼 구성

| 버튼 | 동작 |
|------|------|
| 수정 | 팝오버 닫고 TodoFormPage/ScheduleFormPage 오버레이로 이동 (고도화는 #58에서) |
| 삭제 | 비반복 → 바로 삭제, 반복 → RepeatingScopeDialog로 범위 선택 후 삭제 |
| 닫기 | 팝오버 닫기 |

## 폐기 대상

- `EventPreviewCard` — EventDetailPopover로 완전 대체, 파일 삭제
- `EventDetailPage` — 더 이상 사용하지 않음, 파일 삭제
- `/events/:id` 라우트 제거 (App.tsx)

## 데이터 흐름

1. 이벤트 클릭 → `anchorRect` (클릭한 요소의 getBoundingClientRect()) + 이벤트 정보(CalendarEvent) 전달
2. 팝오버 열림 → `eventDetailApi.getEventDetail()`로 추가 정보(장소, URL, 메모) 조회
3. 수정 클릭 → 팝오버 닫기 → `navigate(/todos/:id/edit 또는 /schedules/:id/edit, { state: { background } })`
4. 삭제 시 → todoApi/scheduleApi 삭제 로직 → calendarEventsStore/currentTodosStore 갱신 → 팝오버 닫기

## 위치 결정

클릭한 요소의 `getBoundingClientRect()` 기반으로 팝오버 위치 계산. 화면 경계를 벗어나면 반대 방향으로 플립. 기존 EventPreviewCard가 사용하던 anchorRect 패턴을 재활용한다.

## 삭제 로직

기존 TodoFormPage/ScheduleFormPage에 구현된 삭제 로직을 재사용한다.

### Todo 삭제
- 비반복: `todoApi.deleteTodo()` → `calendarEventsStore.removeEvent()` + `currentTodosStore.removeTodo()`
- 반복 "이번만": `todoApi.patchTodo()` — 다음 턴으로 진행
- 반복 "이후 전부": `todoApi.patchTodo()` — 시리즈 종료

### Schedule 삭제
- 비반복: `scheduleApi.deleteSchedule()` → `calendarEventsStore.removeEvent()`
- 반복 "이번만": `scheduleApi.excludeRepeating()` — 특정 회차 제외
- 반복 "이후 전부": `scheduleApi.updateSchedule()` — 시리즈 종료

## 컴포넌트 구조

```
MainPage
├── MainCalendar
│   └── MainCalendarGrid (onEventClick → anchorRect + CalendarEvent 전달)
├── RightEventPanel
│   └── EventItem (onClick → anchorRect + CalendarEvent 전달)
└── EventDetailPopover (anchorRect 기반 위치, Portal 렌더)
    ├── 헤더: 수정 / 삭제 / 닫기 버튼
    ├── 이벤트 이름 + 태그 색상
    ├── 이벤트 시간 (EventTimeDisplay 재사용)
    ├── 반복 정보
    ├── 알림 설정
    └── 추가 정보 (장소, URL, 메모)
```

## 팝오버 상태 관리

MainPage (또는 MainCalendar) 레벨에서 로컬 상태로 관리:
- `popoverEvent: CalendarEvent | null` — 표시할 이벤트
- `popoverAnchor: DOMRect | null` — 앵커 위치

팝오버 외부 클릭 또는 닫기 버튼으로 상태 초기화.
