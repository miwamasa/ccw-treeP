/**
 * Example: Macro Tree Transducer
 *
 * Combines TreeP's macro system with transducers to create
 * a powerful declarative tree transformation system.
 */

import { Element } from '../src/ast/types';
import { TransducerBuilder } from '../src/transducer/transducer';
import { TreeP } from '../src/index';

console.log('=== Macro Tree Transducer Example ===\n');

// Example 1: TreeP AST optimization transformer
// Optimize "x + 0" => "x" and "x * 1" => "x"

const optimizationTransducer = new TransducerBuilder()
  // Optimize: x + 0 => x
  .addRule({
    name: 'optimize_add_zero',
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
      const right = bindings.get('right') as Element;
      return op === '+' &&
             right.kind === 'literal' &&
             right.attrs?.find(a => a.key === 'value')?.value === '0';
    },
    template: {
      type: 'VarTemplate',
      varName: 'left'
    }
  })
  // Optimize: x * 1 => x
  .addRule({
    name: 'optimize_mul_one',
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
      const right = bindings.get('right') as Element;
      return op === '*' &&
             right.kind === 'literal' &&
             right.attrs?.find(a => a.key === 'value')?.value === '1';
    },
    template: {
      type: 'VarTemplate',
      varName: 'left'
    }
  })
  // Optimize: 0 * x => 0
  .addRule({
    name: 'optimize_zero_mul',
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
      return op === '*' &&
             left.kind === 'literal' &&
             left.attrs?.find(a => a.key === 'value')?.value === '0';
    },
    template: {
      type: 'LiteralTemplate',
      value: '0'
    }
  })
  .build('optimizer');

// Test optimization
const unoptimizedTree: Element = {
  kind: 'call',
  name: '+',
  children: [
    {
      kind: 'call',
      name: '*',
      children: [
        { kind: 'var', name: 'x' },
        { kind: 'literal', attrs: [{ key: 'type', value: 'Int' }, { key: 'value', value: '1' }] }
      ]
    },
    { kind: 'literal', attrs: [{ key: 'type', value: 'Int' }, { key: 'value', value: '0' }] }
  ]
};

console.log('Example 1: AST Optimization');
console.log('Before optimization:', JSON.stringify(unoptimizedTree, null, 2));
const optimizedTree = optimizationTransducer.transform(unoptimizedTree);
console.log('\nAfter optimization:', JSON.stringify(optimizedTree, null, 2));
console.log('Result: (x * 1) + 0 => x\n');

// Example 2: TreeP to JavaScript code generator
const codeGenTransducer = new TransducerBuilder()
  // Transform function definition
  .addRule({
    name: 'gen_function',
    pattern: {
      type: 'KindPattern',
      kind: 'def',
      nameVar: 'fname',
      childPatterns: [
        { type: 'ListPattern', restVar: 'body' }
      ]
    },
    template: {
      type: 'NodeTemplate',
      kind: 'js_function',
      name: { type: 'Var', varName: 'fname' },
      children: [
        { type: 'ListTemplate', listVar: 'body' }
      ]
    }
  })
  // Transform parameters
  .addRule({
    name: 'gen_param',
    pattern: {
      type: 'KindPattern',
      kind: 'param',
      nameVar: 'pname'
    },
    template: {
      type: 'NodeTemplate',
      kind: 'js_param',
      name: { type: 'Var', varName: 'pname' }
    }
  })
  // Transform return statement
  .addRule({
    name: 'gen_return',
    pattern: {
      type: 'KindPattern',
      kind: 'return',
      childPatterns: [
        { type: 'VarPattern', varName: 'expr' }
      ]
    },
    template: {
      type: 'NodeTemplate',
      kind: 'js_return',
      children: [
        { type: 'VarTemplate', varName: 'expr' }
      ]
    }
  })
  .build('codegen');

