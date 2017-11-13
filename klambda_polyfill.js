(function () {
    for (let script of document.scripts) {
        if (script.type.toLowerCase() !== 'text/klambda') continue;
        if (script.executed) continue;
        script.executed = true;
        if (script.text) {
            Parser.parseAllString(script.text).map(Transpiler.translateHead).map(eval);
            continue;
        }
        console.warn('klambda script tags must have embedded code');
    }
})();
