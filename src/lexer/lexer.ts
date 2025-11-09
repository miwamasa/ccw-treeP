import { Token, TokenType, KEYWORDS } from './token';
import { SourceSpan } from '../ast/types';

export class Lexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.position < this.input.length) {
      this.skipWhitespace();

      if (this.position >= this.input.length) break;

      // Skip comments
      if (this.peek() === '/' && this.peekNext() === '/') {
        this.skipLineComment();
        continue;
      }

      if (this.peek() === '/' && this.peekNext() === '*') {
        this.skipBlockComment();
        continue;
      }

      const token = this.nextToken();
      if (token) {
        tokens.push(token);
      }
    }

    tokens.push({
      type: TokenType.EOF,
      value: '',
      span: this.makeSpan(this.position, this.position)
    });

    return tokens;
  }

  private nextToken(): Token | null {
    const start = this.position;
    const char = this.peek();

    // Numbers
    if (this.isDigit(char)) {
      return this.readNumber(start);
    }

    // Strings
    if (char === '"') {
      return this.readString(start);
    }

    // Identifiers and keywords
    if (this.isAlpha(char) || char === '_') {
      return this.readIdentifier(start);
    }

    // Operators and delimiters
    return this.readOperator(start);
  }

  private readNumber(start: number): Token {
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    const value = this.input.substring(start, this.position);
    return {
      type: TokenType.INT,
      value,
      span: this.makeSpan(start, this.position)
    };
  }

  private readString(start: number): Token {
    this.advance(); // Skip opening quote

    const stringStart = this.position;
    while (this.peek() !== '"' && this.position < this.input.length) {
      if (this.peek() === '\\') {
        this.advance(); // Skip escape char
      }
      this.advance();
    }

    const value = this.input.substring(stringStart, this.position);
    this.advance(); // Skip closing quote

    return {
      type: TokenType.STRING,
      value,
      span: this.makeSpan(start, this.position)
    };
  }

  private readIdentifier(start: number): Token {
    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
      this.advance();
    }

    const value = this.input.substring(start, this.position);
    const type = KEYWORDS.get(value) || TokenType.IDENT;

    return {
      type,
      value,
      span: this.makeSpan(start, this.position)
    };
  }

  private readOperator(start: number): Token {
    const char = this.peek();
    this.advance();

    // Two-character operators
    const next = this.peek();
    const twoChar = char + next;

    const twoCharOps: Record<string, TokenType> = {
      '==': TokenType.EQ,
      '!=': TokenType.NEQ,
      '<=': TokenType.LTE,
      '>=': TokenType.GTE,
      '&&': TokenType.AND,
      '||': TokenType.OR,
      '->': TokenType.ARROW,
    };

    if (twoCharOps[twoChar]) {
      this.advance();
      return {
        type: twoCharOps[twoChar],
        value: twoChar,
        span: this.makeSpan(start, this.position)
      };
    }

    // Single-character operators
    const singleCharOps: Record<string, TokenType> = {
      '+': TokenType.PLUS,
      '-': TokenType.MINUS,
      '*': TokenType.STAR,
      '/': TokenType.SLASH,
      '%': TokenType.PERCENT,
      '<': TokenType.LT,
      '>': TokenType.GT,
      '!': TokenType.NOT,
      '=': TokenType.ASSIGN,
      '(': TokenType.LPAREN,
      ')': TokenType.RPAREN,
      '{': TokenType.LBRACE,
      '}': TokenType.RBRACE,
      '[': TokenType.LBRACKET,
      ']': TokenType.RBRACKET,
      ',': TokenType.COMMA,
      ':': TokenType.COLON,
      ';': TokenType.SEMICOLON,
      '.': TokenType.DOT,
      '$': TokenType.DOLLAR,
    };

    const type = singleCharOps[char];
    if (type) {
      return {
        type,
        value: char,
        span: this.makeSpan(start, this.position)
      };
    }

    throw new Error(`Unexpected character: ${char} at line ${this.line}, column ${this.column}`);
  }

  private skipWhitespace(): void {
    while (this.position < this.input.length) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else if (char === '\n') {
        this.advance();
        this.line++;
        this.column = 1;
      } else {
        break;
      }
    }
  }

  private skipLineComment(): void {
    while (this.peek() !== '\n' && this.position < this.input.length) {
      this.advance();
    }
  }

  private skipBlockComment(): void {
    this.advance(); // Skip '/'
    this.advance(); // Skip '*'

    while (this.position < this.input.length - 1) {
      if (this.peek() === '*' && this.peekNext() === '/') {
        this.advance(); // Skip '*'
        this.advance(); // Skip '/'
        break;
      }
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
      }
      this.advance();
    }
  }

  private peek(): string {
    return this.input[this.position] || '';
  }

  private peekNext(): string {
    return this.input[this.position + 1] || '';
  }

  private advance(): void {
    this.position++;
    this.column++;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private makeSpan(start: number, end: number): SourceSpan {
    return {
      start,
      end,
      line: this.line,
      column: this.column - (end - start)
    };
  }
}
