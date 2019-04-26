const implementation = 'Node.js';
const os =
  /win32|win64/i.test(process.platform) ? 'Windows' :
  /darwin|mac/i .test(process.platform) ? 'macOS' :
  /linux/i      .test(process.platform) ? 'Linux' :
  'Unknown';
const release = process.version.slice(1);

module.exports = { ...require('./config'), implementation, os, release };