// Example 3: Pattern-based tree rewriting (like term rewriting)
const rewriteTransducer = new TransducerBuilder()
  // Double negation elimination: !!x => x
  .addRule({
    name: 'eliminate_double_negation',
    pattern: {
      type: 'KindPattern',
      kind: 'call',
      nameVar: 'op1',
      childPatterns: [
        {
          type: 'KindPattern',
          kind: 'call',
          nameVar: 'op2',
          childPatterns: [
            { type: 'VarPattern', varName: 'expr' }
          ]
        }
      ]
    },
    condition: (bindings) => {
      return bindings.get('op1') === 'unary_!' && bindings.get('op2') === 'unary_!';
    },
    template: {
      type: 'VarTemplate',
      varName: 'expr'
    }
  })
  // De Morgan's law: !(a && b) => (!a || !b)
  .addRule({
    name: 'demorgan_and',
    pattern: {
      type: 'KindPattern',
      kind: 'call',
      nameVar: 'op1',
      childPatterns: [
        {
          type: 'KindPattern',
          kind: 'call',
          nameVar: 'op2',
          childPatterns: [
            { type: 'VarPattern', varName: 'a' },
            { type: 'VarPattern', varName: 'b' }
          ]
        }
      ]
    },
    condition: (bindings) => {
      return bindings.get('op1') === 'unary_!' && bindings.get('op2') === '&&';
    },
    template: {
      type: 'NodeTemplate',
      kind: 'call',
      name: { type: 'Literal', value: '||' },
      children: [
        {
          type: 'NodeTemplate',
          kind: 'call',
          name: { type: 'Literal', value: 'unary_!' },
          children: [
            { type: 'VarTemplate', varName: 'a' }
          ]
        },
        {
          type: 'NodeTemplate',
          kind: 'call',
          name: { type: 'Literal', value: 'unary_!' },
          children: [
            { type: 'VarTemplate', varName: 'b' }
          ]
        }
      ]
    }
  })
  .build('rewriter');

// Test double negation elimination
const doubleNegTree: Element = {
  kind: 'call',
  name: 'unary_!',
  children: [
    {
      kind: 'call',
      name: 'unary_!',
      children: [
        { kind: 'var', name: 'x' }
      ]
    }
  ]
};

console.log('\nExample 2: Pattern-based Rewriting');
console.log('Before: !!x');
console.log(JSON.stringify(doubleNegTree, null, 2));
const rewrittenTree = rewriteTransducer.transform(doubleNegTree);
console.log('\nAfter: x');
console.log(JSON.stringify(rewrittenTree, null, 2));

// Example 4: Multi-pass transformation pipeline
console.log('\n\nExample 3: Multi-pass Transformation Pipeline');
console.log('Demonstrating composition of transducers\n');

// Create a pipeline that applies multiple transformations
class TransducerPipeline {
  private transducers: any[] = [];

  add(transducer: any): this {
    this.transducers.push(transducer);
    return this;
  }

  transform(tree: Element): Element {
    let result = tree;
    for (const transducer of this.transducers) {
      result = transducer.transform(result);
    }
    return result;
  }
}

const pipeline = new TransducerPipeline()
  .add(rewriteTransducer)      // Apply logical simplifications
  .add(optimizationTransducer); // Apply arithmetic optimizations

const complexTree: Element = {
  kind: 'call',
  name: '+',
  children: [
    {
      kind: 'call',
      name: 'unary_!',
      children: [
        {
          kind: 'call',
          name: 'unary_!',
          children: [
            { kind: 'var', name: 'y' }
          ]
        }
      ]
    },
    { kind: 'literal', attrs: [{ key: 'type', value: 'Int' }, { key: 'value', value: '0' }] }
  ]
};

console.log('Input: (!!y) + 0');
console.log(JSON.stringify(complexTree, null, 2));

const pipelineResult = pipeline.transform(complexTree);

console.log('\nAfter pipeline (rewrite + optimize): y');
console.log(JSON.stringify(pipelineResult, null, 2));

console.log('\n=== Summary ===');
console.log('Macro Tree Transducer features:');
console.log('1. Pattern matching with conditions');
console.log('2. Template-based code generation');
console.log('3. Multi-pass transformation pipelines');
console.log('4. AST optimization and rewriting');
console.log('5. Declarative transformation rules');
