const fs = require('fs');
const { Sym, eq, isString } = require('./src/types');
const Parser = require('./src/parser');
const Transpiler = require('./src/transpiler');
const { Kl, kl } = require('./src/kl');
global.kl = kl;

fs.readdir('kernel/klambda', (e, files) => {
	if (e) { console.error(e); return; }
	for (let file of files) {
		fs.readFile(`kernel/klambda/${file}`, 'utf-8', (e, text) => {
			if (e) { console.error(e); return; }
			console.log(text);
			const forms = Parser.parseAllString(text);
			const output = forms.map(Transpiler.translateHead).join('\r\n\r\n');
			fs.writeFile(`dist/${file}.js`, output, console.error);
		});
	}
});
