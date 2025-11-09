import { Lexer } from '../src/lexer/lexer';
import { TokenType } from '../src/lexer/token';

describe('Lexer', () => {
  test('tokenizes integers', () => {
    const lexer = new Lexer('123 456');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.INT);
    expect(tokens[0].value).toBe('123');
    expect(tokens[1].type).toBe(TokenType.INT);
    expect(tokens[1].value).toBe('456');
  });

  test('tokenizes strings', () => {
    const lexer = new Lexer('"hello" "world"');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.STRING);
    expect(tokens[0].value).toBe('hello');
    expect(tokens[1].type).toBe(TokenType.STRING);
    expect(tokens[1].value).toBe('world');
  });

  test('tokenizes keywords', () => {
    const lexer = new Lexer('def let if else while return');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.DEF);
    expect(tokens[1].type).toBe(TokenType.LET);
    expect(tokens[2].type).toBe(TokenType.IF);
    expect(tokens[3].type).toBe(TokenType.ELSE);
    expect(tokens[4].type).toBe(TokenType.WHILE);
    expect(tokens[5].type).toBe(TokenType.RETURN);
  });

  test('tokenizes operators', () => {
    const lexer = new Lexer('+ - * / == != < > <= >=');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.PLUS);
    expect(tokens[1].type).toBe(TokenType.MINUS);
    expect(tokens[2].type).toBe(TokenType.STAR);
    expect(tokens[3].type).toBe(TokenType.SLASH);
    expect(tokens[4].type).toBe(TokenType.EQ);
    expect(tokens[5].type).toBe(TokenType.NEQ);
    expect(tokens[6].type).toBe(TokenType.LT);
    expect(tokens[7].type).toBe(TokenType.GT);
    expect(tokens[8].type).toBe(TokenType.LTE);
    expect(tokens[9].type).toBe(TokenType.GTE);
  });

  test('skips comments', () => {
    const lexer = new Lexer('123 // comment\n456');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.INT);
    expect(tokens[0].value).toBe('123');
    expect(tokens[1].type).toBe(TokenType.INT);
    expect(tokens[1].value).toBe('456');
  });
});
