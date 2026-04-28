export type SettingsUpdateFailReason =
  | { type: 'invalid_value' }
  | { type: 'network' }
  | { type: 'forbidden' }
  | { type: 'unknown'; raw: unknown }

export class SettingsUpdateError extends Error {
  readonly reason: SettingsUpdateFailReason

  constructor(reason: SettingsUpdateFailReason) {
    super(reason.type)
    this.name = 'SettingsUpdateError'
    this.reason = reason
  }
}
