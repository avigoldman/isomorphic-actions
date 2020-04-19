const toArray = require('lodash/toArray')

function middleware() {
  const functions = toArray(arguments)

  return async function runMiddleware(context, next = () => {}) {
    for (let func of functions) {

      let calledNext = false;
      const next = (newContext = context) => {
        calledNext = true;
        context = newContext;
      }

      const results = await func(context, next)

      if (!calledNext) {
        return results
      }
    }

    next()
  }
}

module.exports = middleware