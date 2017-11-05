class Parser {
    constructor(text) {
        this.text = text;
        this.pos = 0;
    }
    get current() {
        return this.text[this.pos];
    }
    get isDone() {
        return this.pos >= this.text.length;
    }
    skipWhitespace() {
        while (!this.isDone && /\s/.test(this.current)) this.skipOne();
    }
    skipOne() {
        this.pos++;
    }
    isDigitOrSign(ch) {
        return /[\d]/.test(ch);
    }
    isSymbolChar(ch) {
        return /\S/.test(ch) && ch !== '(' && ch !== ')';
    }
    readString() {
        this.skipOne();
        const start = this.pos;
        while (this.current !== '"') {
            if (this.isDone) throw new Error('unexpected end of input');
            this.skipOne();
        }
        const end = this.pos;
        this.skipOne();
        return this.text.substring(start, end);
    }

    // TODO: read fractional and negative numbers

    readNumber() {
        const start = this.pos;
        while (this.isDigitOrSign(this.current) && !this.isDone) this.skipOne();
        const end = this.pos;
        return parseFloat(this.text.substring(start, end));
    }
    readSymbol() {
        const start = this.pos;
        while (this.isSymbolChar(this.current) && !this.isDone) this.skipOne();
        const end = this.pos;
        return new Sym(this.text.substring(start, end));
    }
    parse() {
        this.skipWhitespace();
        if (this.isDone) throw new Error('unexpected end of input');
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
        if (this.isDigitOrSign(this.current)) return this.readNumber();
        return this.readSymbol();
    }
    parseAll() {
        this.skipWhitespace();
        const results = [];
        while (!this.isDone) {
            results.add(this.parse());
            this.skipWhitespace();
        }
        return results;
    }
    static parseString(text) {
        return new Parser(text).parse();
    }
    static parseAllString(text) {
        return new Parser(text).parseAll();
    }
}
