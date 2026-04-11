import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Header } from './components/Header'
import { LoadingSkeleton } from './components/LoadingSkeleton'
import { ToastContainer } from './components/Toast'
import { LoginPage } from './pages/LoginPage'
import { MainPage } from './pages/MainPage'
import './stores/themeStore'

const EventDetailPage = React.lazy(() => import('./pages/EventDetailPage').then(m => ({ default: m.EventDetailPage })))
const TodoFormPage = React.lazy(() => import('./pages/TodoFormPage').then(m => ({ default: m.TodoFormPage })))
const ScheduleFormPage = React.lazy(() => import('./pages/ScheduleFormPage').then(m => ({ default: m.ScheduleFormPage })))
const TagManagementPage = React.lazy(() => import('./pages/TagManagementPage').then(m => ({ default: m.TagManagementPage })))
const DoneTodosPage = React.lazy(() => import('./pages/DoneTodosPage').then(m => ({ default: m.DoneTodosPage })))
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))

function AppRoutes() {
  const location = useLocation()
  const navigate = useNavigate()
  const background = (location.state as { background?: typeof location } | null)?.background

  return (
    <>
      <Suspense fallback={<LoadingSkeleton />}>
        <Routes location={background ?? location}>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <AuthGuard>
                <Header />
                <Routes>
                  <Route path="/" element={<MainPage />} />
                  <Route path="/events/:id" element={<EventDetailPage />} />
                  <Route path="/todos/new" element={<TodoFormPage />} />
                  <Route path="/todos/:id/edit" element={<TodoFormPage />} />
                  <Route path="/schedules/new" element={<ScheduleFormPage />} />
                  <Route path="/schedules/:id/edit" element={<ScheduleFormPage />} />
                  <Route path="/tags" element={<TagManagementPage />} />
                  <Route path="/done" element={<DoneTodosPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Suspense fallback={null}><NotFoundPage /></Suspense>} />
                </Routes>
              </AuthGuard>
            }
          />
        </Routes>
      </Suspense>

      {/* 오버레이 렌더: background가 있을 때 EventDetailPage를 배경 위에 표시.
          fixed inset-0 z-50 으로 뷰포트 전체를 덮어 스크롤 없이 보이도록 한다.
          배경 페이지의 Header가 이미 표시 중이므로 Header 불필요. */}
      {background && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* 백드롭: 클릭 시 이전 페이지로 복귀 */}
          <div
            className="fixed inset-0 bg-black/30"
            data-testid="overlay-backdrop"
            aria-label="오버레이 닫기"
            onClick={() => navigate(-1)}
          />
          {/* 폼 콘텐츠: 백드롭 위에 렌더. stopPropagation으로 백드롭 클릭과 분리 */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <Suspense fallback={<LoadingSkeleton />}>
              <Routes>
                {[
                  ['/events/:id', <EventDetailPage />],
                  ['/todos/new', <TodoFormPage />],
                  ['/todos/:id/edit', <TodoFormPage />],
                  ['/schedules/new', <ScheduleFormPage />],
                  ['/schedules/:id/edit', <ScheduleFormPage />],
                  ['/tags', <TagManagementPage />],
                ].map(([path, element]) => (
                  <Route key={path as string} path={path as string} element={<AuthGuard>{element as React.ReactElement}</AuthGuard>} />
                ))}
              </Routes>
            </Suspense>
          </div>
        </div>
      )}
    </>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <ToastContainer />
    </ErrorBoundary>
  )
}

export default App
