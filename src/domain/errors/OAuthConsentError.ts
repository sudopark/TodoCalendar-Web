export class InvalidChallengeError extends Error {
  readonly code = 'invalid_challenge'
  constructor() {
    super('Invalid or expired challenge')
    this.name = 'InvalidChallengeError'
  }
}

export class OAuthAsTransientError extends Error {
  readonly code = 'as_transient'
  readonly status?: number
  readonly cause?: unknown

  constructor(status?: number, cause?: unknown) {
    super(`AS transient error${status ? ` (${status})` : ''}`)
    this.name = 'OAuthAsTransientError'
    this.status = status
    this.cause = cause
  }
}
