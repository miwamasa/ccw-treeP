/**
 * Example: Basic usage of TreeP language
 */

import { TreeP } from '../src/index';

// Example 1: Simple TreeP program
const source1 = `
def main() returns: Int {
  println("Hello, TreeP!")
  return 0
}
`;

console.log('=== Example 1: Hello World ===');
const treep1 = new TreeP(source1);
const result1 = treep1.run();
console.log('Result:', result1);

// Example 2: Function with parameters
const source2 = `
def add(x, y) {
  return x + y
}

def main() returns: Int {
  let result = add(10, 20)
  println(result)
  return 0
}
`;

console.log('\n=== Example 2: Function with Parameters ===');
const treep2 = new TreeP(source2);
const result2 = treep2.run();
console.log('Result:', result2);

// Example 3: Using built-in macros
const source3 = `
def main() returns: Int {
  let x = 10

  when(x > 0) {
    println("x is positive")
  }

  debug(x)

  return 0
}
`;

console.log('\n=== Example 3: Using Macros ===');
const treep3 = new TreeP(source3);
const result3 = treep3.run();
console.log('Result:', result3);
