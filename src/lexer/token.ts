import { SourceSpan } from '../ast/types';

export enum TokenType {
  // Literals
  INT = 'INT',
  STRING = 'STRING',
  BOOL = 'BOOL',

  // Identifiers and keywords
  IDENT = 'IDENT',
  DEF = 'DEF',
  LET = 'LET',
  IF = 'IF',
  ELSE = 'ELSE',
  WHILE = 'WHILE',
  FOR = 'FOR',
  RETURN = 'RETURN',
  MACRO = 'MACRO',
  PATTERN = 'PATTERN',
  EXPAND = 'EXPAND',
  RETURNS = 'RETURNS',
  TRUE = 'TRUE',
  FALSE = 'FALSE',

  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',
  PERCENT = 'PERCENT',
  EQ = 'EQ',
  NEQ = 'NEQ',
  LT = 'LT',
  GT = 'GT',
  LTE = 'LTE',
  GTE = 'GTE',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  ASSIGN = 'ASSIGN',
  ARROW = 'ARROW',

  // Delimiters
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  COMMA = 'COMMA',
  COLON = 'COLON',
  SEMICOLON = 'SEMICOLON',
  DOT = 'DOT',
  DOLLAR = 'DOLLAR',

  // Special
  EOF = 'EOF',
  NEWLINE = 'NEWLINE',
}

export interface Token {
  type: TokenType;
  value: string;
  span: SourceSpan;
}

export const KEYWORDS: Map<string, TokenType> = new Map([
  ['def', TokenType.DEF],
  ['let', TokenType.LET],
  ['if', TokenType.IF],
  ['else', TokenType.ELSE],
  ['while', TokenType.WHILE],
  ['for', TokenType.FOR],
  ['return', TokenType.RETURN],
  ['macro', TokenType.MACRO],
  ['pattern', TokenType.PATTERN],
  ['expand', TokenType.EXPAND],
  ['returns', TokenType.RETURNS],
  ['true', TokenType.TRUE],
  ['false', TokenType.FALSE],
]);
