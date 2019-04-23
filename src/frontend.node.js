const frontend = require('./frontend');

module.exports = $ => {
  $ = frontend($);
  const { asNumber, f, fun } = $;
  f['node.exit'] = fun(X => process.exit(asNumber(X)));
  return $;
};
