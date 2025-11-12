// patch.js
const crypto = require('crypto');

if (!global.crypto) {
  global.crypto = crypto;
}

require('./dist/main.js');
