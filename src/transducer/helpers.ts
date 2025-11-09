/**
 * Helper utilities for creating transducers with macro-like syntax
 */

import { Element } from '../ast/types';
import { Pattern, Template, TransformRule, Bindings } from './types';
import { TransducerBuilder } from './transducer';

/**
 * DSL for creating transformation rules with a more declarative syntax
 */
export class TransformRuleBuilder {
  private name: string = '';
  private pattern?: Pattern;
  private template?: Template;
  private condition?: (bindings: Bindings) => boolean;

  setName(name: string): this {
    this.name = name;
    return this;
  }

  /**
   * Match a node by kind and optionally capture name and children
   */
  matchKind(kind: string, options?: {
    name?: string;
    captureNameAs?: string;
    captureChildrenAs?: string;
    attrs?: Array<{ key: string; value?: string; captureAs?: string }>;
  }): this {
    const nameVar = options?.captureNameAs;
    const childPatterns = options?.captureChildrenAs
      ? [{ type: 'ListPattern' as const, restVar: options.captureChildrenAs }]
      : undefined;

    this.pattern = {
      type: 'KindPattern',
      kind,
      nameVar,
      childPatterns
    };

    return this;
  }

  /**
   * Match a binary operation with left and right operands
   */
  matchBinaryOp(op: string, leftVar: string = 'left', rightVar: string = 'right'): this {
    this.pattern = {
      type: 'KindPattern',
      kind: 'call',
      nameVar: 'op',
      childPatterns: [
        { type: 'VarPattern', varName: leftVar },
        { type: 'VarPattern', varName: rightVar }
      ]
    };

    this.condition = (bindings) => bindings.get('op') === op;
    return this;
  }

  /**
   * Match a unary operation with an operand
   */
  matchUnaryOp(op: string, operandVar: string = 'operand'): this {
    this.pattern = {
      type: 'KindPattern',
      kind: 'call',
      nameVar: 'op',
      childPatterns: [
        { type: 'VarPattern', varName: operandVar }
      ]
    };

    this.condition = (bindings) => bindings.get('op') === op;
    return this;
  }

  /**
   * Add a custom condition
   */
  when(condition: (bindings: Bindings) => boolean): this {
    const prevCondition = this.condition;
    if (prevCondition) {
      this.condition = (bindings) => prevCondition(bindings) && condition(bindings);
    } else {
      this.condition = condition;
    }
    return this;
  }

  /**
   * Generate a node with the given kind
   */
  generateNode(kind: string, options?: {
    name?: string | { var: string };
    children?: Array<{ var: string } | { list: string } | Template>;
  }): this {
    const nameExpr = options?.name
      ? typeof options.name === 'string'
        ? { type: 'Literal' as const, value: options.name }
        : { type: 'Var' as const, varName: options.name.var }
      : undefined;

    const children = options?.children?.map(child => {
      if ('var' in child) {
        return { type: 'VarTemplate' as const, varName: child.var };
      } else if ('list' in child) {
        return { type: 'ListTemplate' as const, listVar: child.list };
      } else {
        return child;
      }
    });

    this.template = {
      type: 'NodeTemplate',
      kind,
      name: nameExpr,
      children
    };

    return this;
  }

  /**
   * Generate output from a captured variable
   */
  generateVar(varName: string): this {
    this.template = {
      type: 'VarTemplate',
      varName
    };
    return this;
  }

  /**
   * Generate a literal value
   */
  generateLiteral(value: string): this {
    this.template = {
      type: 'LiteralTemplate',
      value
    };
    return this;
  }

  build(): TransformRule {
    if (!this.pattern || !this.template) {
      throw new Error('Pattern and template must be set');
    }

    return {
      name: this.name,
      pattern: this.pattern,
      template: this.template,
      condition: this.condition
    };
  }
}

/**
 * Helper to check if an element is a literal with a specific value
 */
export function isLiteral(elem: Element | string | Element[], value?: string): boolean {
  if (typeof elem === 'string' || Array.isArray(elem)) {
    return false;
  }

  if (elem.kind !== 'literal') {
    return false;
  }

  if (value === undefined) {
    return true;
  }

  const valueAttr = elem.attrs?.find(a => a.key === 'value');
  return valueAttr?.value === value;
}

/**
 * Helper to check if an element is a variable
 */
export function isVar(elem: Element | string | Element[], name?: string): boolean {
  if (typeof elem === 'string' || Array.isArray(elem)) {
    return false;
  }

  if (elem.kind !== 'var') {
    return false;
  }

  if (name === undefined) {
    return true;
  }

  return elem.name === name;
}

/**
 * Helper to create a literal element
 */
export function makeLiteral(type: string, value: string): Element {
  return {
    kind: 'literal',
    attrs: [
      { key: 'type', value: type },
      { key: 'value', value }
    ]
  };
}

/**
 * Preset optimization rules
 */
export const OptimizationRules = {
  /**
   * Arithmetic identity optimizations
   */
  arithmeticIdentity: () => {
    const builder = new TransducerBuilder();

    // x + 0 => x
    builder.addRule(
      new TransformRuleBuilder()
        .setName('add_zero_right')
        .matchBinaryOp('+')
        .when(bindings => isLiteral(bindings.get('right') as Element, '0'))
        .generateVar('left')
        .build()
    );

    // 0 + x => x
    builder.addRule(
      new TransformRuleBuilder()
        .setName('add_zero_left')
        .matchBinaryOp('+')
        .when(bindings => isLiteral(bindings.get('left') as Element, '0'))
        .generateVar('right')
        .build()
    );

    // x * 1 => x
    builder.addRule(
      new TransformRuleBuilder()
        .setName('mul_one_right')
        .matchBinaryOp('*')
        .when(bindings => isLiteral(bindings.get('right') as Element, '1'))
        .generateVar('left')
        .build()
    );

    // 1 * x => x
    builder.addRule(
      new TransformRuleBuilder()
        .setName('mul_one_left')
        .matchBinaryOp('*')
        .when(bindings => isLiteral(bindings.get('left') as Element, '1'))
        .generateVar('right')
        .build()
    );

    // x * 0 => 0
    builder.addRule(
      new TransformRuleBuilder()
        .setName('mul_zero')
        .matchBinaryOp('*')
        .when(bindings =>
          isLiteral(bindings.get('left') as Element, '0') ||
          isLiteral(bindings.get('right') as Element, '0')
        )
        .generateLiteral('0')
        .build()
    );

    return builder.build('arithmetic_identity');
  },

  /**
   * Logical simplifications
   */
  logicalSimplification: () => {
    const builder = new TransducerBuilder();

    // !!x => x (double negation)
    builder.addRule(
      new TransformRuleBuilder()
        .setName('double_negation')
        .matchUnaryOp('unary_!')
        .when(bindings => {
          const operand = bindings.get('operand') as Element;
          return operand.kind === 'call' && operand.name === 'unary_!';
        })
        .generateVar('operand')  // This will need custom handling
        .build()
    );

    return builder.build('logical_simplification');
  }
};
