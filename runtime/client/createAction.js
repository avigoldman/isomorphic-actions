const isFunction = require('lodash/isFunction')
const runAction = require('./runAction')

module.exports = function createAction(config) {
  if (isFunction(config)) {
    throw new Error('Babel transformation failed. Make sure you added isomorphic-actions/babel to your babel plugins correctly.')
  }


  const { actionId, fileId, endpoint, debug } = config

  return function runner(context) {
    return runAction({
      actionId,
      fileId,
      endpoint,
      debug,
      context
    })
  }
}
