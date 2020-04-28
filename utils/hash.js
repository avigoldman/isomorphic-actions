const s = require('short-hash');

// prefix with "a" so it never starts with a number
module.exports = (v) => `a${s(v)}`
