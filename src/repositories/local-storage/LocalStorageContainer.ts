import type { IDBPDatabase } from 'idb'
import { openLocalCacheDb, USER_OBJECT_STORES } from './database'
import { TodoLocalStorageIdb } from './TodoLocalStorageIdb'
import { ScheduleLocalStorageIdb } from './ScheduleLocalStorageIdb'
import { EventTagLocalStorageIdb } from './EventTagLocalStorageIdb'
import { EventDetailLocalStorageIdb } from './EventDetailLocalStorageIdb'
import { DoneTodoLocalStorageIdb } from './DoneTodoLocalStorageIdb'
import { ForemostEventLocalStorageIdb } from './ForemostEventLocalStorageIdb'
import { HolidayLocalStorageIdb } from './HolidayLocalStorageIdb'
import type { TodoLocalStorage } from './TodoLocalStorage'
import type { ScheduleLocalStorage } from './ScheduleLocalStorage'
import type { EventTagLocalStorage } from './EventTagLocalStorage'
import type { EventDetailLocalStorage } from './EventDetailLocalStorage'
import type { DoneTodoLocalStorage } from './DoneTodoLocalStorage'
import type { ForemostEventLocalStorage } from './ForemostEventLocalStorage'
import type { HolidayLocalStorage } from './HolidayLocalStorage'

interface ActiveSession {
  uid: string
  db: IDBPDatabase
  todo: TodoLocalStorage
  schedule: ScheduleLocalStorage
  eventTag: EventTagLocalStorage
  eventDetail: EventDetailLocalStorage
  doneTodo: DoneTodoLocalStorage
  foremost: ForemostEventLocalStorage
  holiday: HolidayLocalStorage
}

/**
 * uid 별 IDB 연결과 도메인 LocalStorage 인스턴스를 관리한다.
 * AuthGuard 가 인증 확정 시 init(uid), signOut 시 clearUserStores + dispose 호출.
 * init 전에 storage getter 호출 시 에러.
 */
export class LocalStorageContainer {
  private session: ActiveSession | null = null

  async init(uid: string): Promise<void> {
    if (this.session?.uid === uid) return
    if (this.session) await this.dispose()

    const db = await openLocalCacheDb(uid)
    this.session = {
      uid,
      db,
      todo: new TodoLocalStorageIdb(db),
      schedule: new ScheduleLocalStorageIdb(db),
      eventTag: new EventTagLocalStorageIdb(db),
      eventDetail: new EventDetailLocalStorageIdb(db),
      doneTodo: new DoneTodoLocalStorageIdb(db),
      foremost: new ForemostEventLocalStorageIdb(db),
      holiday: new HolidayLocalStorageIdb(db),
    }
  }

  async dispose(): Promise<void> {
    if (!this.session) return
    this.session.db.close()
    this.session = null
  }

  /**
   * 사용자 데이터 store 만 비운다 (holidays, meta 보존).
   * signOut/계정 전환 시 호출.
   */
  async clearUserStores(): Promise<void> {
    if (!this.session) return
    const tx = this.session.db.transaction(USER_OBJECT_STORES, 'readwrite')
    await Promise.all(USER_OBJECT_STORES.map((name) => tx.objectStore(name).clear()))
    await tx.done
  }

  todo(): TodoLocalStorage { return this.requireSession().todo }
  schedule(): ScheduleLocalStorage { return this.requireSession().schedule }
  eventTag(): EventTagLocalStorage { return this.requireSession().eventTag }
  eventDetail(): EventDetailLocalStorage { return this.requireSession().eventDetail }
  doneTodo(): DoneTodoLocalStorage { return this.requireSession().doneTodo }
  foremost(): ForemostEventLocalStorage { return this.requireSession().foremost }
  holiday(): HolidayLocalStorage { return this.requireSession().holiday }

  isInitialized(): boolean {
    return this.session !== null
  }

  private requireSession(): ActiveSession {
    if (!this.session) throw new Error('LocalStorageContainer is not initialized')
    return this.session
  }
}
