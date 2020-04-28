const isFunction = require('lodash/isFunction')
const middleware = require('./middleware')

module.exports = (...actions) => {
  if (actions.find((action) => !isFunction(action))) {
    throw new Error(`Isomorphic action must be a function. Received: ${typeof action}.`)
  }

  return middleware(...actions)
}