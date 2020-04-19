module.exports = function connect(ware) {
  return function runConnect(context, next) {
    return ware(context.req, context.res, () => next(context))
  }
}