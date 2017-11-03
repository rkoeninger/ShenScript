'use strict';
var env = {
    os() {
        if (navigator) {
            if (navigator.platform) {
                if (navigator.platform.toLowerCase() === 'win32') return "Windows";
                if (navigator.platform.toLowerCase() === 'win64') return "Windows";
            }
            if (navigator.appVersion) {
                if (navigator.appVersion.indexOf("Win") != -1) return "Windows";
                if (navigator.appVersion.indexOf("Mac") != -1) return "macOS";
                if (navigator.appVersion.indexOf("iPhone") != -1) return "iOS";
                if (navigator.appVersion.indexOf("iPad") != -1) return "iOS";
                if (navigator.appVersion.indexOf("iOS") != -1) return "iOS";
                if (navigator.appVersion.indexOf("Linux") != -1) return "Linux";
                if (navigator.appVersion.indexOf("Android") != -1) return "Android";
                if (navigator.appVersion.indexOf("X11") != -1) return "Unix";
            }
        }
        if (process) {
            if (process.platform) {
                if (process.platform.toLowerCase() === 'win32') return 'Windows';
                if (process.platform.toLowerCase() === 'win64') return 'Windows';
                if (process.platform.toLowerCase() === 'darwin') return 'macOS';
                if (process.platform.toLowerCase() === 'linux') return 'Linux';
            }
        }
        return "Unknown";
    },

    name() {
        if (window) {
            if (navigator.appVersion.indexOf('Edge') != -1) return 'Edge';
            if (navigator.appVersion.indexOf('Trident') != -1) return 'Internet Explorer';
            if (navigator.appVersion.indexOf('Chrome') != -1) return 'Chrome';
            if (navigator.appVersion.indexOf('Opera') != -1) return 'Opera';
            if (navigator.appVersion.indexOf('Firefox') != -1) return 'Firefox';
            if (navigator.appVersion.indexOf('Safari') != -1) return 'Safari';
            if (navigator.appVersion.indexOf('Vivaldi') != -1) return 'Vivaldi';
            if (navigator.appVersion.indexOf('Android') != -1) return 'Android';
        }
        if (process) {
            return 'Node.js';
        }
        return "Unknown";
    },

    version() {
        if (window) {
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
        if (process) {
            return process.version.slice(1);
        }
        return "Unknown";
    }
};
