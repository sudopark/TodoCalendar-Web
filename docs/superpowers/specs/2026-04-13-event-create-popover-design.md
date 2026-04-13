# Event Create Popover Design Spec

**Issue**: #51 - 이벤트 생성 화면 고도화
**Date**: 2026-04-13

## Context

현재 이벤트 생성은 별도 페이지 라우트(`/todos/new`, `/schedules/new`)로 구현되어 있다. 이를 구글 캘린더 스타일의 **팝오버 카드**로 대체하여, 메인 화면을 벗어나지 않고 이벤트를 생성할 수 있게 한다.

기존 TodoFormPage/ScheduleFormPage를 **하나의 통합 폼**으로 합치고, todo/schedule 전환은 카드 내부 토글로 처리한다.

## Scope

- **포함**: 이벤트 생성(create)만 다룸
- **제외**: 편집(edit)은 기존 라우트 유지 (향후 별도 리디자인)
- **TBD**: 태그 선택 변경 (#7) - 기본 태그 고정

## Architecture: Zustand Store 기반

### eventFormStore

폼 상태와 비즈니스 로직을 Zustand 스토어로 관리. 컴포넌트는 순수 UI.

```typescript
interface EventFormState {
  // 가시성
  isOpen: boolean
  anchorRect: DOMRect | null

  // 폼 필드
  eventType: 'todo' | 'schedule'
  name: string
  eventTagId: string | null
  eventTime: EventTime | null
  repeating: Repeating | null
  notifications: NotificationOption[]
  place: string
  url: string
  memo: string

  // UI 상태
  saving: boolean
  error: string | null

  // Actions
  openForm: (anchorRect: DOMRect | null) => void
  closeForm: () => void
  setEventType: (type: 'todo' | 'schedule') => void
  setName: (name: string) => void
  setEventTagId: (id: string | null) => void
  setEventTime: (time: EventTime | null) => void
  setRepeating: (repeating: Repeating | null) => void
  setNotifications: (options: NotificationOption[]) => void
  setPlace: (place: string) => void
  setUrl: (url: string) => void
  setMemo: (memo: string) => void
  save: () => Promise<void>
}
```

**파일**: `src/stores/eventFormStore.ts` (신규)

### 핵심 비즈니스 로직

#### openForm(anchorRect)
1. `uiStore.selectedDate`에서 선택된 날짜 읽기
2. `eventDefaultsStore`에서 기본 태그, 알림 설정 읽기
3. eventTime 초기값: selectedDate가 있으면 `{ time_type: 'at', timestamp: selectedDateTs }`, 없으면 null
4. eventType 초기값: `'todo'`
5. 나머지 필드 초기화

#### setEventType(type)
- `todo → schedule`: eventTime이 null이면 자동으로 `{ time_type: 'at', timestamp: selectedDateTs }` 설정 (schedule은 시간 필수)
- `schedule → todo`: eventTime 유지 (todo는 시간 선택사항)

#### setEventTime(time)
- allday 상태 변경 시 (was allday ↔ now not allday) notifications 초기화 (기존 패턴 유지)

#### save()
1. 유효성 검증: name 비어있지 않음. schedule이면 eventTime 필수
2. `saving: true`
3. todo면 `todoApi.createTodo()`, schedule이면 `scheduleApi.createSchedule()`
4. 생성된 UUID로 EventDetail 저장 (place/url/memo 중 하나라도 값 있으면): `eventDetailApi.updateEventDetail(uuid, {place, url, memo})`
5. `calendarEventsStore.addEvent()`. todo이고 `is_current`면 `currentTodosStore.addTodo()`
6. 성공: `closeForm()`, 성공 토스트
7. 실패: error 설정, 에러 토스트

#### canSave (선택자)
```typescript
function canSave(state: EventFormState): boolean {
  if (!state.name.trim()) return false
  if (state.eventType === 'schedule' && !state.eventTime) return false
  return true
}
```

#### D-day 계산 (유틸리티)
```typescript
function calculateDDay(eventTime: EventTime | null): number | null {
  if (!eventTime) return null
  const startTs = eventTime.time_type === 'at' ? eventTime.timestamp : eventTime.period_start
  const startDate = new Date(startTs * 1000)
  startDate.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((startDate.getTime() - today.getTime()) / 86400000)
}
```

## 컴포넌트 구조

### EventFormPopover

`createPortal`로 body에 렌더링. 기존 EventPreviewCard 패턴.

```
EventFormPopover (portal + backdrop + positioned Card)
├── Backdrop (fixed inset-0, z-50, click → closeForm)
├── Card (shadcn Card, absolute 위치, ScrollArea 내부)
│   ├── CardContent
│   │   ├── EventFormTopSection
│   │   │   ├── 태그 컬러바 + 이름 Input
│   │   │   ├── EventTypeToggle (shadcn ToggleGroup: todo/schedule)
│   │   │   ├── EventTimePickerShadcn (시간 입력, shadcn Select + Input)
│   │   │   ├── DDayBadge (Badge, eventTime 있을 때만 노출)
│   │   │   └── RepeatingPickerShadcn (인라인 확장, shadcn Select/Checkbox/Input)
│   │   ├── EventFormMiddleSection
│   │   │   ├── 태그 표시 ("기본" 고정, 컬러 표시)
│   │   │   └── NotificationPickerDropdown (shadcn Popover + Checkbox)
│   │   └── EventFormBottomSection
│   │       ├── 위치 Input (아이콘 + shadcn Input)
│   │       ├── URL Input (아이콘 + shadcn Input)
│   │       └── 메모 Textarea (아이콘 + shadcn Textarea)
│   └── CardFooter
│       └── 저장 Button (shadcn Button, canSave로 disabled 제어)
```

**파일 구조 (모두 신규)**:
- `src/components/eventForm/EventFormPopover.tsx`
- `src/components/eventForm/EventFormTopSection.tsx`
- `src/components/eventForm/EventFormMiddleSection.tsx`
- `src/components/eventForm/EventFormBottomSection.tsx`
- `src/components/eventForm/EventTypeToggle.tsx`
- `src/components/eventForm/EventTimePickerShadcn.tsx`
- `src/components/eventForm/RepeatingPickerShadcn.tsx`
- `src/components/eventForm/NotificationPickerDropdown.tsx`
- `src/components/eventForm/DDayBadge.tsx`

### 팝오버 위치 계산

CreateEventButton 클릭 시 `getBoundingClientRect()`를 `anchorRect`로 전달. 팝오버는 해당 위치 근처에 표시.

- 아래 공간 충분: anchorRect.bottom 아래에 카드 배치
- 아래 공간 부족: anchorRect.top 위에 카드 배치
- 수평: 뷰포트 내부로 clamp
- 카드 크기: 약 420px 너비, 높이는 내용에 따라 가변 (ScrollArea로 최대 높이 제한)
- z-index: `z-50` (기존 오버레이 모달과 동일)

### 알림 드롭다운 (NotificationPickerDropdown)

기존 NotificationPicker는 체크박스 리스트를 전부 나열. 새 컴포넌트는:
- shadcn Popover + Button 조합
- 버튼에 선택된 알림 개수/요약 표시
- 클릭 시 드롭다운으로 체크박스 리스트 표시
- 이벤트 시간이 없으면 비활성화
- allday 여부에 따라 다른 프리셋 표시 (기존 로직 그대로)

### 시간 입력 (EventTimePickerShadcn)

기존 EventTimePicker 로직 유지하되 UI를 shadcn으로 교체:
- 라디오 버튼 → shadcn Select로 시간 타입 선택 (none/at/period/allday)
- `none` 옵션: todo일 때만 표시 (required=false)
- datetime-local/date input은 유지 (shadcn Input 스타일 적용)

### 반복 옵션 (RepeatingPickerShadcn)

기존 RepeatingPicker(460줄)의 로직을 유지하되 shadcn 스타일 적용:
- 체크박스 토글 → shadcn Checkbox
- 반복 타입 선택 → shadcn Select
- 숫자 입력 → shadcn Input
- 요일 선택, 종료 조건 등 기존 로직 그대로
- 인라인 확장: 체크박스 OFF이면 숨김, ON이면 아래로 확장

## 기존 코드 변경

### 수정 파일

| 파일 | 변경 |
|------|------|
| `src/components/CreateEventButton.tsx` | navigate 제거. `eventFormStore.openForm(rect)` 호출. TypeSelectorPopup 제거 |
| `src/components/LeftSidebar.tsx` | `showCreatePopup` 상태 제거. TypeSelectorPopup 제거. 버튼 클릭 시 `eventFormStore.openForm(rect)` |
| `src/pages/MainPage.tsx` | `<EventFormPopover />` 추가 렌더링 |
| `src/App.tsx` | `/todos/new`, `/schedules/new` 라우트 제거 (기본 Routes + 오버레이 Routes 양쪽). edit 라우트는 유지 |

### 삭제 가능 파일

| 파일 | 사유 |
|------|------|
| `src/components/TypeSelectorPopup.tsx` | todo/schedule 선택이 팝오버 내부 토글로 대체됨 |

### 유지 파일 (edit 페이지용)

- `src/pages/TodoFormPage.tsx` - edit 라우트에서 사용
- `src/pages/ScheduleFormPage.tsx` - edit 라우트에서 사용
- `src/components/EventTimePicker.tsx` - edit 페이지에서 사용
- `src/components/RepeatingPicker.tsx` - edit 페이지에서 사용
- `src/components/NotificationPicker.tsx` - edit 페이지에서 사용

## shadcn 설치

```bash
npx shadcn@latest add popover select toggle-group textarea label
```

이미 설치됨: card, button, input, checkbox, badge, separator, scroll-area, tooltip, calendar

## 서브태스크 분해

### Task 1: shadcn 컴포넌트 설치 (S)
- `npx shadcn@latest add popover select toggle-group textarea label`
- 파일: `src/components/ui/` (신규 파일만)
- 의존: 없음

### Task 2: eventFormStore + 테스트 (L)
- eventFormStore 구현 (상태, 액션, save 플로우)
- 단위 테스트: `tests/stores/eventFormStore.test.ts`
- D-day 계산 유틸리티
- 파일: `src/stores/eventFormStore.ts`, `tests/stores/eventFormStore.test.ts`
- 의존: 없음

### Task 3: EventTimePickerShadcn (M)
- 기존 EventTimePicker 로직 기반으로 shadcn UI 적용
- 테스트
- 파일: `src/components/eventForm/EventTimePickerShadcn.tsx`
- 의존: Task 1

### Task 4: RepeatingPickerShadcn (L)
- 기존 RepeatingPicker 로직 기반으로 shadcn UI 적용
- 테스트
- 파일: `src/components/eventForm/RepeatingPickerShadcn.tsx`
- 의존: Task 1

### Task 5: NotificationPickerDropdown + DDayBadge + EventTypeToggle (M)
- NotificationPickerDropdown: 드롭다운 형식 알림 선택
- DDayBadge: D-day 표시
- EventTypeToggle: todo/schedule 토글
- 테스트
- 파일: `src/components/eventForm/NotificationPickerDropdown.tsx`, `DDayBadge.tsx`, `EventTypeToggle.tsx`
- 의존: Task 1

### Task 6: EventFormPopover (셸 + 섹션 조합) (M)
- 포탈, 백드롭, 위치 계산
- Top/Middle/Bottom 섹션 조합
- EventFormBottomSection (place, url, memo)
- 테스트
- 파일: `src/components/eventForm/EventFormPopover.tsx`, `EventFormTopSection.tsx`, `EventFormMiddleSection.tsx`, `EventFormBottomSection.tsx`
- 의존: Task 2, 3, 4, 5

### Task 7: 통합 - 트리거 연결 + 라우트 정리 (M)
- CreateEventButton 수정
- LeftSidebar 수정
- MainPage에 EventFormPopover 추가
- App.tsx에서 생성 라우트 제거
- TypeSelectorPopup 삭제
- E2E 테스트 수정
- 파일: CreateEventButton.tsx, LeftSidebar.tsx, MainPage.tsx, App.tsx
- 의존: Task 6

### 의존 그래프

```
Task 1 (shadcn install) ─┐
                         ├─→ Task 3, 4, 5 (병렬) ─┐
Task 2 (store) ──────────┘                        ├─→ Task 6 (popover) ─→ Task 7 (통합)
```

- Task 1, 2: **병렬 실행**
- Task 3, 4, 5: Task 1 완료 후 **병렬 실행**
- Task 6: Task 2~5 완료 후 실행
- Task 7: Task 6 완료 후 실행 (공유 파일 수정)

## 체크포인트 (worktree + 별도 포트 서버)

각 체크포인트에서 worktree의 dev 서버를 별도 포트로 띄워 사용자가 시각적으로 확인.

### CP1: 스토어 + shadcn 기반 (Task 1, 2 완료)
- eventFormStore 테스트 통과 확인
- shadcn 컴포넌트 설치 확인

### CP2: 개별 컴포넌트 완성 (Task 3, 4, 5 완료)
- EventTimePickerShadcn, RepeatingPickerShadcn, NotificationPickerDropdown 동작 확인
- worktree에서 `npm run dev -- --port 5174` 실행
- 사용자가 브라우저에서 컴포넌트 확인

### CP3: 팝오버 조합 완성 (Task 6 완료)
- EventFormPopover 전체 폼 동작 확인
- worktree에서 `npm run dev -- --port 5174` 실행
- 사용자가 팝오버 UI/UX 확인

### CP4: 통합 완성 (Task 7 완료)
- CreateButton으로 팝오버 열기, 저장, 캘린더 반영 확인
- 기존 생성 라우트 제거 확인
- E2E 테스트 통과
- worktree에서 `npm run dev -- --port 5174` 실행
- 사용자 최종 확인 후 develop에 머지

## 검증 방법

1. **단위 테스트**: `npm test` - eventFormStore, 각 컴포넌트 테스트 통과
2. **시각 확인**: worktree dev 서버에서 팝오버 UI 확인
3. **E2E 테스트**: `npx playwright test --video on` - 기존 이벤트 생성 시나리오가 팝오버로 정상 동작
4. **수동 확인 항목**:
   - todo/schedule 토글 전환
   - 시간 입력 모든 조합 (none, at, period, allday)
   - D-day 표시/숨김
   - 반복 옵션 인라인 확장
   - 알림 드롭다운
   - place/url/memo 입력 및 저장
   - 저장 후 캘린더에 이벤트 노출
   - 저장 실패 시 에러 표시
