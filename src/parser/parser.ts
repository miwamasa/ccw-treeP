import { Token, TokenType } from '../lexer/token';
import {
  CSTNode,
  FunctionDef,
  Parameter,
  LetBinding,
  IfExpr,
  CallExpr,
  BinaryOp,
  UnaryOp,
  Variable,
  Literal,
  Lambda,
  Block,
  ReturnStmt,
  MacroDef,
  WhileLoop,
  ForLoop,
  SourceSpan,
} from '../ast/types';

export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): CSTNode[] {
    const statements: CSTNode[] = [];

    while (!this.isAtEnd()) {
      const stmt = this.parseTopLevel();
      if (stmt) {
        statements.push(stmt);
      }
    }

    return statements;
  }

  private parseTopLevel(): CSTNode | null {
    if (this.match(TokenType.DEF)) {
      return this.parseFunctionDef();
    }

    if (this.match(TokenType.MACRO)) {
      return this.parseMacroDef();
    }

    return this.parseStatement();
  }

  private parseFunctionDef(): FunctionDef {
    const start = this.previous().span.start;
    const name = this.consume(TokenType.IDENT, 'Expected function name').value;

    this.consume(TokenType.LPAREN, 'Expected ( after function name');
    const params = this.parseParameters();
    this.consume(TokenType.RPAREN, 'Expected ) after parameters');

    let returnType: string | undefined;
    if (this.match(TokenType.RETURNS)) {
      this.consume(TokenType.COLON, 'Expected : after returns');
      returnType = this.consume(TokenType.IDENT, 'Expected return type').value;
    }

    const body = this.parseBlock();

    return {
      type: 'FunctionDef',
      name,
      params,
      returnType,
      body,
      span: this.makeSpan(start, this.previous().span.end)
    };
  }

  private parseParameters(): Parameter[] {
    const params: Parameter[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        const name = this.consume(TokenType.IDENT, 'Expected parameter name').value;
        let paramType: string | undefined;

        if (this.match(TokenType.COLON)) {
          paramType = this.consume(TokenType.IDENT, 'Expected parameter type').value;
        }

        params.push({ name, paramType });
      } while (this.match(TokenType.COMMA));
    }

    return params;
  }

  private parseMacroDef(): MacroDef {
    const start = this.previous().span.start;
    const name = this.consume(TokenType.IDENT, 'Expected macro name').value;

    this.consume(TokenType.LBRACE, 'Expected { after macro name');

    // Parse pattern
    this.consume(TokenType.PATTERN, 'Expected pattern keyword');
    this.consume(TokenType.COLON, 'Expected : after pattern');

    let pattern = '';
    while (!this.check(TokenType.EXPAND) && !this.isAtEnd()) {
      pattern += this.advance().value;
    }

    // Parse expand
    this.consume(TokenType.EXPAND, 'Expected expand keyword');
    this.consume(TokenType.COLON, 'Expected : after expand');

    // For now, we'll create a simple placeholder Element
    const expand = {
      kind: 'expand',
      name: name,
      children: []
    };

    this.consume(TokenType.LBRACE, 'Expected { for expand body');
    // Skip to matching brace (simplified for now)
    let depth = 1;
    while (depth > 0 && !this.isAtEnd()) {
      if (this.check(TokenType.LBRACE)) depth++;
      if (this.check(TokenType.RBRACE)) depth--;
      this.advance();
    }

    this.consume(TokenType.RBRACE, 'Expected } after macro definition');

    return {
      type: 'MacroDef',
      name,
      pattern,
      expand,
      span: this.makeSpan(start, this.previous().span.end)
    };
  }

  private parseStatement(): CSTNode {
    if (this.match(TokenType.LET)) {
      return this.parseLetBinding();
    }

    if (this.match(TokenType.IF)) {
      return this.parseIfExpr();
    }

    if (this.match(TokenType.WHILE)) {
      return this.parseWhileLoop();
    }

    if (this.match(TokenType.FOR)) {
      return this.parseForLoop();
    }

    if (this.match(TokenType.RETURN)) {
      return this.parseReturnStmt();
    }

    return this.parseExpression();
  }

  private parseLetBinding(): LetBinding {
    const start = this.previous().span.start;
    const name = this.consume(TokenType.IDENT, 'Expected variable name').value;

    let valueType: string | undefined;
    if (this.match(TokenType.COLON)) {
      valueType = this.consume(TokenType.IDENT, 'Expected type').value;
    }

    this.consume(TokenType.ASSIGN, 'Expected = in let binding');
    const value = this.parseExpression();

    return {
      type: 'LetBinding',
      name,
      valueType,
      value,
      span: this.makeSpan(start, this.previous().span.end)
    };
  }

  private parseIfExpr(): IfExpr {
    const start = this.previous().span.start;

    this.consume(TokenType.LPAREN, 'Expected ( after if');
    const condition = this.parseExpression();
    this.consume(TokenType.RPAREN, 'Expected ) after condition');

    const thenBranch = this.parseBlock();

    let elseBranch: Block | undefined;
    if (this.match(TokenType.ELSE)) {
      elseBranch = this.parseBlock();
    }

    return {
      type: 'IfExpr',
      condition,
      thenBranch,
      elseBranch,
      span: this.makeSpan(start, this.previous().span.end)
    };
  }

  private parseWhileLoop(): WhileLoop {
    const start = this.previous().span.start;

    this.consume(TokenType.LPAREN, 'Expected ( after while');
    const condition = this.parseExpression();
    this.consume(TokenType.RPAREN, 'Expected ) after condition');

    const body = this.parseBlock();

    return {
      type: 'WhileLoop',
      condition,
      body,
      span: this.makeSpan(start, this.previous().span.end)
    };
  }

  private parseForLoop(): ForLoop {
    const start = this.previous().span.start;

    this.consume(TokenType.LPAREN, 'Expected ( after for');
    const variable = this.consume(TokenType.IDENT, 'Expected variable name').value;
    this.consume(TokenType.ASSIGN, 'Expected = in for loop');
    const from = this.parseExpression();
    this.consume(TokenType.COMMA, 'Expected , in for loop');
    const to = this.parseExpression();
    this.consume(TokenType.RPAREN, 'Expected ) after for range');

    const body = this.parseBlock();

    return {
      type: 'ForLoop',
      variable,
      from,
      to,
      body,
      span: this.makeSpan(start, this.previous().span.end)
    };
  }

  private parseReturnStmt(): ReturnStmt {
    const start = this.previous().span.start;

    let value: CSTNode | undefined;
    if (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      value = this.parseExpression();
    }

    return {
      type: 'ReturnStmt',
      value,
      span: this.makeSpan(start, this.previous().span.end)
    };
  }

  private parseBlock(): Block {
    const start = this.peek().span.start;
    this.consume(TokenType.LBRACE, 'Expected {');

    const statements: CSTNode[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      statements.push(this.parseStatement());
    }

    this.consume(TokenType.RBRACE, 'Expected }');

    return {
      type: 'Block',
      statements,
      span: this.makeSpan(start, this.previous().span.end)
    };
  }

  private parseExpression(): CSTNode {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): CSTNode {
    let left = this.parseLogicalAnd();

    while (this.match(TokenType.OR)) {
      const operator = this.previous().value;
      const right = this.parseLogicalAnd();
      left = {
        type: 'BinaryOp',
        operator,
        left,
        right,
        span: this.makeSpan(left.span!.start, right.span!.end)
      };
    }

    return left;
  }

  private parseLogicalAnd(): CSTNode {
    let left = this.parseEquality();

    while (this.match(TokenType.AND)) {
      const operator = this.previous().value;
      const right = this.parseEquality();
      left = {
        type: 'BinaryOp',
        operator,
        left,
        right,
        span: this.makeSpan(left.span!.start, right.span!.end)
      };
    }

    return left;
  }

  private parseEquality(): CSTNode {
    let left = this.parseComparison();

    while (this.match(TokenType.EQ, TokenType.NEQ)) {
      const operator = this.previous().value;
      const right = this.parseComparison();
      left = {
        type: 'BinaryOp',
        operator,
        left,
        right,
        span: this.makeSpan(left.span!.start, right.span!.end)
      };
    }

    return left;
  }

  private parseComparison(): CSTNode {
    let left = this.parseTerm();

    while (this.match(TokenType.LT, TokenType.GT, TokenType.LTE, TokenType.GTE)) {
      const operator = this.previous().value;
      const right = this.parseTerm();
      left = {
        type: 'BinaryOp',
        operator,
        left,
        right,
        span: this.makeSpan(left.span!.start, right.span!.end)
      };
    }

    return left;
  }

  private parseTerm(): CSTNode {
    let left = this.parseFactor();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().value;
      const right = this.parseFactor();
      left = {
        type: 'BinaryOp',
        operator,
        left,
        right,
        span: this.makeSpan(left.span!.start, right.span!.end)
      };
    }

    return left;
  }

  private parseFactor(): CSTNode {
    let left = this.parseUnary();

    while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT)) {
      const operator = this.previous().value;
      const right = this.parseUnary();
      left = {
        type: 'BinaryOp',
        operator,
        left,
        right,
        span: this.makeSpan(left.span!.start, right.span!.end)
      };
    }

    return left;
  }

  private parseUnary(): CSTNode {
    if (this.match(TokenType.NOT, TokenType.MINUS)) {
      const start = this.previous().span.start;
      const operator = this.previous().value;
      const operand = this.parseUnary();
      return {
        type: 'UnaryOp',
        operator,
        operand,
        span: this.makeSpan(start, operand.span!.end)
      };
    }

    return this.parseCall();
  }

  private parseCall(): CSTNode {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match(TokenType.LPAREN)) {
        const args: CSTNode[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RPAREN, 'Expected ) after arguments');

        // Check for block argument: func(args) { block }
        let blockArg: Block | undefined;
        if (this.check(TokenType.LBRACE)) {
          blockArg = this.parseBlock();
        }

        if (expr.type === 'Variable') {
          expr = {
            type: 'CallExpr',
            callee: expr.name,
            args,
            blockArg,
            span: this.makeSpan(expr.span!.start, this.previous().span.end)
          };
        } else {
          throw new Error('Can only call functions by name');
        }
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): CSTNode {
    const start = this.peek().span.start;

    if (this.match(TokenType.TRUE)) {
      return {
        type: 'Literal',
        value: true,
        literalType: 'Bool',
        span: this.previous().span
      };
    }

    if (this.match(TokenType.FALSE)) {
      return {
        type: 'Literal',
        value: false,
        literalType: 'Bool',
        span: this.previous().span
      };
    }

    if (this.match(TokenType.INT)) {
      return {
        type: 'Literal',
        value: parseInt(this.previous().value),
        literalType: 'Int',
        span: this.previous().span
      };
    }

    if (this.match(TokenType.STRING)) {
      return {
        type: 'Literal',
        value: this.previous().value,
        literalType: 'String',
        span: this.previous().span
      };
    }

    if (this.match(TokenType.IDENT)) {
      return {
        type: 'Variable',
        name: this.previous().value,
        span: this.previous().span
      };
    }

    if (this.match(TokenType.LPAREN)) {
      // Lambda or grouped expression
      if (this.check(TokenType.RPAREN) || this.checkParameterList()) {
        return this.parseLambda(start);
      } else {
        const expr = this.parseExpression();
        this.consume(TokenType.RPAREN, 'Expected ) after expression');
        return expr;
      }
    }

    throw new Error(`Unexpected token: ${this.peek().value} at ${this.peek().span.line}:${this.peek().span.column}`);
  }

  private parseLambda(start: number): Lambda {
    const params = this.parseParameters();
    this.consume(TokenType.RPAREN, 'Expected ) after lambda parameters');
    this.consume(TokenType.ARROW, 'Expected -> in lambda');
    const body = this.parseBlock();

    return {
      type: 'Lambda',
      params,
      body,
      span: this.makeSpan(start, this.previous().span.end)
    };
  }

  private checkParameterList(): boolean {
    // Look ahead to see if this looks like a parameter list
    const saved = this.current;
    let result = false;

    if (this.check(TokenType.IDENT)) {
      this.advance();
      if (this.check(TokenType.COLON) || this.check(TokenType.COMMA) || this.check(TokenType.RPAREN)) {
        result = true;
      }
    }

    this.current = saved;
    return result;
  }

  // Utility methods
  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(`${message} at ${this.peek().span.line}:${this.peek().span.column}`);
  }

  private makeSpan(start: number, end: number): SourceSpan {
    return {
      start,
      end,
      line: this.previous().span.line,
      column: this.previous().span.column
    };
  }
}
