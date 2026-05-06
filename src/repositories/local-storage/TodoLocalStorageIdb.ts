import type { IDBPDatabase } from 'idb'
import type { Todo } from '../../models/Todo'
import type { TodoLocalStorage } from './TodoLocalStorage'

const STORE = 'todos' as const

export class TodoLocalStorageIdb implements TodoLocalStorage {
  private readonly db: IDBPDatabase
  constructor(db: IDBPDatabase) { this.db = db }

  async loadCurrentTodos(): Promise<Todo[]> {
    const tx = this.db.transaction(STORE, 'readonly')
    const all = await tx.store.getAll()
    return all.filter((t): t is Todo => (t as Todo).is_current === true)
  }

  async loadTodos(range: { lower: number; upper: number }): Promise<Todo[]> {
    const tx = this.db.transaction(STORE, 'readonly')
    const idx = tx.store.index('time.timestamp')
    const keyRange = IDBKeyRange.bound(range.lower, range.upper)
    return (await idx.getAll(keyRange)) as Todo[]
  }

  async loadUncompletedTodos(now: number): Promise<Todo[]> {
    const tx = this.db.transaction(STORE, 'readonly')
    const idx = tx.store.index('time.timestamp')
    const keyRange = IDBKeyRange.upperBound(now)
    const all = (await idx.getAll(keyRange)) as Todo[]
    return all.filter((t) => t.is_current === false)
  }

  async loadTodo(uuid: string): Promise<Todo | null> {
    const result = await this.db.get(STORE, uuid)
    return (result as Todo | undefined) ?? null
  }

  async saveTodos(todos: Todo[]): Promise<void> {
    if (todos.length === 0) return
    const tx = this.db.transaction(STORE, 'readwrite')
    await Promise.all(todos.map((t) => tx.store.put(t)))
    await tx.done
  }

  async updateTodo(todo: Todo): Promise<void> {
    await this.db.put(STORE, todo)
  }

  async removeTodos(uuids: string[]): Promise<void> {
    if (uuids.length === 0) return
    const tx = this.db.transaction(STORE, 'readwrite')
    await Promise.all(uuids.map((u) => tx.store.delete(u)))
    await tx.done
  }

  async removeTodosWith(tagId: string): Promise<string[]> {
    const tx = this.db.transaction(STORE, 'readwrite')
    const idx = tx.store.index('event_tag_id')
    const matched = (await idx.getAll(tagId)) as Todo[]
    const uuids = matched.map((t) => t.uuid)
    await Promise.all(uuids.map((u) => tx.store.delete(u)))
    await tx.done
    return uuids
  }

  async reset(): Promise<void> {
    await this.db.clear(STORE)
  }
}
