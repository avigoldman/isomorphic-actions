const { serializeError, deserializeError } = require("serialize-error")
const runActionServerSide = require('./runActionServerSide')
const runActionClientSide = require('./runActionClientSide')

module.exports = async function runAction({
  actionId,
  fileId,
  endpoint,
  debug,
  context
}) {
  context = Object.assign({}, { data: null, headers: {} }, context);
  const isServer = typeof window === 'undefined'

  if (isServer) {
    if (!context.req || !context.res) {
      throw new Error(`Expected \`req\` and \`res\` to be provided when calling \`${functionName}\` from the server. e.g.: ${functionName}({ req, res })`)
    }

    context.headers = { ...context.req.headers, ...context.headers }

    if (!endpoint.startsWith('http')) {
      const origin = context.req.protocol ? context.req.protocol : 'http' + '://' + context.req.headers.host
      endpoint = `${origin}${endpoint}`
    }

    return runActionClientSide({ actionId, fileId, endpoint, debug, context })
  }

  return runActionClientSide({ actionId, fileId, endpoint, debug, context })
}