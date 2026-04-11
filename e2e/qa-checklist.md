# QA Checklist

> 자동 QA 파이프라인 체크리스트. 각 항목은 Playwright E2E 테스트로 검증.

## P0 — Critical (앱 사용 가능 여부)

- [ ] `npm run build` 성공
- [ ] `npm test` 전체 통과
- [ ] `/login` 페이지 렌더링
- [ ] Google/Apple 로그인 버튼 표시
- [ ] 미인증 사용자 → `/login` 리다이렉트 (/, /todos/new, /settings 등)
- [ ] 인증 후 `/` 메인 페이지 렌더링
- [ ] TopToolbar 표시 (사이드바 토글, 오늘 버튼, 월 내비, 설정)
- [ ] 캘린더 컴포넌트 표시 (월 제목, 요일 헤더, 날짜 그리드)
- [ ] 이벤트 생성 버튼 표시

## P1 — High (핵심 기능)

- [ ] 캘린더 월 네비게이션 (이전/다음 버튼)
- [ ] 날짜 선택 → 하이라이트 표시
- [ ] 사이드바 토글 (열기/닫기)
- [ ] 이벤트 생성 버튼 → TypeSelectorPopup (Todo/Schedule 선택)
- [ ] Todo 생성 폼 렌더링 (이름, 태그, 시간, 반복, 알림)
- [ ] Todo 저장 → 캘린더에 반영
- [ ] Todo 편집 폼 로드 + 수정 + 저장
- [ ] Todo 삭제 (ConfirmDialog / RepeatingScopeDialog)
- [ ] Schedule 생성 폼 렌더링 + 저장
- [ ] Schedule 편집/삭제
- [ ] 이벤트 상세 페이지 로드 (todo/schedule)
- [ ] 이벤트 상세 편집 (place, URL, memo)
- [ ] 이벤트 핀/언핀 (foremost)
- [ ] 태그 목록 조회
- [ ] 태그 생성
- [ ] 태그 편집 (이름, 색상)
- [ ] 태그 삭제 (태그만 / 태그+이벤트)
- [ ] 완료된 Todo 목록 렌더링
- [ ] 완료된 Todo 페이지네이션 (무한 스크롤)
- [ ] 완료된 Todo 되돌리기
- [ ] 완료된 Todo 삭제
- [ ] 설정 페이지 전체 섹션 렌더링
- [ ] 테마 전환 (System/Light/Dark)
- [ ] 언어 전환 (한국어/English)
- [ ] Todo 체크박스 → 완료 처리
- [ ] 빠른 Todo 입력 (QuickTodoInput)
- [ ] 로그아웃

## P2 — Medium (UX/Edge case)

- [ ] 이벤트 클릭 → 프리뷰 카드 표시 → 수정 내비게이션
- [ ] 미니캘린더 날짜 선택 → 메인 달력/이벤트 목록 연동
- [ ] 키보드 단축키: `n` → TypeSelectorPopup
- [ ] 키보드 단축키: `Escape` → 오버레이 닫기
- [ ] 오버레이 라우팅 (배경 페이지 유지)
- [ ] ErrorBoundary 렌더 에러 캐치
- [ ] Toast 알림 표시 + 자동 사라짐
- [ ] Foremost 이벤트 배너 표시
- [ ] 캘린더 appearance 설정 반영 (row height, font size, event names)
- [ ] 공휴일 표시 (빨간색 텍스트)
- [ ] 타임존 변경 반영

## P3 — Low (i18n/접근성/비주얼)

- [ ] i18n: RepeatingScopeDialog 하드코딩 한국어
- [ ] i18n: TodoFormPage 하드코딩 한국어 (이름, 저장, 삭제, 취소 등)
- [ ] i18n: ScheduleFormPage 하드코딩 한국어
- [ ] i18n: EventTimePicker 하드코딩 한국어 (시간 없음, 특정 시각 등)
- [ ] i18n: RepeatingPicker 하드코딩 한국어 (매일, 매주 등)
- [ ] i18n: NotificationPicker 하드코딩 한국어 (정시, 5분 전 등)
- [ ] i18n: MainPage FAB aria-label 하드코딩 한국어
- [ ] 다크모드: TodoFormPage bg-white → dark: 변형 누락
- [ ] 다크모드: ScheduleFormPage bg-white → dark: 변형 누락
- [ ] 404 페이지 렌더링 + 홈 링크 동작
