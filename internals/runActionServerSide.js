const isPlainObject = require('lodash/isPlainObject')
const isUndefined = require('lodash/isUndefined')
const allowedKeys = ['data', 'headers', 'status']

module.exports = async function runActionServerSide({
  func,
  context
}) {
  try {
    const output = await func(context)
    return output
  }
  catch(error) {
    if (!error.status) {
      error.status = 400
    }

    throw error
  }
}