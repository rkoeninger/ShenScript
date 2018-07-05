const fs = require('fs');
const { Sym, eq, isString, isCons, concatAll } = require('./src/types');
const Parser = require('./src/parser');
const Transpiler = require('./src/transpiler');
const { Kl, kl } = require('./src/kl');
global.kl = kl;

const files = [
    'toplevel',
    'core',
    'sys',
    'dict',
    'sequent',
    'yacc',
    'reader',
    'prolog',
    'track',
    'load',
    'writer',
    'macros',
    'declarations',
    'types',
    't-star'
];

const defuns = [];
const toplevels = [];

for (let file of files) {
    const text = fs.readFileSync(`./kernel/klambda/${file}.kl`, 'utf-8');
    const exprs = Parser.parseAllString(text);
    for (let expr of exprs) {
        if (isCons(expr)) {
            if (isSymbol(expr.hd) && expr.hd.name === 'defun') {
                defuns.push(expr);
            } else {
                toplevels.push(expr);
            }
        }
    }
}

const imports = `
const { Sym, asJsBool, asKlBool } = require('../src/types');
const { Kl, kl } = require('../src/kl');

if (typeof window !== 'undefined') {
    window.kl = kl;
    window.Kl = Kl;
}

if (typeof global !== 'undefined') {
    global.kl = kl;
    global.Kl = Kl;
}

`;

const fullText = concatAll([defuns, toplevels]).map(Transpiler.translateHead).join(';\r\n\r\n') + ';';

fs.writeFile('dist/kernel.js', imports + fullText, console.error);
