import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { HolidayRepository } from '../../src/repositories/HolidayRepository'
import { LocalStorageContainer } from '../../src/repositories/local-storage/LocalStorageContainer'
import { useHolidayCache } from '../../src/repositories/caches/holidayCache'
import type { HolidayItem } from '../../src/models/Holiday'

const TEST_UID = 'hol-cf'
async function deleteDb(uid: string) {
  await new Promise<void>((r) => { const req = indexedDB.deleteDatabase(`todocal-cache:${uid}`); req.onsuccess = req.onerror = req.onblocked = () => r() })
}

const sample: HolidayItem[] = [
  { summary: '신정', start: { date: '2025-01-01' }, end: { date: '2025-01-02' } } as HolidayItem,
]

describe('HolidayRepository.fetch — cache-first', () => {
  let container: LocalStorageContainer
  let holidayApi: { getHolidays: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    container = new LocalStorageContainer()
    await container.init(TEST_UID)
    useHolidayCache.getState().reset()
    holidayApi = { getHolidays: vi.fn() }
  })

  afterEach(async () => {
    await container.dispose()
    await deleteDb(TEST_UID)
    useHolidayCache.getState().reset()
  })

  it('LocalStorage 에 year 가 있으면 메모리에 즉시 set, Remote 후 갱신', async () => {
    await container.holiday().saveYear(2025, sample)
    holidayApi.getHolidays.mockResolvedValue({
      items: [{ summary: '삼일절', start: { date: '2025-03-01' }, end: { date: '2025-03-02' } } as HolidayItem],
    })

    const repo = new HolidayRepository({
      api: holidayApi as any,
      initialLocale: 'ko',
      localStorageContainer: container,
    })
    await repo.fetch(2025)

    // 메모리 store 에는 Remote 응답 (삼일절)
    const holidays = useHolidayCache.getState().holidays
    let foundRemote = false
    for (const [, names] of holidays) {
      if (names.includes('삼일절')) foundRemote = true
    }
    expect(foundRemote).toBe(true)

    // LocalStorage 도 갱신
    const persisted = await container.holiday().loadYear(2025)
    expect(persisted?.[0]?.summary).toBe('삼일절')
  })

  it('LocalStorage 비어있을 때 Remote 만으로 동작', async () => {
    holidayApi.getHolidays.mockResolvedValue({ items: sample })
    const repo = new HolidayRepository({
      api: holidayApi as any,
      initialLocale: 'ko',
      localStorageContainer: container,
    })
    await repo.fetch(2025)
    expect((await container.holiday().loadYear(2025))?.length).toBe(1)
  })

  it('localStorageContainer 미주입이면 Remote 만 (호환성)', async () => {
    holidayApi.getHolidays.mockResolvedValue({ items: sample })
    const repo = new HolidayRepository({ api: holidayApi as any, initialLocale: 'ko' })
    await expect(repo.fetch(2025)).resolves.toBeUndefined()
  })
})
