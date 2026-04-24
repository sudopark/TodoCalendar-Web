import { useState } from 'react'
import { cleanupTestData, seedTestData } from '../../dev/testDataSeeder'
import { useEventTagStore } from '../../stores/eventTagStore'
import { useCalendarEventsStore } from '../../stores/calendarEventsStore'
import { useCurrentTodosStore } from '../../stores/currentTodosStore'
import { useUncompletedTodosStore } from '../../stores/uncompletedTodosStore'
import { useForemostEventStore } from '../../stores/foremostEventStore'
import { useDoneTodosStore } from '../../stores/doneTodosStore'
import { useToastStore } from '../../stores/toastStore'

export default function TestDataSeederButton() {
  const [running, setRunning] = useState(false)

  async function handleClick() {
    if (running) return
    setRunning(true)
    const toast = useToastStore.getState().show
    try {
      toast('테스트 데이터 주입 시작', 'info')

      const cleanupErrors = await cleanupTestData()
      const result = await seedTestData()

      // 관련 store 전체 갱신
      await useEventTagStore.getState().fetchAll().catch(() => {})

      const loadedYears = Array.from(useCalendarEventsStore.getState().loadedYears)
      if (loadedYears.length > 0) {
        await useCalendarEventsStore.getState().refreshYears(loadedYears).catch(() => {})
      }

      await Promise.allSettled([
        useCurrentTodosStore.getState().fetch(),
        useUncompletedTodosStore.getState().fetch(),
        useForemostEventStore.getState().fetch(),
      ])

      // Done todos는 페이지네이션 상태 초기화 후 첫 페이지 재로딩
      useDoneTodosStore.setState({ items: [], cursor: null, hasMore: true, isLoading: false })
      await useDoneTodosStore.getState().fetchNext().catch(() => {})

      const totalErrors = cleanupErrors.length + result.errors.length
      const summary =
        `태그 ${result.tagCount}, todo ${result.todoCount}, 일정 ${result.scheduleCount}, 완료 ${result.doneCount}` +
        (result.foremostSet ? ', foremost ✓' : '')

      if (totalErrors === 0) {
        toast(`테스트 데이터 주입 완료 — ${summary}`, 'success')
      } else {
        toast(`테스트 데이터 주입 완료 (실패 ${totalErrors}건) — ${summary}`, 'error')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast(`테스트 데이터 주입 실패: ${msg}`, 'error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={running}
      aria-label="테스트 데이터 주입"
      title="테스트 데이터 주입 (개발환경 전용)"
      className="rounded-full p-2 hover:bg-gray-100 text-gray-500 disabled:opacity-50"
    >
      <span className={`inline-block text-base leading-none ${running ? 'animate-pulse' : ''}`}>
        🧪
      </span>
    </button>
  )
}
