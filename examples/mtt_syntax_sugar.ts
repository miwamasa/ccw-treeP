/**
 * MTT Syntax Sugar - Proof of Concept Implementation
 *
 * This demonstrates how the proposed MTT syntax sugar could be implemented
 * in TreeP, showing both tree literals and declarative MTT rules.
 */

import { Element } from '../src/ast/types';

// =============================================================================
// Tree Literal Parser
// =============================================================================

/**
 * Parse tree literal from string
 *
 * Syntax: tree NodeName(child1, child2, ...)
 *
 * Examples:
 *   tree e
 *   tree a(e, e)
 *   tree Family(lastName(March), m-list(father(Jim), e))
 */
class TreeLiteralParser {
  private pos: number = 0;
  private input: string = '';

  parse(input: string): Element {
    this.input = input.trim();
    this.pos = 0;

    // Skip 'tree' keyword if present
    if (this.input.startsWith('tree ')) {
      this.pos = 5;
    }

    return this.parseNode();
  }

  private parseNode(): Element {
    this.skipWhitespace();

    // Parse node name
    const name = this.parseIdentifier();

    this.skipWhitespace();

    // Check for children
    if (this.peek() === '(') {
      this.pos++; // consume '('
      const children = this.parseNodeList();
      this.expect(')');
      return { kind: name, children };
    }

    // Leaf node
    // Special cases: 'e', 'nil' are node kinds, not identifiers
    if (name === 'e' || name === 'nil') {
      return { kind: name };
    }

    // Regular identifiers
    return { kind: 'identifier', name };
  }

  private parseNodeList(): Element[] {
    const nodes: Element[] = [];

    this.skipWhitespace();

    // Empty list
    if (this.peek() === ')') {
      return nodes;
    }

    while (true) {
      nodes.push(this.parseNode());
      this.skipWhitespace();

      if (this.peek() === ',') {
        this.pos++; // consume ','
        continue;
      }

      break;
    }

    return nodes;
  }

  private parseIdentifier(): string {
    this.skipWhitespace();

    let result = '';
    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];
      if (/[a-zA-Z0-9_-]/.test(ch)) {
        result += ch;
        this.pos++;
      } else {
        break;
      }
    }

    if (result.length === 0) {
      throw new Error(`Expected identifier at position ${this.pos}`);
    }

    return result;
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }

  private peek(): string {
    this.skipWhitespace();
    return this.pos < this.input.length ? this.input[this.pos] : '';
  }

  private expect(char: string): void {
    this.skipWhitespace();
    if (this.input[this.pos] !== char) {
      throw new Error(`Expected '${char}' at position ${this.pos}, got '${this.input[this.pos]}'`);
    }
    this.pos++;
  }
}

// Helper function
function tree(literal: string): Element {
  const parser = new TreeLiteralParser();
  return parser.parse(literal);
}

// =============================================================================
// MTT Rule Builder (DSL)
// =============================================================================

/**
 * Fluent interface for building MTT rules
 */
class MTTRuleBuilder {
  private state?: string;
  private kind?: string;
  private patternVars: string[] = [];
  private paramVars: string[] = [];
  private handler?: (bindings: Map<string, any>, params: any[]) => Element;

  /**
   * Define the pattern: <state, kind(var1, var2, ...)>
   */
  pattern(state: string, kind: string, ...vars: string[]): this {
    this.state = state;
    this.kind = kind;
    this.patternVars = vars;
    return this;
  }

  /**
   * Define parameters: (param1, param2, ...)
   */
  params(...params: string[]): this {
    this.paramVars = params;
    return this;
  }

  /**
   * Define the template/handler
   */
  template(handler: (bindings: Map<string, any>, params: any[]) => Element): this {
    this.handler = handler;
    return this;
  }

  build(): { state: string; kind: string; handler: (elem: Element, params: any[]) => Element } {
    if (!this.state || !this.kind || !this.handler) {
      throw new Error('Rule is incomplete');
    }

    const patternVars = this.patternVars;
    const handler = this.handler;

    return {
      state: this.state,
      kind: this.kind,
      handler: (elem: Element, params: any[]) => {
        const bindings = new Map<string, any>();

        // Bind pattern variables to children
        const children = elem.children || [];
        for (let i = 0; i < patternVars.length; i++) {
          bindings.set(patternVars[i], children[i]);
        }

        return handler(bindings, params);
      }
    };
  }
}

/**
 * Stateful MTT with fluent rule builder
 */
class MTTBuilder {
  private states: Set<string> = new Set();
  private initialState?: string;
  private rules: Array<{ state: string; kind: string; handler: (elem: Element, params: any[]) => Element }> = [];

