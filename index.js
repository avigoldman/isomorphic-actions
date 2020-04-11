const isFunction = require('lodash/isFunction');
const assign = require('lodash/assign');
const runAction = require('./internals/runAction')

function createAction(config) {
  if (isFunction(config)) {
    throw new Error('Babel transformation failed. Make sure you added isomorphic-actions/babel to your babel plugins correctly.')
  }

  const { fileId, functionName, endpoint } = config

  function runner(context) {
    return runAction({
      fileId,
      functionName,
      endpoint,
      context
    })
  }

  return assign(runner, config)
}

module.exports = { createAction }