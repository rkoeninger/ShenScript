module.exports = {
  ...require('./config'),
  implementation: 'Node.js',
  release:        process.version.slice(1),
  os:             process.platform
};
