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
    window.shen = await require('./shen')({ async: true, target: 'web', openRead, InStream });
    const end = new Date().getTime();
    const message = `environment created in ${end - start}ms.`;
    console.log(message);
    setTimeout(() => document.body.innerHTML = message, 0);
  } catch (e) {
    console.error(e);
  }
})();
