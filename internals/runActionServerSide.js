const isPlainObject = require('lodash/isPlainObject')
const isUndefined = require('lodash/isUndefined')
const allowedKeys = ['data', 'headers', 'status']

module.exports = async function runActionServerSide({
  func,
  exportId,
  fileId,
  debug,
  context
}) {
  try {
    const output = await func(context)

    // output validation
    if (!isPlainObject(output)) {
      throw new Error(`Expected \`${debug.functionName}\` to return an object. e.g.: return { data: { title: 'My Title', content: '...' } }`)
    }

    const keys = Object.keys(output)
    const extraKeys = keys.filter((k) => !allowedKeys.includes(k))

    // output validation
    if (extraKeys.length > 0) {
      throw new Error(`Additional keys were returned from \`${debug.functionName}\`. The output of your function must be nested under the \`data\` key, e.g.: return { data: { title: 'My Title', content: '...' } } Keys that need to be moved: ${extraKeys}.`)
    }

    // TODO: what happens if they return a status above 400
    if (output.status > 299) {
      throw new Error(`\`${debug.functionName}\` returned a status of ${output.status}. To respond with a status above 299, you must throw an error with the status set in in the \`status\` property. You can throw an \`IsomorphicError\` to do this. ie.g.: throw new IsomorphicError('My error', { status: 401 })`)
    }

    if (!isUndefined(output.headers) && !isPlainObject(output.headers)) {
      throw new Error(`Expected \`headers\` key \`${functionName}\` to an object. Received ${typeof output.headers}.`)
    }

    return Object.assign({}, { data: null, headers: {}, status: 200 }, output)

  }
  catch(error) {
    if (!error.status) {
      error.status = 400
    }

    throw error
  }
}