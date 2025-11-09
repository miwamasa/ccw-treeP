# TreeP: Tree Processor Language

TreeP is a functional programming language with Hindley-Milner type inference and a powerful macro system based on Element AST (EAST). It also includes a declarative tree transformation system (transducer) for converting one tree structure to another.

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

### 7. Transducer
Transforms tree structures using declarative rules

## Usage

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

### Tree Transformation with Transducer

```typescript
import { TransducerBuilder } from './transducer/transducer';

const transducer = new TransducerBuilder()
  .addRule({
    name: 'rename_def_to_function',
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
  .build('transformer');

const outputTree = transducer.transform(inputTree);
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

# Build
npm run build

# Run tests
npm test

# Run examples
npm run dev
```

## Examples

See the `examples/` directory for sample programs:
- `basic.treep` - Basic functions and type inference
- `macros.treep` - Using built-in macros
- `transducer_example.ts` - Tree transformation with transducer

## License

MIT
