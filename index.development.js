require('./index.js');
const { onReady } = require('./lib/utils.js');

(async () => {
  try {
    const now = () => new Date().getTime();
    const start = now();
    console.log('creating shen environment...');

    window.$ = await new Shen();
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
