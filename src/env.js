'use strict';
var env = {
    os() {
        if (typeof navigator !== 'undefined') {
            if (navigator.platform) {
                if (navigator.platform.toLowerCase() === 'win32') return 'Windows';
                if (navigator.platform.toLowerCase() === 'win64') return 'Windows';
            }
            if (navigator.userAgent) {
                if (navigator.userAgent.indexOf('Win') != -1) return 'Windows';
                if (navigator.userAgent.indexOf('Mac') != -1) return 'macOS';
                if (navigator.userAgent.indexOf('iPhone') != -1) return 'iOS';
                if (navigator.userAgent.indexOf('iPad') != -1) return 'iOS';
                if (navigator.userAgent.indexOf('iOS') != -1) return 'iOS';
                if (navigator.userAgent.indexOf('Linux') != -1) return 'Linux';
                if (navigator.userAgent.indexOf('Android') != -1) return 'Android';
                if (navigator.userAgent.indexOf('X11') != -1) return 'Unix';
            }
            return 'Unknown';
        }
        if (typeof process !== 'undefined') {
            if (process.platform) {
                if (process.platform.toLowerCase() === 'win32') return 'Windows';
                if (process.platform.toLowerCase() === 'win64') return 'Windows';
                if (process.platform.toLowerCase() === 'darwin') return 'macOS';
                if (process.platform.toLowerCase() === 'linux') return 'Linux';
            }
        }
        return 'Unknown';
    },

    name() {
        if (typeof window !== 'undefined') {
            if (navigator.userAgent.indexOf('Edge') != -1) return 'Edge';
            if (navigator.userAgent.indexOf('Trident') != -1) return 'Internet Explorer';
            if (navigator.userAgent.indexOf('Chrome') != -1) return 'Chrome';
            if (navigator.userAgent.indexOf('Opera') != -1) return 'Opera';
            if (navigator.userAgent.indexOf('Firefox') != -1) return 'Firefox';
            if (navigator.userAgent.indexOf('Safari') != -1) return 'Safari';
            if (navigator.userAgent.indexOf('Vivaldi') != -1) return 'Vivaldi';
            if (navigator.userAgent.indexOf('Android') != -1) return 'Android';
            return 'Unknown';
        }
        if (typeof process !== 'undefined') {
            return 'Node.js';
        }
        return 'Unknown';
    },

    version() {
        if (typeof window !== 'undefined') {
            var ua = navigator.userAgent,
                tem,
                M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
            if (/trident/i.test(M[1])) {
                tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
                return (tem[1] || '');
            }
            if (M[1] === 'Chrome'){
                tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
                if (tem != null) return tem[2];
            }
            M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
            if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
            return M[1];
        }
        if (typeof process !== 'undefined') {
            return process.version.slice(1);
        }
        return "Unknown";
    }
};

if (typeof module !== 'undefined') {
    module.exports = env;
}
