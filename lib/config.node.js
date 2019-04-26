const { multiMatch } = require('./utils');

const implementation = 'Node.js';
const os = multiMatch(process.platform,
  [/win32|win64/i, 'Windows'],
  [/darwin|mac/i , 'macOS'],
  [/linux/i      , 'Linux']);
const release = process.version.slice(1);

module.exports = { ...require('./config'), implementation, os, release };
