const Shen = require('./lib/shen.js');
const { StringInStream, onReady } = require('./lib/utils.js');

(async () => {
  try {
    const now = () => new Date().getTime();
    const start = now();
    console.log('creating shen environment...');

    const openRead = async path => new StringInStream(await (await fetch(path)).text());
    const options = { async: true, target: 'web', openRead, InStream: StringInStream };
    window.$ = await new Shen(options);
    const message = () => `shen environment created in ${now() - start}ms.`;

    onReady(() => {
      const p = document.createElement('p');
      p.classList.add('notification');
      p.append(document.createTextNode(message()));
      p.setAttribute('title', 'Click to dismiss');
      p.onclick = () => document.body.removeChild(p);
      document.body.prepend(p);
    });
    console.log(message());
  } catch (e) {
    console.error(e);
  }
})();