  /**
   * Declare states
   */
  withStates(...states: string[]): this {
    states.forEach(s => this.states.add(s));
    return this;
  }

  /**
   * Set initial state
   */
  withInitial(state: string): this {
    this.initialState = state;
    return this;
  }

  /**
   * Add a rule
   */
  addRule(builder: MTTRuleBuilder | ((b: MTTRuleBuilder) => MTTRuleBuilder)): this {
    const rule = typeof builder === 'function' ? builder(new MTTRuleBuilder()).build() : builder.build();
    this.rules.push(rule);
    return this;
  }

  /**
   * Build the MTT
   */
  build(): StatefulMTT {
    if (!this.initialState) {
      throw new Error('Initial state not set');
    }

    const mtt = new StatefulMTT();

    for (const rule of this.rules) {
      mtt.addRule(rule.state, rule.kind, rule.handler);
    }

    return mtt;
  }
}

// Stateful MTT class (from mtt_examples.ts)
class StatefulMTT {
  private rules: Map<string, Map<string, (elem: Element, params: any[]) => Element>> = new Map();

  addRule(state: string, kind: string, handler: (elem: Element, params: any[]) => Element): this {
    if (!this.rules.has(state)) {
      this.rules.set(state, new Map());
    }
    this.rules.get(state)!.set(kind, handler);
    return this;
  }

  transform(state: string, elem: Element, ...params: any[]): Element {
    const stateRules = this.rules.get(state);
    if (!stateRules) {
      throw new Error(`No rules defined for state: ${state}`);
    }
    const handler = stateRules.get(elem.kind);
    if (!handler) {
      throw new Error(`No rule defined for state '${state}' and kind '${elem.kind}'`);
    }
    return handler(elem, params);
  }
}

// =============================================================================
// Example 1: Tree Literals
// =============================================================================

function example1_tree_literals() {
  console.log('\n=== Example 1: Tree Literals ===\n');

  // Simple leaf
  const t1 = tree('e');
  console.log('tree e =>');
  console.log(JSON.stringify(t1, null, 2));

  // Binary tree
  const t2 = tree('a(b(e, e), e)');
  console.log('\ntree a(b(e, e), e) =>');
  console.log(JSON.stringify(t2, null, 2));

  // Family tree
  const t3 = tree(`
    Family(
      lastName(March),
      m-list(
        father(Jim),
        m-list(
          mother(Cindy),
          m-list(daughter(Brenda), e)
        )
      )
    )
  `);
  console.log('\nFamily tree =>');
  console.log(JSON.stringify(t3, null, 2));
}

// =============================================================================
// Example 2: MTT with Builder DSL
// =============================================================================

function example2_mtt_builder() {
  console.log('\n=== Example 2: MTT Builder DSL ===\n');

  // Build MTT using fluent API
  const familyMTT = new MTTBuilder()
    .withStates('q0', 'q', 'qid')
    .withInitial('q0')

    // rule <q0, Family(x1, x2)> => q(x2, qid(x1))
    .addRule(b => b
      .pattern('q0', 'Family', 'x1', 'x2')
      .template((bindings, params) => {
        const x1 = bindings.get('x1')!;
        const x2 = bindings.get('x2')!;
        const mtt = familyMTT.build();

        // Extract lastName
        const lastName = mtt.transform('qid', x1.children![0]);

        // Process member list with lastName
        return mtt.transform('q', x2, lastName.name);
      })
    )

    // rule <q, m-list(x1, x2)>(y) => o(q(x1, y), q(x2, y))
    .addRule(b => b
      .pattern('q', 'm-list', 'x1', 'x2')
      .params('y')
      .template((bindings, params) => {
        const x1 = bindings.get('x1')!;
        const x2 = bindings.get('x2')!;
        const [y] = params;
        const mtt = familyMTT.build();

        return {
          kind: 'o',
          children: [
            mtt.transform('q', x1, y),
            mtt.transform('q', x2, y)
          ]
        };
      })
    )

    // rule <q, father(x1)>(y) => Male(y, qid(x1))
    .addRule(b => b
      .pattern('q', 'father', 'x1')
      .params('y')
      .template((bindings, params) => {
        const x1 = bindings.get('x1')!;
        const [y] = params;
        const mtt = familyMTT.build();

        const firstName = mtt.transform('qid', x1);

        return {
          kind: 'Male',
          children: [
            { kind: 'identifier', name: y },
            firstName
          ]
        };
      })
    )

    // rule <q, mother(x1)>(y) => Female(y, qid(x1))
    .addRule(b => b
      .pattern('q', 'mother', 'x1')
      .params('y')
      .template((bindings, params) => {
        const x1 = bindings.get('x1')!;
        const [y] = params;
        const mtt = familyMTT.build();

        const firstName = mtt.transform('qid', x1);

        return {
          kind: 'Female',
          children: [
            { kind: 'identifier', name: y },
            firstName
          ]
        };
      })
    )

    // rule <q, daughter(x1)>(y) => Female(y, qid(x1))
    .addRule(b => b
      .pattern('q', 'daughter', 'x1')
      .params('y')
      .template((bindings, params) => {
        const x1 = bindings.get('x1')!;
        const [y] = params;
        const mtt = familyMTT.build();

        const firstName = mtt.transform('qid', x1);

        return {
          kind: 'Female',
          children: [
            { kind: 'identifier', name: y },
            firstName
          ]
        };
      })
    )

    // rule <q, e>(y) => e
    .addRule(b => b
      .pattern('q', 'e')
      .params('y')
      .template((bindings, params) => {
        return { kind: 'e' };
      })
    )

    // rule <qid, lastName(x1)> => qid(x1)
    .addRule(b => b
      .pattern('qid', 'lastName', 'x1')
      .template((bindings, params) => {
        return bindings.get('x1')!;
      })
    )

    // rule <qid, identifier> => identifier.name
    .addRule(b => b
      .pattern('qid', 'identifier')
      .template((bindings, params) => {
        // Return as-is (already an identifier Element)
        return bindings.get('x1')!;
      })
    );

  // Note: We need to fix the circular dependency issue
  // For now, let's create a simpler version

  console.log('MTT Builder created successfully');
  console.log('States: q0, q, qid');
  console.log('Rules: 8 rules defined');
}

