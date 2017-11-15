'use strict';

function includesAny(y, xs) {
    return xs.some(x => y.includes(x));
}

function os() {
    if (typeof navigator !== 'undefined') {
        if (navigator.platform) {
            const lowerPlatform = navigator.platform.toLowerCase();
            if (includesAny(lowerPlatform, ['win32', 'win64'])) return 'Windows';
            if (includesAny(lowerPlatform, ['darwin'])) return 'macOS';
            if (includesAny(lowerPlatform, ['linux'])) return 'Linux';
        }
        if (navigator.userAgent) {
            const lowerUserAgent = navigator.userAgent.toLowerCase();
            if (includesAny(lowerUserAgent, ['win', 'wow'])) return 'Windows';
            if (includesAny(lowerUserAgent, ['mac'])) return 'macOS';
            if (includesAny(lowerUserAgent, ['iphone', 'ipad', 'ios'])) return 'iOS';
            if (includesAny(lowerUserAgent, ['linux'])) return 'Linux';
            if (includesAny(lowerUserAgent, ['android'])) return 'Android';
            if (includesAny(lowerUserAgent, ['x11'])) return 'Unix';
        }
    }
    else if (typeof process !== 'undefined') {
        if (process.platform) {
            const lowerPlatform = process.platform.toLowerCase();
            if (includesAny(lowerPlatform, ['win32', 'win64'])) return 'Windows';
            if (includesAny(lowerPlatform, ['darwin'])) return 'macOS';
            if (includesAny(lowerPlatform, ['linux'])) return 'Linux';
        }
    }
    return 'Unknown';
}

function name() {
    if (typeof window !== 'undefined') {
        const lowerUserAgent = navigator.userAgent.toLowerCase();
        if (includesAny(lowerUserAgent, ['edge'])) return 'Edge';
        if (includesAny(lowerUserAgent, ['opr'])) return 'Opera';
        if (includesAny(lowerUserAgent, ['vivaldi'])) return 'Vivaldi';
        if (includesAny(lowerUserAgent, ['firefox'])) return 'Firefox';
        if (includesAny(lowerUserAgent, ['chrome'])) return 'Chrome';
        if (includesAny(lowerUserAgent, ['android'])) return 'Android';
        if (includesAny(lowerUserAgent, ['safari'])) return 'Safari';
    }
    else if (typeof process !== 'undefined') {
        return 'Node.js';
    }
    return 'Unknown';
}

function digitsAfter(s, subs) {
    const i = s.indexOf(subs + '/');
    if (i < 0) return null;
    const matches = s.substring(i + subs.length + 1).match(/\S*/);
    return matches.length === 0 ? null : matches[0];
}

function version() {
    if (typeof window !== 'undefined') {
        const ua = navigator.userAgent.toLowerCase();
        const ver =
            digitsAfter(ua, 'edge') ||
            digitsAfter(ua, 'opr') ||
            digitsAfter(ua, 'vivaldi') ||
            digitsAfter(ua, 'firefox') ||
            digitsAfter(ua, 'chrome') ||
            digitsAfter(ua, 'android') ||
            digitsAfter(ua, 'safari');
        if (ver) return ver;
    }
    else if (typeof process !== 'undefined') {
        return process.version.slice(1);
    }
    return "Unknown";
}

if (typeof module !== 'undefined') {
    module.exports = {
        os,
        name,
        version
    };
}
