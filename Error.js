module.exports = class IsomorphicError extends Error {
  constructor(message, { status, key, data } = {}) {
    super(message);
    this.name = 'IsomorphicError'
    Error.captureStackTrace(this, IsomorphicError)
    this.status = status || 400;
    this.key = key;
    this.data = data;
  }
}