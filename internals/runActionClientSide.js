const _ = require('lodash')
const axios = require('axios')
const { deserializeError } = require("serialize-error")
const IsomorphicError = require('../Error')

module.exports = async function runActionClientSide({
  exportId,
  fileId,
  endpoint,
  debug,
  context 
}) {
  try {
    const response = await axios({
      url: endpoint,
      params: { f: fileId, e: exportId },
      method: 'POST',
      headers: context.headers,
      data: {
        data: context.data,
        debug: debug
      },
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
    return _.isPlainObject(response.data) ? { ...response.data, __response: response } : response.data
  }
  // 5xx or critical errors only
  catch (error) {
    if (error.response) {
      throw new IsomorphicError(error.response.data, { status: error.response.status })
    }

    throw error
  }
}