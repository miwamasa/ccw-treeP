/**
 * Macro Tree Transducer (MTT) Examples
 *
 * This file demonstrates classic MTT transformations with parameter-passing,
 * following the formal MTT theory from TUM reference.
 *
 * See docs/MTT_THEORY.md for detailed theory and explanations.
 */

import { Element } from '../src/ast/types';

/**
 * Simple MTT Implementation
 *
 * A Macro Tree Transducer with parameter-passing capabilities.
 * Each rule is defined by a state (kind) and a handler function that
 * takes the element and parameters, returning a transformed element.
 */
class SimpleMTT {
  private rules: Map<string, (elem: Element, params: any[]) => Element>;

  constructor() {
    this.rules = new Map();
  }

  /**
   * Add a transformation rule for a specific element kind
   * @param kind The element kind to match
   * @param handler Function that takes (element, ...params) and returns transformed element
   */
  addRule(kind: string, handler: (elem: Element, params: any[]) => Element): this {
    this.rules.set(kind, handler);
    return this;
  }

  /**
   * Transform an element using the defined rules
   * @param elem The element to transform
   * @param params Additional parameters for the transformation
   */
  transform(elem: Element, ...params: any[]): Element {
    const handler = this.rules.get(elem.kind);
    if (!handler) {
      throw new Error(`No rule defined for kind: ${elem.kind}`);
    }
    return handler(elem, params);
  }
}

// =============================================================================
// Example 1: Copy Transducer (No Parameters)
// =============================================================================

/**
 * Simple copy transducer - identity transformation
 *
 * Rules:
 *   q(a(x₁,x₂)) → a(q(x₁), q(x₂))
 *   q(b(x₁,x₂)) → b(q(x₁), q(x₂))
 *   q(e())      → e()
 */
function example1_copy() {
  console.log('\n=== Example 1: Copy Transducer (No Parameters) ===\n');

  const copyMTT = new SimpleMTT();

  // Rule: q(a(x₁,x₂)) → a(q(x₁), q(x₂))
  copyMTT.addRule('a', (elem, params) => {
    const children = elem.children || [];
    return {
      kind: 'a',
      children: children.map(child => copyMTT.transform(child, ...params))
    };
  });

  // Rule: q(b(x₁,x₂)) → b(q(x₁), q(x₂))
  copyMTT.addRule('b', (elem, params) => {
    const children = elem.children || [];
    return {
      kind: 'b',
      children: children.map(child => copyMTT.transform(child, ...params))
    };
  });

  // Rule: q(e()) → e()
  copyMTT.addRule('e', (elem, params) => {
    return { kind: 'e' };
  });

  // Input tree: a(b(e(), e()), e())
  const input: Element = {
    kind: 'a',
    children: [
      {
        kind: 'b',
        children: [
          { kind: 'e' },
          { kind: 'e' }
        ]
      },
      { kind: 'e' }
    ]
  };

  console.log('Input tree:');
  console.log(JSON.stringify(input, null, 2));

  const output = copyMTT.transform(input);

  console.log('\nOutput tree (should be identical):');
  console.log(JSON.stringify(output, null, 2));

  console.log('\nTrees are equal:', JSON.stringify(input) === JSON.stringify(output));
}

// =============================================================================
// Example 2: Flatten Leaves with Accumulator Parameter
// =============================================================================

/**
 * Flatten tree leaves into a right-associated cons list
 *
 * Rules:
 *   q(a(x₁,x₂), y) → q(x₁, q(x₂, y))
 *   q(b(x₁,x₂), y) → q(x₁, q(x₂, y))
 *   q(e(), y)      → cons(e(), y)
 *
 * The second parameter y is an accumulator that builds the list from right to left.
 */
