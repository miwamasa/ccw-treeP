import { Element } from '../ast/types';
import { builtinMacros } from './builtins';

interface MacroDefinition {
  name: string;
  pattern: string;
  expand: (args: Map<string, Element>) => Element;
}

/**
 * Macro Expander: Expands macros in EAST
 */
export class MacroExpander {
  private macros: Map<string, MacroDefinition> = new Map();

  constructor() {
    // Load built-in macros
    for (const macro of builtinMacros) {
      this.macros.set(macro.name, macro);
    }
  }

  /**
   * Register a user-defined macro
   */
  registerMacro(name: string, pattern: string, expandFn: (args: Map<string, Element>) => Element): void {
    this.macros.set(name, {
      name,
      pattern,
      expand: expandFn
    });
  }

  /**
   * Expand all macros in the EAST
   */
  expand(elements: Element[]): Element[] {
    return elements.map(elem => this.expandElement(elem));
  }

  private expandElement(elem: Element): Element {
    // Check if this is a macro call
    if (elem.kind === 'call' && elem.name && this.macros.has(elem.name)) {
      return this.expandMacroCall(elem);
    }

    // Recursively expand children
    if (elem.children) {
      elem.children = elem.children.map(child => this.expandElement(child));
    }

    return elem;
  }

  private expandMacroCall(elem: Element): Element {
    const macro = this.macros.get(elem.name!)!;

    // Parse pattern and match arguments
    const args = this.matchPattern(macro.pattern, elem.children || []);

    // Expand the macro
    const expanded = macro.expand(args);

    // Recursively expand the result
    return this.expandElement(expanded);
  }

  private matchPattern(pattern: string, args: Element[]): Map<string, Element> {
    const result = new Map<string, Element>();

    // Simple pattern matching: extract $var names
    const varPattern = /\$(\w+)/g;
    const varNames: string[] = [];
    let match;

    while ((match = varPattern.exec(pattern)) !== null) {
      varNames.push(match[1]);
    }

    // Map arguments to variable names
    varNames.forEach((varName, i) => {
      if (i < args.length) {
        result.set(varName, args[i]);
      }
    });

    return result;
  }
}
