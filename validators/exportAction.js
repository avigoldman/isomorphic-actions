const isFunction = require('lodash/isFunction')

module.exports = (action) => {
  if (!isFunction(action)) {
    throw new Error(`Isomorphic action must be a function. Received: ${typeof action}.`)
  }

  return action
}