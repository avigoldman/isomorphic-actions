const isFunction = require('lodash/isFunction');
const runAction = require('./internals/runAction')

function createAction(config) {
  if (isFunction(config)) {
    throw new Error('Babel transformation failed. Make sure you added isomorphic-actions/babel to your babel plugins correctly.')
  }


  const { exportId, fileId, endpoint, debug } = config

  return function runner(context) {
    return runAction({
      exportId,
      fileId,
      endpoint,
      debug,
      context
    })
  }
}

module.exports = { createAction }