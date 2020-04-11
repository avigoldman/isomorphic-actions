const { serializeError, deserializeError } = require("serialize-error")
const runActionServerSide = require('./runActionServerSide')
const runActionClientSide = require('./runActionClientSide')

module.exports = async function runAction({
  func,
  fileId,
  functionName,
  endpoint,
  details
}) {
  details = Object.assign({}, { data: undefined, headers: {} }, details);
  const isServer = typeof window === 'undefined'

  if (isServer) {
    if (!details.context) {
      throw new Error(`Expected \`context\` parameter containing \`req\` and \`res\` to be provided when calling \`${functionName}\` from the server. e.g.: ${functionName}({ context: { req, res } })`)
    }

    details.headers = { ...details.context.req.headers, ...details.headers }

    try {
      return runActionServerSide({ func, fileId, functionName, endpoint, details })
    }
    // run the error through the same process as if it went through an API call
    catch (error) {
      throw deserializeError(serializeError(error))
    }
  }

  return runActionClientSide({ func, fileId, functionName, endpoint, details })
}