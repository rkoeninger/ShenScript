
function skipWhitespace(state) {
    while (!isDone(state) && /\s/.test(current(state))) {
        skip(state);
    }
}
function current(state) { return state.text[state.pos]; }
function isDone(state) { return state.pos >= state.text.length; }
function skip(state) { state.pos++; }
function isDigitOrSign(ch) {
    return /[\d]/.test(ch);
}
function isSymbolChar(ch) {
    return /\S/.test(ch) && ch !== '(' && ch !== ')';
}
function readString(state) {
    skip(state);
    const start = state.pos;
    while (current(state) !== '"') {
        if (isDone(state)) {
            throw new Error('unexpected end of input');
        }
        skip(state);
    }
    const end = state.pos;
    skip(state);
    return state.text.substring(start, end);
}

// TODO: read fractional and negative numbers

function readNumber(state) {
    const start = state.pos;
    while (isDigitOrSign(current(state))) {
        if (isDone(state)) {
            throw new Error('unexpected end of input');
        }
        skip(state);
    }
    const end = state.pos;
    return parseFloat(state.text.substring(start, end));
}
function readSymbol(state) {
    const start = state.pos;
    while (isSymbolChar(current(state))) {
        if (isDone(state)) {
            throw new Error('unexpected end of input');
        }
        skip(state);
    }
    const end = state.pos;
    return new Sym(state.text.substring(start, end));
}
function arrayToCons(x) {
    let result = null;
    for (let i = x.length - 1; i >= 0; i--) result = new Cons(x[i], result);
    return result;
}
function consToArray(x, array) {
    if (!array) array = [];
    if (isCons(x)) {
        array.push(x.hd);
        return consToArray(x.tl, array);
    }
    if (x !== null) {
        throw new Error('not a valid list');
    }
    return array;
}
function consLength(x) {
    let length = 0;
    while (isCons(x)) {
        x = x.tl;
        length++;
    }
    if (x !== null) {
        throw new Error('not a valid list');
    }
    return length;
}
function parse(state) {
    if (isString(state)) state = new State(state);
    skipWhitespace(state);
    if (isDone(state)) {
        throw new Error('unexpected end of input');
    }
    if (current(state) === '(') {
        skip(state);
        let child = parse(state), children = [];
        while (child !== undefined) {
            children.push(child);
            child = parse(state);
        }
        return arrayToCons(children);
    }
    if (current(state) === ')') {
        skip(state);
        return undefined;
    }
    if (current(state) === '"') {
        return readString(state);
    }
    if (isDigitOrSign(current(state))) {
        return readNumber(state);
    }
    return readSymbol(state);
}
function State(text) {
    this.text = text;
    this.pos = 0;
}
