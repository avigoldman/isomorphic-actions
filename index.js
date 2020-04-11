const isFunction = require('lodash/isFunction');
const assign = require('lodash/assign');
const runAction = require('./internals/runAction')

function createAction(config) {
  if (isFunction(config)) {
    throw new Error('Babel transformation failed. Make sure you added isomorphic-actions/babel to your babel plugins correctly.')
  }

  const { func, fileId, functionName, endpoint } = config

  if (!isFunction(func)) {
    throw new Error('Function is required when creating an isomorphic action.')
  }

  function runner(details) {
    return runAction({
      func,
      fileId,
      functionName,
      endpoint,
      details
    })
  }

  return assign(runner, config)
}

/**
 * removes ability to send headers and status for a clean input/output
 * 
 * const results = await myAction('this')
 */
function createSimpleAction(config) {
  if (isFunction(config)) {
    throw new Error('Babel transformation failed. Make sure you added isomorphic-actions/babel to your babel plugins correctly.')
  }

  if (!isFunction(config.func)) {
    throw new Error('Function is required when creating an isomorphic action.')
  }

  const originalFunc = config.func
  config.func = async (details) => {
    const output = await originalFunc(details.data)

    return { results: output }
  }

  const { func, fileId, functionName, endpoint } = config

  async function runner(data) {
    const output = await runAction({
      func,
      fileId,
      functionName,
      endpoint,
      details: { data }
    })

    return output.results
  }

  return assign(runner, config)
}


module.exports = { createAction, createSimpleAction }