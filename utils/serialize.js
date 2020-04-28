const serialize = require('serialize-javascript');

module.exports = (obj) => serialize(obj, {
  unsafe: true, // don't html escape
  ignoreFunction: true // don't pass through functions
});