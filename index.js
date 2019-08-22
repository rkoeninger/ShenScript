(async () => {
  try {
    const start = new Date().getTime();
    console.log('creating shen environment...');
    window.shen = await require('./shen')({ async: false, target: 'web' });
    const end = new Date().getTime();
    const message = `environment created in ${end - start}ms.`;
    console.log(message);
    setTimeout(() => document.body.innerHTML = message, 0);
  } catch (e) {
    console.error(e);
  }
})();
