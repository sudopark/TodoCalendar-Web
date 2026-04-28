export type EventDeletionFailReason =
  | { type: 'not_found' }
  | { type: 'invalid_scope' }
  | { type: 'network' }
  | { type: 'forbidden' }
  | { type: 'unknown'; raw: unknown }

export class EventDeletionError extends Error {
  readonly reason: EventDeletionFailReason

  constructor(reason: EventDeletionFailReason) {
    super(reason.type)
    this.name = 'EventDeletionError'
    this.reason = reason
  }
}
