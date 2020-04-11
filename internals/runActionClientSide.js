const _ = require('lodash')
const axios = require('axios')
const { deserializeError } = require("serialize-error")

module.exports = async function runActionClientSide({
  func,
  fileId,
  functionName,
  endpoint,
  details,
}) {
  const origin = getOrigin()
  const url = `${origin}${endpoint}`

  try {
    const response = await axios({
      url: endpoint,
      params: { fid: fileId, f: functionName },
      method: 'POST',
      headers: details.headers,
      data: {
        data: details.data
      },
      validateStatus: function (status) {
        return status < 500; // Reject only if the status code is greater than or equal to 500
      }
    })

    // the api endpoint handler doesn't exist
    if (response.status === 404 && !response.headers.hasOwnProperty('x-isomorphic-action'))  {
      const error = new Error(`Isomorphic actions endpoint does not exist. Expected at \`${endpoint}\`.`)
      error.status = response.status

      throw error
    }

    if (response.status > 299) {
      if (response.data.error) {
        const error = deserializeError(response.data.error)
        error.status = error.status || response.status

        throw error
      }
      else {
        const error = new Error('Something went wrong')
        error.status = response.status

        throw error
      }
    }
    
    // otherwise return the data
    return response.data
  }
  // 5xx or critical errors only
  catch (error) {
    if (error.response) {
      const error = new Error(error.response.data)
      error.status = response.status

      throw error
    }

    throw error
  }
}

function getOrigin() {
  return window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port: '')
}
