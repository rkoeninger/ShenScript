const shen = require('./lib/shen');

(async () => {
  try {
    const start = new Date().getTime();
    console.log('creating shen environment...');
    const InStream = class {
      constructor(text) {
        this.text = text;
        this.pos = 0;
      }
      read() { return this.pos >= this.text.length ? -1 : this.text.charCodeAt(this.pos++); }
      close() { return (this.pos = Infinity, null); }
    };
    const openRead = path => fetch(path).then(x => x.text()).then(x => new InStream(x));
    window.shen = await shen({ async: true, target: 'web', openRead, InStream });
    const message = () => `environment created in ${new Date().getTime() - start}ms.`;

    if (document.readyState === 'complete' || (document.readyState !== 'loading' && !document.documentElement.doScroll)) {
      document.body.innerHTML = message();
    } else {
      document.addEventListener('DOMContentLoaded', () => document.body.innerHTML = message());
    }

    console.log(message());
  } catch (e) {
    console.error(e);
  }
})();
