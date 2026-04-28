export type EventSaveFailReason =
  | { type: 'invalid_name' }
  | { type: 'invalid_time' }
  | { type: 'network' }
  | { type: 'forbidden' }
  | { type: 'unknown'; raw: unknown }

export class EventSaveError extends Error {
  readonly reason: EventSaveFailReason

  constructor(reason: EventSaveFailReason) {
    super(reason.type)
    this.name = 'EventSaveError'
    this.reason = reason
  }
}
