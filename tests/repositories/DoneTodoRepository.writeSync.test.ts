import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DoneTodoRepository } from '../../src/repositories/DoneTodoRepository'
import { LocalStorageContainer } from '../../src/repositories/local-storage/LocalStorageContainer'
import type { DoneTodo } from '../../src/models/DoneTodo'
import type { Todo } from '../../src/models/Todo'

const TEST_UID = 'done-write'
const doneOf = (uuid: string): DoneTodo => ({ uuid, origin_event_id: 'o-' + uuid, name: 'd-' + uuid, done_at: 1000 } as DoneTodo)
const todoOf = (uuid: string): Todo => ({
  uuid, name: 't-' + uuid, is_current: false, event_tag_id: null,
  event_time: { time_type: 'at', timestamp: 1000 }, repeating: null, notification_options: null,
} as Todo)

async function deleteDb(uid: string) {
  await new Promise<void>((r) => {
    const req = indexedDB.deleteDatabase(`todocal-cache:${uid}`)
    req.onsuccess = req.onerror = req.onblocked = () => r()
  })
}

describe('DoneTodoRepository — mutation LocalStorage write sync', () => {
  let container: LocalStorageContainer
  let doneApi: { getDoneTodos: ReturnType<typeof vi.fn>; deleteDoneTodo: ReturnType<typeof vi.fn>; revertDoneTodo: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    container = new LocalStorageContainer()
    await container.init(TEST_UID)
    doneApi = { getDoneTodos: vi.fn(), deleteDoneTodo: vi.fn(), revertDoneTodo: vi.fn() }
  })

  afterEach(async () => {
    await container.dispose()
    await deleteDb(TEST_UID)
  })

  it('revert 후 LocalStorage 의 doneTodo 가 제거된다', async () => {
    await container.doneTodo().saveDoneTodos([doneOf('d-1')])
    doneApi.revertDoneTodo.mockResolvedValue({ todo: todoOf('o-d-1') })

    const repo = new DoneTodoRepository({ api: doneApi as any, localStorageContainer: container })
    await repo.revert('d-1')

    expect(await container.doneTodo().loadDoneTodo('d-1')).toBeNull()
  })

  it('remove 후 LocalStorage 의 doneTodo 가 제거된다', async () => {
    await container.doneTodo().saveDoneTodos([doneOf('d-1')])
    doneApi.deleteDoneTodo.mockResolvedValue({ status: 'ok' })

    const repo = new DoneTodoRepository({ api: doneApi as any, localStorageContainer: container })
    await repo.remove('d-1')

    expect(await container.doneTodo().loadDoneTodo('d-1')).toBeNull()
  })

  it('localStorageContainer 미주입 호환성', async () => {
    doneApi.deleteDoneTodo.mockResolvedValue({ status: 'ok' })
    const repo = new DoneTodoRepository({ api: doneApi as any })
    await expect(repo.remove('d-1')).resolves.toBeUndefined()
  })
})