/**
 * Thrown for any non-2xx HTTP response. Carries the parsed response body
 * (when the server returned JSON — Nest's default error responses always
 * do) so callers can show a specific validation message rather than a
 * generic "something went wrong."
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  /** True for 401 Unauthorized — the caller likely needs to re-authenticate. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}