function example2_flatten() {
  console.log('\n=== Example 2: Flatten Leaves with Accumulator ===\n');

  const flattenMTT = new SimpleMTT();

  // Rule: q(a(x₁,x₂), y) → q(x₁, q(x₂, y))
  flattenMTT.addRule('a', (elem, params) => {
    const children = elem.children || [];
    const [accumulator] = params;

    if (children.length !== 2) {
      throw new Error('a must have exactly 2 children');
    }

    // Process right child first with accumulator: q(x₂, y)
    const right = flattenMTT.transform(children[1], accumulator);
    // Then process left child with result: q(x₁, q(x₂, y))
    return flattenMTT.transform(children[0], right);
  });

  // Rule: q(b(x₁,x₂), y) → q(x₁, q(x₂, y))
  flattenMTT.addRule('b', (elem, params) => {
    const children = elem.children || [];
    const [accumulator] = params;

    if (children.length !== 2) {
      throw new Error('b must have exactly 2 children');
    }

    // Same as 'a' - process right first, then left
    const right = flattenMTT.transform(children[1], accumulator);
    return flattenMTT.transform(children[0], right);
  });

  // Rule: q(e(), y) → cons(e(), y)
  flattenMTT.addRule('e', (elem, params) => {
    const [accumulator] = params;
    return {
      kind: 'cons',
      children: [
        { kind: 'e' },
        accumulator
      ]
    };
  });

  // Input tree: a(b(e(), e()), e())
  const input: Element = {
    kind: 'a',
    children: [
      {
        kind: 'b',
        children: [
          { kind: 'e' },
          { kind: 'e' }
        ]
      },
      { kind: 'e' }
    ]
  };

  // Initial accumulator: nil (empty list)
  const nil: Element = { kind: 'nil' };

  console.log('Input tree:');
  console.log(JSON.stringify(input, null, 2));

  console.log('\nInitial accumulator:');
  console.log(JSON.stringify(nil, null, 2));

  console.log('\nStep-by-step execution:');
  console.log('q(a(b(e(), e()), e()), nil)');
  console.log('  → q(b(e(), e()), q(e(), nil))');
  console.log('  → q(b(e(), e()), cons(e(), nil))');
  console.log('  → q(e(), q(e(), cons(e(), nil)))');
  console.log('  → q(e(), cons(e(), cons(e(), nil)))');
  console.log('  → cons(e(), cons(e(), cons(e(), nil)))');

  const output = flattenMTT.transform(input, nil);

  console.log('\nOutput (right-associated cons list):');
  console.log(JSON.stringify(output, null, 2));

  // Verify the structure
  const expected = {
    kind: 'cons',
    children: [
      { kind: 'e' },
      {
        kind: 'cons',
        children: [
          { kind: 'e' },
          {
            kind: 'cons',
            children: [
              { kind: 'e' },
              { kind: 'nil' }
            ]
          }
        ]
      }
    ]
  };

  console.log('\nOutput matches expected:', JSON.stringify(output) === JSON.stringify(expected));
}

// =============================================================================
// Example 3: Depth Calculator with Accumulator
// =============================================================================

/**
 * Calculate depth of each node, passing depth as parameter
 *
 * Rules:
 *   q(a(x₁,x₂), d) → a_d(q(x₁, d+1), q(x₂, d+1))
 *   q(b(x₁,x₂), d) → b_d(q(x₁, d+1), q(x₂, d+1))
 *   q(e(), d)      → e_d()
 *
 * Each node is annotated with its depth.
 */
function example3_depth() {
  console.log('\n=== Example 3: Depth Calculator with Accumulator ===\n');

  const depthMTT = new SimpleMTT();

  // Rule: q(a(x₁,x₂), d) → a_d(q(x₁, d+1), q(x₂, d+1))
  depthMTT.addRule('a', (elem, params) => {
    const children = elem.children || [];
    const [depth] = params;

    return {
      kind: 'a',
      name: `depth_${depth}`,
      children: children.map(child => depthMTT.transform(child, depth + 1))
    };
  });

  // Rule: q(b(x₁,x₂), d) → b_d(q(x₁, d+1), q(x₂, d+1))
  depthMTT.addRule('b', (elem, params) => {
    const children = elem.children || [];
    const [depth] = params;

    return {
      kind: 'b',
      name: `depth_${depth}`,
      children: children.map(child => depthMTT.transform(child, depth + 1))
    };
  });

  // Rule: q(e(), d) → e_d()
  depthMTT.addRule('e', (elem, params) => {
    const [depth] = params;
    return {
      kind: 'e',
      name: `depth_${depth}`
    };
  });

  // Input tree: a(b(e(), e()), e())
  const input: Element = {
    kind: 'a',
    children: [
      {
        kind: 'b',
        children: [
          { kind: 'e' },
          { kind: 'e' }
        ]
      },
      { kind: 'e' }
    ]
  };

  console.log('Input tree:');
  console.log(JSON.stringify(input, null, 2));

  // Start at depth 0
  const output = depthMTT.transform(input, 0);

  console.log('\nOutput (annotated with depths):');
  console.log(JSON.stringify(output, null, 2));

  console.log('\nNote: Each node is labeled with its depth in the tree.');
}

// =============================================================================
// Example 4: Path Accumulator - Build path from root
// =============================================================================

/**
 * Annotate each node with the path from root
 *
 * Rules:
 *   q(a(x₁,x₂), path) → a[path](q(x₁, path·L), q(x₂, path·R))
 *   q(b(x₁,x₂), path) → b[path](q(x₁, path·L), q(x₂, path·R))
 *   q(e(), path)      → e[path]()
 *
 * where path·L means append "L" to path, path·R means append "R" to path
 */
