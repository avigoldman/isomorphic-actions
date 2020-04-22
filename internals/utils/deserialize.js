const safeEval = require('safe-eval')

module.exports = function deserialize(str) {
  return safeEval('(' + str + ')');
}