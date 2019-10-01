const { multiMatch } = require('./utils.js');

const implementation = multiMatch(
  navigator.userAgent,
  [/edge/i,             'Edge'],
  [/trident|explorer/i, 'Internet Explorer'],
  [/chrome/i,           'Chrome'],
  [/opera/i,            'Opera'],
  [/firefox/i,          'Firefox'],
  [/safari/i,           'Safari'],
  [/vivaldi/i,          'Vivaldi'],
  [/android/i,          'Android']);
const os = multiMatch(
  navigator.userAgent,
  [/win32|win64/i,            'Windows'],
  [/darwin|mac/i,             'macOS'],
  [/darwin|ios|iphone|ipad/i, 'iOS'],
  [/linux/i,                  'Linux'],
  [/droid/i,                  'Android'],
  [/x11/i,                    'Unix']);
const release = (() => {
  let ua = navigator.userAgent,
      tem,
      m = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*([\d.]+)/i) || [];
  if (/trident/i.test(m[1])) {
    tem = /\brv[ :]+([\d.]+)/g.exec(ua) || [];
    return (tem[1] || '');
  }
  if (m[1] === 'Chrome'){
    tem = ua.match(/\b(OPR|Edge)\/([\d.]+)/);
    if (tem != null) return tem[2];
  }
  m = m[2] ? [m[1], m[2]] : [navigator.appName, navigator.appVersion, '-?'];
  if ((tem = ua.match(/version\/([\d.]+)/i)) != null) m.splice(1, 1, tem[1]);
  return m[1];
})();

module.exports = { ...require('./config'), implementation, os, release };