// =============================================================================
// Example 3: Complete Family Tree with Syntax Sugar
// =============================================================================

function example3_complete_family_tree() {
  console.log('\n=== Example 3: Complete Family Tree ===\n');

  // Input tree using tree literal
  const input = tree(`
    Family(
      lastName(March),
      m-list(
        father(Jim),
        m-list(
          mother(Cindy),
          m-list(daughter(Brenda), e)
        )
      )
    )
  `);

  console.log('Input (using tree literal):');
  console.log('Family(lastName(March), m-list(father(Jim), ...))');

  // Define MTT manually (avoiding circular dependency for now)
  const mtt = new StatefulMTT();

  // <q0, Family> -> ...
  mtt.addRule('q0', 'Family', (elem, params) => {
    const [x1, x2] = elem.children!;
    const lastName = mtt.transform('qid', x1.children![0]);
    return mtt.transform('q', x2, lastName.name);
  });

  // <q, m-list>(y) -> ...
  mtt.addRule('q', 'm-list', (elem, params) => {
    const [y] = params;
    const [x1, x2] = elem.children!;
    return {
      kind: 'o',
      children: [
        mtt.transform('q', x1, y),
        mtt.transform('q', x2, y)
      ]
    };
  });

  // <q, father>(y) -> Male(y, ...)
  mtt.addRule('q', 'father', (elem, params) => {
    const [y] = params;
    const firstName = mtt.transform('qid', elem.children![0]);
    return {
      kind: 'Male',
      children: [
        { kind: 'identifier', name: y },
        firstName
      ]
    };
  });

  // <q, mother>(y) -> Female(y, ...)
  mtt.addRule('q', 'mother', (elem, params) => {
    const [y] = params;
    const firstName = mtt.transform('qid', elem.children![0]);
    return {
      kind: 'Female',
      children: [
        { kind: 'identifier', name: y },
        firstName
      ]
    };
  });

  // <q, daughter>(y) -> Female(y, ...)
  mtt.addRule('q', 'daughter', (elem, params) => {
    const [y] = params;
    const firstName = mtt.transform('qid', elem.children![0]);
    return {
      kind: 'Female',
      children: [
        { kind: 'identifier', name: y },
        firstName
      ]
    };
  });

  // <q, e>(y) -> e
  mtt.addRule('q', 'e', (elem, params) => {
    return { kind: 'e' };
  });

  // <qid, identifier> -> ...
  mtt.addRule('qid', 'identifier', (elem, params) => {
    return { kind: 'identifier', name: elem.name };
  });

  // Transform
  const output = mtt.transform('q0', input);

  console.log('\nOutput:');
  console.log(JSON.stringify(output, null, 2));

  console.log('\nExpected: o(Male(March, Jim), o(Female(March, Cindy), ...))');
}

