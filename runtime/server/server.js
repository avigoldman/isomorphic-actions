/**
 * server -> actionRouter -> action
 */
const path = require('path')
const _ = require('lodash')
const IsomorphicError = require('../../error')
const { serializeError } = require('serialize-error')

module.exports = ({ output = process.env.ISOMORPHIC_ACTIONS_OUTPUT } = {}) => (req, res) => {
  const url = new URL(`http://example.com${req.url}`)
  const fileId = _.last(url.pathname.split('/'))

  let actionRouter
  try {
    actionRouter = require(path.join(output, `${fileId}.js`)).default
  }
  catch(e) {
    const error = new IsomorphicError(`File not found.`, { status: 404 })
    res.setHeader('X-Isomorphic-Action', 'true')

    return res.status(404).json(
      { error: serializeError(error) }
    )
  }

  return actionRouter(req, res)
}