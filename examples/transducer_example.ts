/**
 * Example: Using TreeP transducer to transform trees
 */

import { Element } from '../src/ast/types';
import { TransducerBuilder } from '../src/transducer/transducer';

// Example: Transform TreeP function definitions to another format

// Input tree (EAST format):
const inputTree: Element = {
  kind: 'def',
  name: 'add',
  attrs: [
    { key: 'x', value: 'Int' },
    { key: 'y', value: 'Int' },
    { key: 'returns', value: 'Int' }
  ],
  children: [
    {
      kind: 'param',
      name: 'x',
      attrs: [{ key: 'type', value: 'Int' }]
    },
    {
      kind: 'param',
      name: 'y',
      attrs: [{ key: 'type', value: 'Int' }]
    },
    {
      kind: 'block',
      children: [
        {
          kind: 'return',
          children: [
            {
              kind: 'call',
              name: '+',
              children: [
                { kind: 'var', name: 'x' },
                { kind: 'var', name: 'y' }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// Create transducer with rules
const transducer = new TransducerBuilder()
  .addRule({
    name: 'rename_def_to_function',
    pattern: {
      type: 'KindPattern',
      kind: 'def',
      nameVar: 'fname',
      childPatterns: [
        { type: 'VarPattern', varName: 'body' }
      ]
    },
    template: {
      type: 'NodeTemplate',
      kind: 'function',
      name: { type: 'Var', varName: 'fname' },
      children: [
        { type: 'VarTemplate', varName: 'body' }
      ]
    }
  })
  .addRule({
    name: 'rename_param_to_arg',
    pattern: {
      type: 'KindPattern',
      kind: 'param',
      nameVar: 'pname'
    },
    template: {
      type: 'NodeTemplate',
      kind: 'argument',
      name: { type: 'Var', varName: 'pname' }
    }
  })
  .build('def_to_function');

// Transform the tree
const outputTree = transducer.transform(inputTree);

console.log('Input tree:');
console.log(JSON.stringify(inputTree, null, 2));

console.log('\nOutput tree:');
console.log(JSON.stringify(outputTree, null, 2));

// Expected output:
// - 'def' nodes become 'function' nodes
// - 'param' nodes become 'argument' nodes
// - All children are recursively transformed
