// generated filepath: isomorphic-actions/handler

// const actionFilesMap = { /* object of imports for files that create actions */ }

const { serializeError } = require('serialize-error')
const runActionServerSide = require('./internals/runActionServerSide')

module.exports = () => async function requestHandler(req, res) {
  const fileId = req.query.fid
  const functionName = req.query.f
  const importActionFile = actionFilesMap[fileId]

  res.setHeader('X-Isomorphic-Action', 'true')

  if (!importActionFile) {
    const error = new Error(`Function \`${functionName}\` not found. File ID \`${fileId}\` does not exist.`)
    error.status = 404
    return res.status(404).json(
      { error: serializeError(error) }
    )
  }

  // grab the func property - it is the original function given to createAction
  const func = (await importActionFile())[functionName].func
  const details = {
    data: req.body.data,
    headers: req.headers,
    context: { req, res }
  }

  if (!func) {
    const error = new Error(`Function \`${functionName}\` not found.`)
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
    const output = await runActionServerSide({ func, fileId, functionName, details })

    if (!res.headersSent) {
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