const isPlainObject = require('lodash/isplainobject')
const allowedKeys = ['results', 'status']

module.exports = async function runActionServerSide({
  func,
  fileId,
  functionName,
  details
}) {
  try {
    const output = await func(details)

    // output validation
    if (!isPlainObject(output)) {
      throw new Error(`Expected \`${functionName}\` to return an object. e.g.: return { results: { title: 'My Title', content: '...' } }`)
    }

    const keys = Object.keys(output)
    const extraKeys = keys.filter((k) => !allowedKeys.includes(k))

    // output validation
    if (extraKeys.length > 0) {
      throw new Error(`Additional keys were returned from \`${functionName}\`. The output of your function must be nested under the \`results\` key, e.g.: return { results: { title: 'My Title', content: '...' } } Keys that need to be moved: ${extraKeys}.`)
    }

    // TODO: what happens if they return a status above 400
    if (output.status > 299) {
      throw new Error(`\`${functionName}\` returned a status of ${output.status}. To respond with a status above 299, you must throw an error with the status set in in the \`status\` property. You can throw an \`IsomorphicError\` to do this. ie.g.: throw new IsomorphicError('My error', { status: 401 })`)
    }

    return Object.assign({}, { results: null, status: 200 }, output)

  }
  catch(error) {
    if (!error.status) {
      error.status = 400
    }

    throw error
  }
}