function example4_path() {
  console.log('\n=== Example 4: Path Accumulator ===\n');

  const pathMTT = new SimpleMTT();

  // Rule: q(a(x₁,x₂), path) → a[path](q(x₁, path·L), q(x₂, path·R))
  pathMTT.addRule('a', (elem, params) => {
    const children = elem.children || [];
    const [path] = params as [string];

    return {
      kind: 'a',
      name: path || 'root',
      children: children.map((child, i) =>
        pathMTT.transform(child, path + (i === 0 ? 'L' : 'R'))
      )
    };
  });

  // Rule: q(b(x₁,x₂), path) → b[path](q(x₁, path·L), q(x₂, path·R))
  pathMTT.addRule('b', (elem, params) => {
    const children = elem.children || [];
    const [path] = params as [string];

    return {
      kind: 'b',
      name: path || 'root',
      children: children.map((child, i) =>
        pathMTT.transform(child, path + (i === 0 ? 'L' : 'R'))
      )
    };
  });

  // Rule: q(e(), path) → e[path]()
  pathMTT.addRule('e', (elem, params) => {
    const [path] = params as [string];
    return {
      kind: 'e',
      name: path || 'root'
    };
  });

  // Input tree: a(b(e(), e()), e())
  const input: Element = {
    kind: 'a',
    children: [
      {
        kind: 'b',
        children: [
          { kind: 'e' },
          { kind: 'e' }
        ]
      },
      { kind: 'e' }
    ]
  };

  console.log('Input tree:');
  console.log(JSON.stringify(input, null, 2));

  // Start with empty path
  const output = pathMTT.transform(input, '');

  console.log('\nOutput (annotated with paths):');
  console.log(JSON.stringify(output, null, 2));

  console.log('\nNote: Each node is labeled with its path from root (L=left, R=right).');
  console.log('For example, "LL" means "left child of left child".');
}

// =============================================================================
// Example 5: Using MTT with TreeP EAST
// =============================================================================

/**
 * Transform TreeP function definitions using MTT with parameters
 *
 * This demonstrates how MTT can be used with real TreeP EAST structures
 * to perform context-aware transformations.
 */
function example5_treep_integration() {
  console.log('\n=== Example 5: TreeP Integration with MTT ===\n');

  const treepMTT = new SimpleMTT();

  // Rule: Transform 'def' to 'function' while counting nesting depth
  treepMTT.addRule('def', (elem, params) => {
    const [depth] = params as [number];
    const children = elem.children || [];

    return {
      kind: 'function',
      name: elem.name,
      attrs: [
        ...(elem.attrs || []),
        { key: 'nesting_depth', value: depth.toString() }
      ],
      children: children.map(child => treepMTT.transform(child, depth + 1))
    };
  });

  // Rule: Transform 'block' passing depth through
  treepMTT.addRule('block', (elem, params) => {
    const [depth] = params as [number];
    const children = elem.children || [];

    return {
      kind: 'block',
      attrs: [
        { key: 'depth', value: depth.toString() }
      ],
      children: children.map(child => treepMTT.transform(child, depth))
    };
  });

  // Rule: Transform 'param' as leaf node
  treepMTT.addRule('param', (elem, params) => {
    const [depth] = params as [number];
    return {
      kind: 'param',
      name: elem.name,
      attrs: [
        { key: 'depth', value: depth.toString() }
      ]
    };
  });

  // Rule: Transform 'return' passing depth
  treepMTT.addRule('return', (elem, params) => {
    const [depth] = params as [number];
    const children = elem.children || [];

    return {
      kind: 'return',
      attrs: [
        { key: 'depth', value: depth.toString() }
      ],
      children: children.map(child => treepMTT.transform(child, depth))
    };
  });

  // Rule: Transform 'call' as leaf (simplified)
  treepMTT.addRule('call', (elem, params) => {
    const [depth] = params as [number];
    return {
      kind: 'call',
      name: elem.name,
      attrs: [
        { key: 'depth', value: depth.toString() }
      ],
      children: elem.children
    };
  });

  // Input: TreeP function definition
  const input: Element = {
    kind: 'def',
    name: 'add',
    children: [
      { kind: 'param', name: 'x' },
      { kind: 'param', name: 'y' },
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

  console.log('Input (TreeP EAST):');
  console.log(JSON.stringify(input, null, 2));

  // Transform starting at depth 0
  const output = treepMTT.transform(input, 0);

  console.log('\nOutput (transformed with depth annotations):');
  console.log(JSON.stringify(output, null, 2));

  console.log('\nNote: Each node is annotated with its nesting depth,');
  console.log('and "def" has been transformed to "function".');
}

// =============================================================================
// Main: Run all examples
// =============================================================================

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Macro Tree Transducer (MTT) Examples with Parameters     ║');
console.log('║  Based on formal MTT theory from TUM reference             ║');
console.log('╚════════════════════════════════════════════════════════════╝');

example1_copy();
example2_flatten();
example3_depth();
example4_path();
example5_treep_integration();

console.log('\n✓ All MTT examples completed successfully!\n');
