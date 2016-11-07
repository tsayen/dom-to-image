// used symbols from here: https://github.com/sindresorhus/log-symbols
'use strict';

var main = {
    info: 'ℹ',
    success: '✔',
    warning: '⚠',
    error: '✖'
};

var win = {
    info: 'i',
    success: '√',
    warning: '‼',
    error: '×'
};

module.exports = process.platform === 'win32' ? win : main;