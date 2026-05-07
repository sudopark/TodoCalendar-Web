import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ForemostEventRepository } from '../../src/repositories/ForemostEventRepository'
import { LocalStorageContainer } from '../../src/repositories/local-storage/LocalStorageContainer'
import type { ForemostEvent } from '../../src/models'

const TEST_UID = 'fm-write'
async function deleteDb(uid: string) {
  await new Promise<void>((r) => {
    const req = indexedDB.deleteDatabase(`todocal-cache:${uid}`)
    req.onsuccess = req.onerror = req.onblocked = () => r()
  })
}

describe('ForemostEventRepository — mutation LocalStorage write sync', () => {
  let container: LocalStorageContainer
  let foremostApi: { setForemostEvent: ReturnType<typeof vi.fn>; removeForemostEvent: ReturnType<typeof vi.fn>; getForemostEvent: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    container = new LocalStorageContainer()
    await container.init(TEST_UID)
    foremostApi = { setForemostEvent: vi.fn(), removeForemostEvent: vi.fn(), getForemostEvent: vi.fn() }
  })

  afterEach(async () => {
    await container.dispose()
    await deleteDb(TEST_UID)
  })

  it('set 응답값이 LocalStorage 에 저장된다', async () => {
    const event: ForemostEvent = { event_id: 'e-1', is_todo: true } as ForemostEvent
    foremostApi.setForemostEvent.mockResolvedValue(event)

    const repo = new ForemostEventRepository({ api: foremostApi as any, localStorageContainer: container })
    await repo.set('e-1', true)

    expect(await container.foremost().load()).toEqual(event)
  })

  it('clear 응답 후 LocalStorage 에서도 제거된다', async () => {
    await container.foremost().save({ event_id: 'pre', is_todo: true } as ForemostEvent)
    foremostApi.removeForemostEvent.mockResolvedValue({ status: 'ok' })

    const repo = new ForemostEventRepository({ api: foremostApi as any, localStorageContainer: container })
    await repo.clear()

    expect(await container.foremost().load()).toBeNull()
  })

  it('localStorageContainer 미주입 호환성', async () => {
    const event: ForemostEvent = { event_id: 'r', is_todo: true } as ForemostEvent
    foremostApi.setForemostEvent.mockResolvedValue(event)

    const repo = new ForemostEventRepository({ api: foremostApi as any })
    await expect(repo.set('r', true)).resolves.toBeUndefined()
  })
})