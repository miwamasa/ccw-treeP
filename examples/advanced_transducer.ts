/**
 * Advanced Macro Tree Transducer Examples
 * Using helper DSL for more declarative transformations
 */

import { Element } from '../src/ast/types';
import { TransducerBuilder } from '../src/transducer/transducer';
import { TransformRuleBuilder, OptimizationRules, isLiteral, makeLiteral } from '../src/transducer/helpers';

console.log('=== Advanced Macro Tree Transducer ===\n');

// Example 1: Using the DSL for cleaner rule definition
console.log('Example 1: Declarative Rule Definition\n');

const simplifyTransducer = new TransducerBuilder()
  // x + 0 => x
  .addRule(
    new TransformRuleBuilder()
      .setName('simplify_add_zero')
      .matchBinaryOp('+')
      .when(bindings => isLiteral(bindings.get('right') as Element, '0'))
      .generateVar('left')
      .build()
  )
  // x - 0 => x
  .addRule(
    new TransformRuleBuilder()
      .setName('simplify_sub_zero')
      .matchBinaryOp('-')
      .when(bindings => isLiteral(bindings.get('right') as Element, '0'))
      .generateVar('left')
      .build()
  )
  // x * 1 => x
  .addRule(
    new TransformRuleBuilder()
      .setName('simplify_mul_one')
      .matchBinaryOp('*')
      .when(bindings => isLiteral(bindings.get('right') as Element, '1'))
      .generateVar('left')
      .build()
  )
  // x / 1 => x
  .addRule(
    new TransformRuleBuilder()
      .setName('simplify_div_one')
      .matchBinaryOp('/')
      .when(bindings => isLiteral(bindings.get('right') as Element, '1'))
      .generateVar('left')
      .build()
  )
  .build('simplifier');

// Test case: ((x * 1) + 0) / 1
const testTree1: Element = {
  kind: 'call',
  name: '/',
  children: [
    {
      kind: 'call',
      name: '+',
      children: [
        {
          kind: 'call',
          name: '*',
          children: [
            { kind: 'var', name: 'x' },
            makeLiteral('Int', '1')
          ]
        },
        makeLiteral('Int', '0')
      ]
    },
    makeLiteral('Int', '1')
  ]
};

console.log('Input: ((x * 1) + 0) / 1');
const simplified1 = simplifyTransducer.transform(testTree1);
console.log('Output:', JSON.stringify(simplified1, null, 2));
console.log('Expected: x\n');

// Example 2: Constant folding
console.log('\nExample 2: Constant Folding\n');

const constantFolder = new TransducerBuilder()
  // Fold addition of two literals
  .addRule({
    name: 'fold_add',
    pattern: {
      type: 'KindPattern',
      kind: 'call',
      nameVar: 'op',
      childPatterns: [
        { type: 'VarPattern', varName: 'left' },
        { type: 'VarPattern', varName: 'right' }
      ]
    },
    condition: (bindings) => {
      const op = bindings.get('op');
      const left = bindings.get('left') as Element;
      const right = bindings.get('right') as Element;

      if (op !== '+') return false;
      if (!isLiteral(left) || !isLiteral(right)) return false;

      return true;
    },
    template: {
      type: 'VarTemplate',
      varName: '__computed__'
    }
  })
  // Fold multiplication of two literals
  .addRule({
    name: 'fold_mul',
    pattern: {
      type: 'KindPattern',
      kind: 'call',
      nameVar: 'op',
      childPatterns: [
        { type: 'VarPattern', varName: 'left' },
        { type: 'VarPattern', varName: 'right' }
      ]
    },
    condition: (bindings) => {
      const op = bindings.get('op');
      const left = bindings.get('left') as Element;
      const right = bindings.get('right') as Element;

      if (op !== '*') return false;
      if (!isLiteral(left) || !isLiteral(right)) return false;

      // Compute and store result
      const leftVal = parseInt(left.attrs?.find(a => a.key === 'value')?.value || '0');
      const rightVal = parseInt(right.attrs?.find(a => a.key === 'value')?.value || '0');
      const result = leftVal * rightVal;

      bindings.set('__computed__', makeLiteral('Int', result.toString()));
      return true;
    },
    template: {
      type: 'VarTemplate',
      varName: '__computed__'
    }
  })
  .build('constant_folder');

// Note: The constant folder rule above is a simplified example
// In practice, you'd want to compute the value in the condition
// and store it in bindings, but this requires extending the system

// Example 3: TreeP-specific transformations
console.log('Example 3: TreeP Language Transformations\n');

const treepOptimizer = new TransducerBuilder()
  // Inline simple let bindings: let x = 5; x => 5
  .addRule(
    new TransformRuleBuilder()
      .setName('inline_simple_let')
      .matchKind('block', { captureChildrenAs: 'stmts' })
      .generateNode('block', { children: [{ list: 'stmts' }] })
      .build()
  )
  // Transform while(true) { ... } to infinite loop marker
  .addRule({
    name: 'detect_infinite_loop',
    pattern: {
      type: 'KindPattern',
      kind: 'while',
      childPatterns: [
        { type: 'VarPattern', varName: 'cond' },
        { type: 'VarPattern', varName: 'body' }
      ]
    },
    condition: (bindings) => {
      const cond = bindings.get('cond') as Element;
      // Check if condition is literally 'true'
      return cond.kind === 'condition' &&
             cond.children?.[0]?.kind === 'literal' &&
             cond.children[0].attrs?.find(a => a.key === 'value')?.value === 'true';
    },
    template: {
      type: 'NodeTemplate',
      kind: 'infinite_loop',
      children: [
        { type: 'VarTemplate', varName: 'body' }
      ]
    }
  })
  .build('treep_optimizer');

// Example 4: Multi-stage transformation pipeline
console.log('\nExample 4: Multi-Stage Pipeline\n');

class FixpointTransducer {
  constructor(private transducer: any, private maxIterations: number = 10) {}

  /**
   * Apply transducer repeatedly until fixpoint (no more changes)
   */
  transform(tree: Element): Element {
    let current = tree;
    let iterations = 0;

    while (iterations < this.maxIterations) {
      const next = this.transducer.transform(current);

      // Check if tree changed
      if (JSON.stringify(next) === JSON.stringify(current)) {
        console.log(`Reached fixpoint after ${iterations} iterations`);
        return current;
      }

      current = next;
      iterations++;
    }

    console.log(`Max iterations (${this.maxIterations}) reached`);
    return current;
  }
}

// Use fixpoint transformer for nested optimizations
const fixpointSimplifier = new FixpointTransducer(simplifyTransducer);

const nestedTree: Element = {
  kind: 'call',
  name: '+',
  children: [
    {
      kind: 'call',
      name: '*',
      children: [
        {
          kind: 'call',
          name: '+',
          children: [
            { kind: 'var', name: 'x' },
            makeLiteral('Int', '0')
          ]
        },
        makeLiteral('Int', '1')
      ]
    },
    makeLiteral('Int', '0')
  ]
};

console.log('Input: ((x + 0) * 1) + 0');
console.log(JSON.stringify(nestedTree, null, 2));
console.log('\nApplying fixpoint simplification...\n');

const fixpointResult = fixpointSimplifier.transform(nestedTree);
console.log('Output:', JSON.stringify(fixpointResult, null, 2));

console.log('\n=== Advanced Features Summary ===');
console.log('1. Declarative DSL for rule definition');
console.log('2. Helper functions for common patterns');
console.log('3. Constant folding transformations');
console.log('4. Language-specific optimizations');
console.log('5. Fixpoint iteration for nested transforms');
console.log('6. Type-safe pattern matching with TypeScript');
