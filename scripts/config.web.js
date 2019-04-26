const implementation =
  /edge/i            .test(navigator.userAgent) ? 'Edge' :
  /trident|explorer/i.test(navigator.userAgent) ? 'Internet Explorer' :
  /chrome/i          .test(navigator.userAgent) ? 'Chrome' :
  /opera/i           .test(navigator.userAgent) ? 'Opera' :
  /firefox/i         .test(navigator.userAgent) ? 'Firefox' :
  /safari/i          .test(navigator.userAgent) ? 'Safari' :
  /vivaldi/i         .test(navigator.userAgent) ? 'Vivaldi' :
  /android/i         .test(navigator.userAgent) ? 'Android' :
  'Unknown';
const os =
  /win32|win64/i           .test(navigator.userAgent) ? 'Windows' :
  /darwin|mac/i            .test(navigator.userAgent) ? 'macOS' :
  /darwin|ios|iphone|ipad/i.test(navigator.userAgent) ? 'iOS' :
  /linux/i                 .test(navigator.userAgent) ? 'Linux' :
  /droid/i                 .test(navigator.userAgent) ? 'Android' :
  /x11/i                   .test(navigator.userAgent) ? 'Unix' :
  'Unknown';
const release = (() => {
  let ua = navigator.userAgent,
      tem,
      m = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
  if (/trident/i.test(m[1])) {
    tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
    return (tem[1] || '');
  }
  if (m[1] === 'Chrome'){
    tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
    if (tem != null) return tem[2];
  }
  m = m[2] ? [m[1], m[2]] : [navigator.appName, navigator.appVersion, '-?'];
  if ((tem = ua.match(/version\/(\d+)/i)) != null) m.splice(1, 1, tem[1]);
  return m[1];
})();

module.exports = { ...require('./config'), implementation, os, release };
