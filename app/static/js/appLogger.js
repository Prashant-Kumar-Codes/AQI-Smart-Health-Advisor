/**
 * AppLogger — Controls console output based on environment.
 * Production: silences console.log/info/debug
 * Development: keeps everything visible
 * Override: add ?debug=true to URL or set localStorage.debug = 'true'
 */
(function () {
    var host = window.location.hostname;
    var isDebug = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0'
        || new URLSearchParams(window.location.search).get('debug') === 'true'
        || localStorage.getItem('debug') === 'true'
        || (window.APP_CONFIG && window.APP_CONFIG.debug === true);

    if (!isDebug) {
        console.log = function () {};
        console.info = function () {};
        console.debug = function () {};
    }
})();
