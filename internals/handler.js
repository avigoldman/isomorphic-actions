// generated filepath: isomorphic-actions/handler

// const actionFilesMap = { /* object of imports for files that create actions */ }

const { serializeError } = require('serialize-error')
const get = require('lodash/get')
const formidable = require('formidable')
const runActionServerSide = require('./internals/runActionServerSide')

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
        data: JSON.parse(get(fields, 'data')),
      })
    });
  })
}

module.exports = () => async function requestHandler(req, res) {
  const actionId = req.query.a
  const fileId = req.query.f
  const importActionFile = actionFilesMap[fileId]
  const { debug, data, files } = await parseReq(req)

  res.setHeader('X-Isomorphic-Action', 'true')

  if (!importActionFile) {
    const error = new Error(`Function \`${debug.functionName}\` not found. File \`${debug.filename}\` was not imported.`)
    error.status = 404
    return res.status(404).json(
      { error: serializeError(error) }
    )
  }

  const func = get(await importActionFile(), '__action__'+actionId)
  const context = {
    data,
    files,
    headers: req.headers,
    req,
    res
  }


  if (!func) {
    const error = new Error(`Function \`${debug.functionName}\` not found.`)
    error.status = 404
    return res.status(404).json(
      { error: serializeError(error) }
    )
  }

  if (req.method !== 'POST') {
    const error = new Error(`Method not allowed. Given method: \`${req.method}\`. Expected method: \`POST\`.`)
    error.status = 405
    return res.status(405).json(
      { error: serializeError(error) }
    )
  }

  try {
    const output = await runActionServerSide({ func, actionId, fileId, debug, context })

    if (!res.headersSent) {
      for (let [key, value] of Object.entries(output.headers)) {
        res.setHeader(key, value)
      }

      res.status(output.status).json(output)
    }
  }
  catch(error) {
    if (!res.headersSent) {
      res.status(error.status).json(
        { error: serializeError(error) }
      )
    }
  }
}