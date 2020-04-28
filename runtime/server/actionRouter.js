const serialize = require('../../utils/serialize')
const deserialize = require('../../utils/deserialize')
const { serializeError } = require('serialize-error')
const get = require('lodash/get')
const formidable = require('formidable')
const IsomorphicError = require('../../error')

module.exports = (routes) => async function requestHandler(req, res) {
  const url = new URL(`http://example.com${req.url}`)
  const routeId = url.searchParams.get('a')
  const { debug, data, files } = await parseReq(req)

  res.setHeader('X-Isomorphic-Action', 'true')

  const func = routes[routeId]
  const context = {
    data,
    files,
    headers: req.headers,
    req,
    res
  }

  if (!func) {
    const error = new IsomorphicError(`Function \`${debug.functionName}\` not found.`, { status: 404 })
    return res.status(404).json(
      { error: serializeError(error) }
    )
  }

  if (req.method !== 'POST') {
    const error = new IsomorphicError(`Method not allowed. Given method: \`${req.method}\`. Expected method: \`POST\`.`, { status: 405 })
    return res.status(405).json(
      { error: serializeError(error) }
    )
  }

  try {
    const output = await func(context)

    if (!res.headersSent) {
      res.json({
        data: serialize(output)
      })
    }
  }
  catch(error) {
    if (!error.status) {
      error.status = 400
    }

    if (!res.headersSent) {
      res.status(error.status).json(
        { error: serializeError(error) }
      )
    }
  }
}

const parseReq = (req) => {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: true });

    form.parse(req, (error, fields, files) => {
      if (error) {
        return reject(error)
      }

      return resolve({
        files: Object.values(files),
        debug: JSON.parse(get(fields, 'debug')),
        data: deserialize(get(fields, 'data')),
      })
    });
  })
}