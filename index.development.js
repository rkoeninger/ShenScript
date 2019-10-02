const shen = require('./lib/shen.js');
const { StringInStream, onReady } = require('./lib/utils.js');

(async () => {
  try {
    const now = () => new Date().getTime();
    const start = now();
    console.log('creating shen environment...');

    const openRead = async path => new StringInStream(await (await fetch(path)).text());
    const options = { async: true, target: 'web', openRead, InStream: StringInStream };
    window.shen = await shen(options);
    const message = () => `shen environment created in ${now() - start}ms.`;

    onReady(() => {
      const text = document.createTextNode(message());
      const p = document.createElement('p');
      Object.assign(p.style, {
        color: '#323330',
        backgroundColor: '#F0DB4F',
        border: '0.25em solid #323330',
        margin: '0.5em',
        padding: '0.5em',
        fontSize: '20px',
        textAlign: 'center',
        cursor: 'pointer',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0
      });
      p.setAttribute('title', 'Click to dismiss');
      p.onclick = () => document.body.removeChild(p);
      p.append(text);
      document.body.prepend(p);
    });
    console.log(message());
  } catch (e) {
    console.error(e);
  }
})();
