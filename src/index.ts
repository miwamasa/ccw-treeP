import { Lexer } from './lexer/lexer';
import { Parser } from './parser/parser';
import { Normalizer } from './normalizer/normalizer';
import { MacroExpander } from './macro/expander';
import { TypeInference } from './type/inference';
import { Interpreter } from './interpreter/interpreter';
import { Transducer, TransducerBuilder } from './transducer/transducer';

/**
 * TreeP Language Processor
 */
export class TreeP {
  private lexer: Lexer;
  private parser: Parser;
  private normalizer: Normalizer;
  private macroExpander: MacroExpander;
  private typeInference: TypeInference;
  private interpreter: Interpreter;

  constructor(source: string) {
    this.lexer = new Lexer(source);
    const tokens = this.lexer.tokenize();
    this.parser = new Parser(tokens);
    this.normalizer = new Normalizer();
    this.macroExpander = new MacroExpander();
    this.typeInference = new TypeInference();
    this.interpreter = new Interpreter();
  }

  /**
   * Execute the program
   */
  run(): any {
    // Parse
    const cst = this.parser.parse();

    // Normalize to EAST
    const east = this.normalizer.normalize(cst);

    // Expand macros
    const expanded = this.macroExpander.expand(east);

    // Type inference
    this.typeInference.infer(expanded);

    // Execute
    const result = this.interpreter.execute(expanded);

    return result;
  }

  /**
   * Get the EAST representation
   */
  getEAST(): any {
    const cst = this.parser.parse();
    const east = this.normalizer.normalize(cst);
    const expanded = this.macroExpander.expand(east);
    return expanded;
  }
}

// Export all components
export { Lexer } from './lexer/lexer';
export { Parser } from './parser/parser';
export { Normalizer } from './normalizer/normalizer';
export { MacroExpander } from './macro/expander';
export { TypeInference } from './type/inference';
export { Interpreter } from './interpreter/interpreter';
export { Transducer, TransducerBuilder } from './transducer/transducer';
export * from './transducer/types';
export * from './ast/types';