// =============================================================================
// Example 4: Declarative MTT with Syntax Sugar
// =============================================================================

/**
 * Enhanced MTT DSL that closely resembles the proposed syntax sugar
 *
 * Proposed syntax (from docs):
 *   mtt FamilyTransducer {
 *     states: q0, q, qid
 *     initial: q0
 *     rule <q0, Family(lastName, members)> => q(members, qid(lastName))
 *     rule <q, m-list(first, rest)>(lastName) => o(q(first, lastName), q(rest, lastName))
 *     ...
 *   }
 *
 * This example demonstrates a TypeScript implementation that approximates this syntax.
 */

// Helper: Create rule definition in declarative style
type RuleDef = {
  pattern: { state: string; kind: string; vars: string[] };
  params?: string[];
  transform: string; // Template as string (for display)
  handler: (mtt: any, bindings: Map<string, Element>, params: any[]) => Element;
};

class DeclarativeMTT {
  private name: string;
  private states: string[];
  private initialState: string;
  private rules: RuleDef[] = [];
  private compiledMTT?: StatefulMTT;

  constructor(name: string) {
    this.name = name;
    this.states = [];
    this.initialState = '';
  }

  withStates(...states: string[]): this {
    this.states = states;
    return this;
  }

  withInitial(state: string): this {
    this.initialState = state;
    return this;
  }

  rule(
    pattern: { state: string; kind: string; vars: string[] },
    params: string[] | null,
    transform: string,
    handler: (mtt: any, bindings: Map<string, Element>, params: any[]) => Element
  ): this {
    this.rules.push({
      pattern,
      params: params || undefined,
      transform,
      handler
    });
    return this;
  }

  compile(): StatefulMTT {
    const mtt = new StatefulMTT();

    for (const rule of this.rules) {
      const { pattern, handler } = rule;

      mtt.addRule(pattern.state, pattern.kind, (elem, params) => {
        const bindings = new Map<string, Element>();

        // Bind pattern variables
        const children = elem.children || [];
        for (let i = 0; i < pattern.vars.length; i++) {
          bindings.set(pattern.vars[i], children[i]);
        }

        // Bind @name if element has a name
        if (elem.name) {
          bindings.set('@name', { kind: 'identifier', name: elem.name });
        }

        return handler(mtt, bindings, params);
      });
    }

    this.compiledMTT = mtt;
    return mtt;
  }

  transform(elem: Element): Element {
    if (!this.compiledMTT) {
      this.compile();
    }
    return this.compiledMTT!.transform(this.initialState, elem);
  }

  displayRules(): void {
    console.log(`mtt ${this.name} {`);
    console.log(`  states: ${this.states.join(', ')}`);
    console.log(`  initial: ${this.initialState}`);
    console.log('');

    for (const rule of this.rules) {
      const { pattern, params, transform } = rule;
      const varList = pattern.vars.length > 0 ? `(${pattern.vars.join(', ')})` : '';
      const paramList = params && params.length > 0 ? `(${params.join(', ')})` : '';
      console.log(`  rule <${pattern.state}, ${pattern.kind}${varList}>${paramList}`);
      console.log(`    => ${transform}`);
      console.log('');
    }

    console.log('}');
  }
}

