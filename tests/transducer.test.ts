import { Element } from '../src/ast/types';
import { TransducerBuilder } from '../src/transducer/transducer';

describe('Transducer', () => {
  test('transforms def to function', () => {
    const input: Element = {
      kind: 'def',
      name: 'test',
      children: [
        { kind: 'param', name: 'x' }
      ]
    };

    const transducer = new TransducerBuilder()
      .addRule({
        name: 'def_to_function',
        pattern: {
          type: 'KindPattern',
          kind: 'def',
          nameVar: 'fname'
        },
        template: {
          type: 'NodeTemplate',
          kind: 'function',
          name: { type: 'Var', varName: 'fname' }
        }
      })
      .build('test');

    const output = transducer.transform(input);

    expect(output.kind).toBe('function');
    expect(output.name).toBe('test');
  });

  test('recursively transforms children', () => {
    const input: Element = {
      kind: 'block',
      children: [
        { kind: 'def', name: 'f1' },
        { kind: 'def', name: 'f2' }
      ]
    };

    const transducer = new TransducerBuilder()
      .addRule({
        name: 'def_to_function',
        pattern: {
          type: 'KindPattern',
          kind: 'def',
          nameVar: 'fname'
        },
        template: {
          type: 'NodeTemplate',
          kind: 'function',
          name: { type: 'Var', varName: 'fname' }
        }
      })
      .build('test');

    const output = transducer.transform(input);

    expect(output.kind).toBe('block');
    expect(output.children?.length).toBe(2);
    expect(output.children?.[0].kind).toBe('function');
    expect(output.children?.[1].kind).toBe('function');
  });

  test('matches patterns with attributes', () => {
    const input: Element = {
      kind: 'literal',
      attrs: [
        { key: 'type', value: 'Int' },
        { key: 'value', value: '42' }
      ]
    };

    const transducer = new TransducerBuilder()
      .addRule({
        name: 'extract_int_value',
        pattern: {
          type: 'KindPattern',
          kind: 'literal',
          attrPatterns: [
            { key: 'type', literal: 'Int' },
            { key: 'value', valueVar: 'val' }
          ]
        },
        template: {
          type: 'NodeTemplate',
          kind: 'number',
          attrs: [
            { key: 'value', value: { type: 'Var', varName: 'val' } }
          ]
        }
      })
      .build('test');

    const output = transducer.transform(input);

    expect(output.kind).toBe('number');
    expect(output.attrs?.find(a => a.key === 'value')?.value).toBe('42');
  });
});
