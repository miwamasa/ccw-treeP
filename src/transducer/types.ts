import { Element } from '../ast/types';

/**
 * Transducer rule for tree transformation
 */
export interface TransformRule {
  name: string;
  pattern: Pattern;
  template: Template;
  condition?: (bindings: Bindings) => boolean;
}

/**
 * Pattern for matching tree nodes
 */
export type Pattern =
  | { type: 'KindPattern'; kind: string; nameVar?: string; attrPatterns?: AttrPattern[]; childPatterns?: Pattern[] }
  | { type: 'VarPattern'; varName: string }
  | { type: 'AnyPattern' }
  | { type: 'ListPattern'; patterns: Pattern[]; restVar?: string };

export interface AttrPattern {
  key: string;
  valueVar?: string;
  literal?: string;
}

/**
 * Template for generating output tree
 */
export type Template =
  | { type: 'NodeTemplate'; kind: string; name?: TemplateExpr; attrs?: AttrTemplate[]; children?: Template[] }
  | { type: 'VarTemplate'; varName: string }
  | { type: 'LiteralTemplate'; value: string }
  | { type: 'ListTemplate'; templates: Template[] };

export interface AttrTemplate {
  key: string;
  value: TemplateExpr;
}

export type TemplateExpr =
  | { type: 'Var'; varName: string }
  | { type: 'Literal'; value: string }
  | { type: 'Concat'; parts: TemplateExpr[] };

/**
 * Variable bindings during pattern matching
 */
export type Bindings = Map<string, Element | Element[] | string>;

/**
 * Transducer specification
 */
export interface TransducerSpec {
  name: string;
  rules: TransformRule[];
  defaultRule?: Template;
}
