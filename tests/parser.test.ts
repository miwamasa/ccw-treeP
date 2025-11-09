import { Lexer } from '../src/lexer/lexer';
import { Parser } from '../src/parser/parser';

describe('Parser', () => {
  test('parses function definition', () => {
    const source = `
      def add(x, y) {
        return x + y
      }
    `;

    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const cst = parser.parse();

    expect(cst.length).toBe(1);
    expect(cst[0].type).toBe('FunctionDef');
    const funcDef = cst[0] as any;
    expect(funcDef.name).toBe('add');
    expect(funcDef.params.length).toBe(2);
  });

  test('parses if expression', () => {
    const source = `
      if (x > 0) {
        return 1
      } else {
        return 0
      }
    `;

    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const cst = parser.parse();

    expect(cst.length).toBe(1);
    expect(cst[0].type).toBe('IfExpr');
  });

  test('parses binary operations', () => {
    const source = 'x + y * z';

    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const cst = parser.parse();

    expect(cst.length).toBe(1);
    expect(cst[0].type).toBe('BinaryOp');
  });
});
