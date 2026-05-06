import type { DoneTodo } from '../../models/DoneTodo'

export interface DoneTodoLocalStorage {
  /** 최근 done 부터 limit 개. done_at 내림차순 */
  loadRecent(limit: number): Promise<DoneTodo[]>
  loadDoneTodo(uuid: string): Promise<DoneTodo | null>
  saveDoneTodos(items: DoneTodo[]): Promise<void>
  removeDoneTodos(uuids: string[]): Promise<void>
  reset(): Promise<void>
}
