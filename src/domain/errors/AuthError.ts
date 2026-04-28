export type AuthFailReason =
  | { type: 'invalid_credentials' }
  | { type: 'network' }
  | { type: 'cancelled' }
  | { type: 'unknown'; raw: unknown }

export class AuthError extends Error {
  readonly reason: AuthFailReason

  constructor(reason: AuthFailReason) {
    super(reason.type)
    this.name = 'AuthError'
    this.reason = reason
  }
}
