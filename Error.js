module.exports = class IsomorphicError extends Error {
  constructor(message, { status, data, headers } = {}) {
    super(message);
    this.name = 'IsomorphicError'
    Error.captureStackTrace(this, IsomorphicError)
    this.status = status || 400;
    this.data = data;
    this.headers = headers;
  }
}