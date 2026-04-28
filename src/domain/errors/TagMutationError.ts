export type TagMutationFailReason =
  | { type: 'invalid_name' }
  | { type: 'duplicate_name' }
  | { type: 'cannot_delete_system_tag' }
  | { type: 'network' }
  | { type: 'forbidden' }
  | { type: 'unknown'; raw: unknown }

export class TagMutationError extends Error {
  readonly reason: TagMutationFailReason

  constructor(reason: TagMutationFailReason) {
    super(reason.type)
    this.name = 'TagMutationError'
    this.reason = reason
  }
}