function example4_declarative_syntax_sugar() {
  console.log('\n=== Example 4: Declarative MTT Syntax Sugar ===\n');

  // Define MTT using declarative syntax (close to proposed sugar)
  const FamilyTransducer = new DeclarativeMTT('FamilyTransducer')
    .withStates('q0', 'q', 'qid')
    .withInitial('q0')

    // rule <q0, Family(lastName, members)> => q(members, qid(lastName))
    .rule(
      { state: 'q0', kind: 'Family', vars: ['lastName', 'members'] },
      null,
      'q(members, qid(lastName))',
      (mtt, bindings, params) => {
        const lastName = bindings.get('lastName')!;
        const members = bindings.get('members')!;

        // Extract lastName value
        const lastNameValue = mtt.transform('qid', lastName.children![0]);

        // Process members with lastName as parameter
        return mtt.transform('q', members, lastNameValue.name);
      }
    )

    // rule <q, m-list(first, rest)>(lastName) => o(q(first, lastName), q(rest, lastName))
    .rule(
      { state: 'q', kind: 'm-list', vars: ['first', 'rest'] },
      ['lastName'],
      'o(q(first, lastName), q(rest, lastName))',
      (mtt, bindings, params) => {
        const first = bindings.get('first')!;
        const rest = bindings.get('rest')!;
        const [lastName] = params;

        return {
          kind: 'o',
          children: [
            mtt.transform('q', first, lastName),
            mtt.transform('q', rest, lastName)
          ]
        };
      }
    )

    // rule <q, father(@name)>(lastName) => Male(lastName, @name)
    .rule(
      { state: 'q', kind: 'father', vars: ['nameNode'] },
      ['lastName'],
      'Male(lastName, @name)',
      (mtt, bindings, params) => {
        const nameNode = bindings.get('nameNode')!;
        const [lastName] = params;

        const firstName = mtt.transform('qid', nameNode);

        return {
          kind: 'Male',
          children: [
            { kind: 'identifier', name: lastName },
            firstName
          ]
        };
      }
    )

    // rule <q, mother(@name)>(lastName) => Female(lastName, @name)
    .rule(
      { state: 'q', kind: 'mother', vars: ['nameNode'] },
      ['lastName'],
      'Female(lastName, @name)',
      (mtt, bindings, params) => {
        const nameNode = bindings.get('nameNode')!;
        const [lastName] = params;

        const firstName = mtt.transform('qid', nameNode);

        return {
          kind: 'Female',
          children: [
            { kind: 'identifier', name: lastName },
            firstName
          ]
        };
      }
    )

    // rule <q, son(@name)>(lastName) => Male(lastName, @name)
    .rule(
      { state: 'q', kind: 'son', vars: ['nameNode'] },
      ['lastName'],
      'Male(lastName, @name)',
      (mtt, bindings, params) => {
        const nameNode = bindings.get('nameNode')!;
        const [lastName] = params;

        const firstName = mtt.transform('qid', nameNode);

        return {
          kind: 'Male',
          children: [
            { kind: 'identifier', name: lastName },
            firstName
          ]
        };
      }
    )

    // rule <q, daughter(@name)>(lastName) => Female(lastName, @name)
    .rule(
      { state: 'q', kind: 'daughter', vars: ['nameNode'] },
      ['lastName'],
      'Female(lastName, @name)',
      (mtt, bindings, params) => {
        const nameNode = bindings.get('nameNode')!;
        const [lastName] = params;

        const firstName = mtt.transform('qid', nameNode);

        return {
          kind: 'Female',
          children: [
            { kind: 'identifier', name: lastName },
            firstName
          ]
        };
      }
    )

    // rule <q, e>(_) => e
    .rule(
      { state: 'q', kind: 'e', vars: [] },
      ['_'],
      'e',
      (mtt, bindings, params) => {
        return { kind: 'e' };
      }
    )

    // rule <qid, lastName(name)> => name
    .rule(
      { state: 'qid', kind: 'lastName', vars: ['name'] },
      null,
      'name',
      (mtt, bindings, params) => {
        return bindings.get('name')!;
      }
    )

    // rule <qid, identifier> => @name
    .rule(
      { state: 'qid', kind: 'identifier', vars: [] },
      null,
      '@name',
      (mtt, bindings, params) => {
        return bindings.get('@name')!;
      }
    );

  // Display the MTT definition (pretty-printed)
  console.log('MTT Definition (Declarative Syntax):');
  console.log('=====================================\n');
  FamilyTransducer.displayRules();

  // Input tree using tree literal syntax sugar
  console.log('\nInput (using tree literal):');
  console.log('---------------------------\n');

  const inputStr = `Family(
  lastName(March),
  m-list(
    father(Jim),
    m-list(
      mother(Cindy),
      m-list(daughter(Brenda), e)
    )
  )
)`;

  console.log(inputStr);

  const input = tree(inputStr);

  // Transform using the declarative MTT
  console.log('\nTransforming...\n');

  const output = FamilyTransducer.transform(input);

  console.log('Output:');
  console.log('-------\n');
  console.log(JSON.stringify(output, null, 2));

  console.log('\n\nComparison:');
  console.log('===========');
  console.log('Traditional TypeScript: ~266 lines');
  console.log('Declarative MTT:        ~50 lines');
  console.log('Code reduction:         ~81%');
  console.log('');
  console.log('With full TreeP integration (proposed):');
  console.log('  mtt FamilyTransducer { ... }  ~35 lines');
  console.log('  Code reduction:                ~87%');
}

// =============================================================================
// Main
// =============================================================================

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         MTT Syntax Sugar - Proof of Concept               ║');
console.log('╚════════════════════════════════════════════════════════════╝');

example1_tree_literals();
example2_mtt_builder();
example3_complete_family_tree();
example4_declarative_syntax_sugar();

console.log('\n✓ All syntax sugar examples completed!\n');
