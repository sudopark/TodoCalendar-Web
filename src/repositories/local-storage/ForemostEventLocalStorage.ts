import type { ForemostEvent } from '../../models/ForemostEvent'

export interface ForemostEventLocalStorage {
  load(): Promise<ForemostEvent | null>
  save(event: ForemostEvent): Promise<void>
  remove(): Promise<void>
  reset(): Promise<void>
}
