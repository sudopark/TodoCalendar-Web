import { useState } from 'react'
import { cleanupTestData, seedTestData } from '../../dev/testDataSeeder'
import { useRepositories } from '../../composition/RepositoriesProvider'
import { useCalendarEventsCache } from '../../repositories/caches/calendarEventsCache'
import { useDoneTodosCache } from '../../repositories/caches/doneTodosCache'
import { useToastStore } from '../../stores/toastStore'

export default function TestDataSeederButton() {
  const [running, setRunning] = useState(false)
  const { tagRepo, eventRepo, foremostEventRepo, doneTodoRepo } = useRepositories()

  async function handleClick() {
    if (running) return
    setRunning(true)
    const toast = useToastStore.getState().show
    try {
      toast('dev.seeder.start', 'info')

      const cleanupErrors = await cleanupTestData()
      const result = await seedTestData()

      // 관련 store 전체 갱신
      await tagRepo.fetchAll().catch(() => {})

      const loadedYears = Array.from(useCalendarEventsCache.getState().loadedYears)
      if (loadedYears.length > 0) {
        useCalendarEventsCache.getState().invalidateYears(loadedYears)
        await Promise.allSettled(loadedYears.map(y => eventRepo.fetchEventsForYear(y)))
      }

      await Promise.allSettled([
        eventRepo.fetchCurrentTodos(),
        eventRepo.fetchUncompletedTodos(),
        foremostEventRepo.fetch(),
      ])

      // Done todos는 페이지네이션 상태 초기화 후 첫 페이지 재로딩
      useDoneTodosCache.getState().reset()
      await doneTodoRepo.fetchNextPage().catch(() => {})

      const totalErrors = cleanupErrors.length + result.errors.length
      const summary =
        `태그 ${result.tagCount}, todo ${result.todoCount}, 일정 ${result.scheduleCount}, 완료 ${result.doneCount}` +
        (result.foremostSet ? ', foremost ✓' : '')

      if (totalErrors === 0) {
        toast('dev.seeder.done', 'success', { summary })
      } else {
        toast('dev.seeder.done_with_errors', 'error', { count: totalErrors, summary })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast('dev.seeder.failed', 'error', { msg })
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
      className="rounded-full p-2 hover:bg-surface-sunken text-fg-tertiary disabled:opacity-50"
    >
      <span className={`inline-block text-base leading-none ${running ? 'animate-pulse' : ''}`}>
        🧪
      </span>
    </button>
  )
}
