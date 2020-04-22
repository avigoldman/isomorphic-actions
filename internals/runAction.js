const _ = require('lodash')
const axios = require('axios')
const serialize = require('./utils/serialize')
const deserialize = require('./utils/deserialize')
const { deserializeError } = require("serialize-error")
const IsomorphicError = require('../Error')
const Data = require('form-data');


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
  }

  // Run remote request
  const body = new Data()
  body.append('debug', JSON.stringify(debug))
  body.append('data', serialize(context.data))
  
  if (context.files) {
    _.toArray(context.files).forEach((file, i) => {
      body.append(`files[${i}]`, file);
    })
  }

  try {
    const response = await axios({
      url: endpoint,
      params: { a: actionId, f: fileId },
      method: 'POST',
      headers: {
        ...context.headers,
        ...(body.getHeaders ? body.getHeaders() : {})
      },
      data: body,
      validateStatus: function (status) {
        return status < 500; // Reject only if the status code is greater than or equal to 500
      }
    })

    // the api endpoint handler doesn't exist
    if (response.status === 404 && !response.headers.hasOwnProperty('x-isomorphic-action'))  {
      throw new IsomorphicError(`Isomorphic actions endpoint does not exist. Expected at \`${endpoint}\`.`, { status: response.status })
    }

    if (response.status > 299) {
      if (response.data.error) {
        const error = deserializeError(response.data.error)
        error.status = error.status || response.status

        throw error
      }
      else {
        throw new IsomorphicError('Something went wrong', {
          status: response.status,
          data: response.data,
          headers: response.headers
        })
      }
    }
    
    // otherwise return the data (with response attached if possible)
    const output = deserialize(response.data.data)
    return _.isPlainObject(output) ? { ...output, __response: response } : output
  }
  // 5xx or critical errors only
  catch (error) {
    if (error.response) {
      throw new IsomorphicError(error.response.data, { status: error.response.status })
    }

    throw error
  }
}