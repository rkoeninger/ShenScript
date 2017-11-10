if (typeof require !== 'undefined') {
    const types = require('./types');
    Sym = types.Sym;
    arrayToCons = types.arrayToCons;
}

class Parser {
    static parseString(text) {
        return new Parser(text).parse();
    }
    static parseAllString(text) {
        return new Parser(text).parseAll();
    }
    constructor(text) {
        this.text = text;
        this.pos = 0;
    }
    get current() {
        return this.text[this.pos];
    }
    get next() {
        return this.text[this.pos + 1];
    }
    get done() {
        return this.pos >= this.text.length;
    }
    get more() {
        return !this.done;
    }
    skipWhitespace() {
        while (this.more && /\s/.test(this.current)) this.skipOne();
    }
    skipOne() {
        this.pos++;
    }
    static isDigit(ch) {
        return ch !== undefined && /\d/.test(ch);
    }
    static isSign(ch) {
        return ch !== undefined && /[\-\+]/.test(ch);
    }
    static isSymbolChar(ch) {
        return ch !== undefined && /[^\s\(\)]/.test(ch);
    }
    readString() {
        this.skipOne();
        const start = this.pos;
        while (this.current !== '"') {
            if (this.done) throw new Error('unexpected end of input');
            this.skipOne();
        }
        const end = this.pos;
        this.skipOne();
        return this.text.substring(start, end);
    }
    readNumber() {
        const start = this.pos;
        if (this.more && Parser.isSign(this.current)) this.skipOne();
        while (this.more && Parser.isDigit(this.current)) this.skipOne();
        if (this.more && this.current === '.') {
            this.skipOne();
            while (this.more && Parser.isDigit(this.current)) this.skipOne();
        }
        const end = this.pos;
        return parseFloat(this.text.substring(start, end));
    }
    readSymbol() {
        const start = this.pos;
        while (this.more && Parser.isSymbolChar(this.current)) this.skipOne();
        const end = this.pos;
        return new Sym(this.text.substring(start, end));
    }
    parse() {
        this.skipWhitespace();
        if (this.done) throw new Error('unexpected end of input');
        if (this.current === '(') {
            this.skipOne();
            const children = [];
            let child = this.parse();
            while (child !== undefined) {
                children.push(child);
                child = this.parse();
            }
            return arrayToCons(children);
        }
        if (this.current === ')') {
            this.skipOne();
            return undefined;
        }
        if (this.current === '"') return this.readString();
        if (Parser.isDigit(this.current) ||
            (Parser.isSign(this.current) && Parser.isDigit(this.next))) return this.readNumber();
        return this.readSymbol();
    }
    parseAll() {
        this.skipWhitespace();
        const results = [];
        while (this.more) {
            results.push(this.parse());
            this.skipWhitespace();
        }
        return results;
    }
}

if (typeof module !== 'undefined') {
    module.exports = Parser;
}
