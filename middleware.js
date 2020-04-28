const middleware = require('./runtime/server/middleware')
middleware.connect = require('./runtime/server/middleware/connect')

module.exports = middleware