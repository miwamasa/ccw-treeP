# TreeP: Tree Processor Language

TreeP is a functional programming language with Hindley-Milner type inference and a powerful macro system based on Element AST (EAST). It also includes a declarative tree transformation system (transducer) for converting one tree structure to another.

## Documentation

- **[Macro Tree Transducer Guide](docs/MACRO_TREE_TRANSDUCER.md)** - Comprehensive guide to the integrated macro and transducer system
- **[Transducer Tutorial](docs/TRANSDUCER_TUTORIAL.md)** - Step-by-step tutorial with practical examples
- **[Architecture Design](docs/ARCHITECTURE.md)** - System architecture and design patterns

## Features

- **Hindley-Milner Type Inference**: Automatic type inference without explicit type annotations
- **Element-based AST (EAST)**: Unified tree structure inspired by XML elements
- **Macro System**: Built-in and user-defined macros with pattern matching
- **Tree Transducer**: Declarative rules for transforming tree structures
- **Functional Programming**: First-class functions, lambdas, and closures

## Architecture

```
Source Code → Lexer → Parser → CST
                                 ↓
                            Normalizer → EAST
                                         ↓
                                    Macro Expansion → EAST
                                                      ↓
                                                Type Inference
                                                      ↓
                                                 Interpreter → Result
```

## Components

### 1. Lexer
Tokenizes source code into tokens (keywords, identifiers, operators, etc.)

### 2. Parser
Parses tokens into Concrete Syntax Tree (CST)

### 3. Normalizer
Converts CST to EAST (Element-based AST), a unified tree representation

### 4. Macro Expander
Expands macros using pattern matching and template instantiation

Built-in macros:
- `when(cond) { body }` - if without else
- `assert(cond)` - assertion
- `debug(expr)` - debug output
- `log(msg)` - logging
- `trace(expr)` - trace expression evaluation
- `inc(x)` / `dec(x)` - increment/decrement
- `ifZero(x) { body }` - execute if zero
- `ifPositive(x) { body }` - execute if positive
- `until(cond) { body }` - loop until condition is true

### 5. Type Inference
Implements Hindley-Milner type inference algorithm

### 6. Interpreter
Executes the EAST representation

### 7. Transducer (Macro Tree Transducer)
Transforms tree structures using declarative rules with macro-like pattern matching

Features:
- Declarative pattern matching with conditions
- Template-based code generation
- Multi-pass transformation pipelines
- AST optimization and rewriting
- Fixpoint iteration for recursive transformations

## Usage

### Using TreeP from TypeScript

```typescript
import { TreeP } from './src/index';

const source = `
def main() returns: Int {
  println("Hello, TreeP!")
  return 0
}
`;

const treep = new TreeP(source);
const result = treep.run();
console.log('Result:', result);
```

### Basic TreeP Program

```treep
def add(x, y) {
  return x + y
}

def main() returns: Int {
  let result = add(10, 20)
  println(result)
  return 0
}
```

### Using Macros

```treep
def main() returns: Int {
  let x = 10

  when(x > 0) {
    println("x is positive")
  }

  debug(x)

  return 0
}
```

### Tree Transformation with Macro Tree Transducer

```typescript
import { TransducerBuilder, TransformRuleBuilder } from './src/index';

// Example 1: Basic transformation
const transducer = new TransducerBuilder()
  .addRule({
    name: 'rename_def_to_function',
    pattern: {
      type: 'KindPattern',
      kind: 'def',
      nameVar: 'fname',
      childPatterns: [
        { type: 'ListPattern', restVar: 'children' }
      ]
    },
    template: {
      type: 'NodeTemplate',
      kind: 'function',
      name: { type: 'Var', varName: 'fname' },
      children: [
        { type: 'ListTemplate', listVar: 'children' }
      ]
    }
  })
  .build('transformer');

const outputTree = transducer.transform(inputTree);

// Example 2: Using DSL for cleaner syntax
import { TransformRuleBuilder, isLiteral } from './src/index';

const optimizer = new TransducerBuilder()
  // x + 0 => x
  .addRule(
    new TransformRuleBuilder()
      .setName('add_zero')
      .matchBinaryOp('+')
      .when(bindings => isLiteral(bindings.get('right') as Element, '0'))
      .generateVar('left')
      .build()
  )
  // x * 1 => x
  .addRule(
    new TransformRuleBuilder()
      .setName('mul_one')
      .matchBinaryOp('*')
      .when(bindings => isLiteral(bindings.get('right') as Element, '1'))
      .generateVar('left')
      .build()
  )
  .build('optimizer');

// Example 3: Fixpoint iteration for nested optimizations
class FixpointTransducer {
  constructor(private transducer: any, private maxIterations: number = 10) {}

  transform(tree: Element): Element {
    let current = tree;
    for (let i = 0; i < this.maxIterations; i++) {
      const next = this.transducer.transform(current);
      if (JSON.stringify(next) === JSON.stringify(current)) {
        return current; // Reached fixpoint
      }
      current = next;
    }
    return current;
  }
}

const fixpointOptimizer = new FixpointTransducer(optimizer);
// ((x + 0) * 1) + 0 => x (after 2 iterations)
const result = fixpointOptimizer.transform(complexTree);
```

## EAST Format

EAST (Element AST) is a unified tree representation where every node is an Element:

```typescript
interface Element {
  kind: string;                    // "def", "let", "call", etc.
  name?: string;                   // identifier name
  attrs?: Attr[];                  // attributes (type info, etc.)
  children?: Element[];            // child elements
  span?: SourceSpan;              // source location
}
```

Example:
```javascript
// TreeP code:
def add(a, b) { return a + b }

// EAST representation:
{
  kind: "def",
  name: "add",
  children: [
    { kind: "param", name: "a" },
    { kind: "param", name: "b" },
    {
      kind: "block",
      children: [
        {
          kind: "return",
          children: [
            {
              kind: "call",
              name: "+",
              children: [
                { kind: "var", name: "a" },
                { kind: "var", name: "b" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Building and Running

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run examples
npm run dev
```

## Running TypeScript Examples

To compile and run the TypeScript examples:

```bash
# Navigate to examples directory
cd examples

# Compile the examples
npx tsc

# Run basic usage example
node dist/examples/basic_usage.js

# Run transducer example
node dist/examples/transducer_example.js
```

**Note**: The examples directory has its own `tsconfig.json` that extends the main project configuration. This ensures proper TypeScript compilation with ES2020 target support.

## Examples

See the `examples/` directory for sample programs:
- `basic.treep` - Basic TreeP programs with functions and type inference
- `macros.treep` - Using built-in macros (when, debug, etc.)
- `basic_usage.ts` - Using TreeP from TypeScript (Hello World, functions, macros)
- `transducer_example.ts` - Basic tree transformation (def → function, param → argument)
- `macro_tree_transducer.ts` - Advanced transformations (AST optimization, rewriting, pipelines)
- `advanced_transducer.ts` - DSL-based rules, fixpoint iteration, constant folding

## License

MIT
