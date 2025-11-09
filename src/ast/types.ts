/**
 * Source position information
 */
export interface SourceSpan {
  start: number;
  end: number;
  line: number;
  column: number;
}

/**
 * Attribute in EAST
 */
export interface Attr {
  key: string;
  value: string;
}

/**
 * EAST: Element-based Abstract Syntax Tree
 * Unified tree structure inspired by XML element model
 */
export interface Element {
  kind: string;                    // "def", "let", "call", "var", etc.
  name?: string;                   // identifier name
  attrs?: Attr[];                  // attributes (type annotations, etc.)
  children?: Element[];            // child elements
  span?: SourceSpan;              // source location
}

/**
 * CST: Concrete Syntax Tree
 * Represents the parsed program structure before normalization
 */
export type CSTNode =
  | FunctionDef
  | LetBinding
  | IfExpr
  | CallExpr
  | BinaryOp
  | UnaryOp
  | Variable
  | Literal
  | Lambda
  | Block
  | ReturnStmt
  | MacroDef
  | WhileLoop
  | ForLoop;

export interface FunctionDef {
  type: 'FunctionDef';
  name: string;
  params: Parameter[];
  returnType?: string;
  body: Block;
  span?: SourceSpan;
}

export interface Parameter {
  name: string;
  paramType?: string;
  span?: SourceSpan;
}

export interface LetBinding {
  type: 'LetBinding';
  name: string;
  valueType?: string;
  value: CSTNode;
  span?: SourceSpan;
}

export interface IfExpr {
  type: 'IfExpr';
  condition: CSTNode;
  thenBranch: Block;
  elseBranch?: Block;
  span?: SourceSpan;
}

export interface CallExpr {
  type: 'CallExpr';
  callee: string;
  args: CSTNode[];
  blockArg?: Block;  // For block argument syntax: func(args) { block }
  span?: SourceSpan;
}

export interface BinaryOp {
  type: 'BinaryOp';
  operator: string;
  left: CSTNode;
  right: CSTNode;
  span?: SourceSpan;
}

export interface UnaryOp {
  type: 'UnaryOp';
  operator: string;
  operand: CSTNode;
  span?: SourceSpan;
}

export interface Variable {
  type: 'Variable';
  name: string;
  span?: SourceSpan;
}

export interface Literal {
  type: 'Literal';
  value: number | string | boolean;
  literalType: 'Int' | 'String' | 'Bool';
  span?: SourceSpan;
}

export interface Lambda {
  type: 'Lambda';
  params: Parameter[];
  body: Block;
  span?: SourceSpan;
}

export interface Block {
  type: 'Block';
  statements: CSTNode[];
  span?: SourceSpan;
}

export interface ReturnStmt {
  type: 'ReturnStmt';
  value?: CSTNode;
  span?: SourceSpan;
}

export interface MacroDef {
  type: 'MacroDef';
  name: string;
  pattern: string;
  expand: Element;
  span?: SourceSpan;
}

export interface WhileLoop {
  type: 'WhileLoop';
  condition: CSTNode;
  body: Block;
  span?: SourceSpan;
}

export interface ForLoop {
  type: 'ForLoop';
  variable: string;
  from: CSTNode;
  to: CSTNode;
  body: Block;
  span?: SourceSpan;
}

/**
 * Type system
 */
export type Type =
  | TypeVar
  | TypeCon
  | TypeFun;

export interface TypeVar {
  kind: 'TypeVar';
  name: string;
}

export interface TypeCon {
  kind: 'TypeCon';
  name: string;  // 'Int', 'String', 'Bool', etc.
  args?: Type[];
}

export interface TypeFun {
  kind: 'TypeFun';
  from: Type;
  to: Type;
}

/**
 * Type scheme for polymorphic types
 */
export interface TypeScheme {
  typeVars: string[];
  type: Type;
}

/**
 * Type environment
 */
export type TypeEnv = Map<string, TypeScheme>;
