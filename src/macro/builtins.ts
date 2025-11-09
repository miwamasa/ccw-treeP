import { Element } from '../ast/types';

/**
 * Built-in macros for TreeP
 */

interface MacroDefinition {
  name: string;
  pattern: string;
  expand: (args: Map<string, Element>) => Element;
}

/**
 * Helper to create lambda element
 */
function makeLambda(body: Element): Element {
  return {
    kind: 'lambda',
    children: [body]
  };
}

/**
 * Helper to create call element
 */
function makeCall(name: string, args: Element[]): Element {
  return {
    kind: 'call',
    name,
    children: args
  };
}

/**
 * Helper to create if element
 */
function makeIf(cond: Element, thenBranch: Element, elseBranch?: Element): Element {
  const children: Element[] = [
    { kind: 'condition', children: [cond] },
    thenBranch
  ];
  if (elseBranch) {
    children.push(elseBranch);
  }
  return {
    kind: 'if',
    children
  };
}

export const builtinMacros: MacroDefinition[] = [
  // when(cond) { body } -> if (cond) { body }
  {
    name: 'when',
    pattern: '$cond, $body',
    expand: (args) => {
      const cond = args.get('cond')!;
      const body = args.get('body')!;

      return makeIf(
        cond,
        {
          kind: 'block',
          children: [
            makeCall('call', [body])
          ]
        }
      );
    }
  },

  // assert(condition) -> if (!condition) { error("Assertion failed") }
  {
    name: 'assert',
    pattern: '$cond',
    expand: (args) => {
      const cond = args.get('cond')!;

      return makeIf(
        makeCall('unary_!', [cond]),
        {
          kind: 'block',
          children: [
            makeCall('error', [
              {
                kind: 'literal',
                attrs: [
                  { key: 'type', value: 'String' },
                  { key: 'value', value: 'Assertion failed' }
                ]
              }
            ])
          ]
        }
      );
    }
  },

  // debug(expr) -> println("Debug: " + toString(expr))
  {
    name: 'debug',
    pattern: '$expr',
    expand: (args) => {
      const expr = args.get('expr')!;

      return makeCall('println', [
        makeCall('+', [
          {
            kind: 'literal',
            attrs: [
              { key: 'type', value: 'String' },
              { key: 'value', value: 'Debug: ' }
            ]
          },
          makeCall('toString', [expr])
        ])
      ]);
    }
  },

  // log(message) -> println("[LOG] " + message)
  {
    name: 'log',
    pattern: '$msg',
    expand: (args) => {
      const msg = args.get('msg')!;

      return makeCall('println', [
        makeCall('+', [
          {
            kind: 'literal',
            attrs: [
              { key: 'type', value: 'String' },
              { key: 'value', value: '[LOG] ' }
            ]
          },
          msg
        ])
      ]);
    }
  },

  // trace(expr) -> { let result = expr; println("Trace: " + toString(result)); result }
  {
    name: 'trace',
    pattern: '$expr',
    expand: (args) => {
      const expr = args.get('expr')!;

      return {
        kind: 'block',
        children: [
          {
            kind: 'let',
            name: '__trace_result',
            children: [expr]
          },
          makeCall('println', [
            makeCall('+', [
              {
                kind: 'literal',
                attrs: [
                  { key: 'type', value: 'String' },
                  { key: 'value', value: 'Trace: ' }
                ]
              },
              makeCall('toString', [
                { kind: 'var', name: '__trace_result' }
              ])
            ])
          ]),
          { kind: 'var', name: '__trace_result' }
        ]
      };
    }
  },

  // inc(x) -> x = x + 1
  {
    name: 'inc',
    pattern: '$x',
    expand: (args) => {
      const x = args.get('x')!;

      return makeCall('=', [
        x,
        makeCall('+', [
          x,
          {
            kind: 'literal',
            attrs: [
              { key: 'type', value: 'Int' },
              { key: 'value', value: '1' }
            ]
          }
        ])
      ]);
    }
  },

  // dec(x) -> x = x - 1
  {
    name: 'dec',
    pattern: '$x',
    expand: (args) => {
      const x = args.get('x')!;

      return makeCall('=', [
        x,
        makeCall('-', [
          x,
          {
            kind: 'literal',
            attrs: [
              { key: 'type', value: 'Int' },
              { key: 'value', value: '1' }
            ]
          }
        ])
      ]);
    }
  },

  // ifZero(x) { body } -> if (x == 0) { body }
  {
    name: 'ifZero',
    pattern: '$x, $body',
    expand: (args) => {
      const x = args.get('x')!;
      const body = args.get('body')!;

      return makeIf(
        makeCall('==', [
          x,
          {
            kind: 'literal',
            attrs: [
              { key: 'type', value: 'Int' },
              { key: 'value', value: '0' }
            ]
          }
        ]),
        {
          kind: 'block',
          children: [makeCall('call', [body])]
        }
      );
    }
  },

  // ifPositive(x) { body } -> if (x > 0) { body }
  {
    name: 'ifPositive',
    pattern: '$x, $body',
    expand: (args) => {
      const x = args.get('x')!;
      const body = args.get('body')!;

      return makeIf(
        makeCall('>', [
          x,
          {
            kind: 'literal',
            attrs: [
              { key: 'type', value: 'Int' },
              { key: 'value', value: '0' }
            ]
          }
        ]),
        {
          kind: 'block',
          children: [makeCall('call', [body])]
        }
      );
    }
  },

  // until(cond) { body } -> while (!cond) { body }
  {
    name: 'until',
    pattern: '$cond, $body',
    expand: (args) => {
      const cond = args.get('cond')!;
      const body = args.get('body')!;

      return {
        kind: 'while',
        children: [
          {
            kind: 'condition',
            children: [makeCall('unary_!', [cond])]
          },
          {
            kind: 'block',
            children: [makeCall('call', [body])]
          }
        ]
      };
    }
  }
];
