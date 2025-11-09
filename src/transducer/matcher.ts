import { Element } from '../ast/types';
import { Pattern, AttrPattern, Bindings } from './types';

/**
 * Pattern matcher for tree transformation
 */
export class PatternMatcher {
  /**
   * Match a pattern against an element
   */
  match(pattern: Pattern, element: Element): Bindings | null {
    const bindings: Bindings = new Map();

    if (this.matchPattern(pattern, element, bindings)) {
      return bindings;
    }

    return null;
  }

  private matchPattern(pattern: Pattern, element: Element, bindings: Bindings): boolean {
    switch (pattern.type) {
      case 'KindPattern':
        return this.matchKindPattern(pattern, element, bindings);
      case 'VarPattern':
        return this.matchVarPattern(pattern, element, bindings);
      case 'AnyPattern':
        return true;
      case 'ListPattern':
        // ListPattern is for matching multiple children, not applicable here
        return false;
      default:
        return false;
    }
  }

  private matchKindPattern(
    pattern: { type: 'KindPattern'; kind: string; nameVar?: string; attrPatterns?: AttrPattern[]; childPatterns?: Pattern[] },
    element: Element,
    bindings: Bindings
  ): boolean {
    // Match kind
    if (element.kind !== pattern.kind) {
      return false;
    }

    // Bind name if nameVar is specified
    if (pattern.nameVar) {
      if (element.name) {
        bindings.set(pattern.nameVar, element.name);
      } else {
        return false;
      }
    }

    // Match attributes
    if (pattern.attrPatterns) {
      for (const attrPattern of pattern.attrPatterns) {
        if (!this.matchAttrPattern(attrPattern, element, bindings)) {
          return false;
        }
      }
    }

    // Match children
    if (pattern.childPatterns) {
      const children = element.children || [];

      if (children.length !== pattern.childPatterns.length) {
        return false;
      }

      for (let i = 0; i < pattern.childPatterns.length; i++) {
        if (!this.matchPattern(pattern.childPatterns[i], children[i], bindings)) {
          return false;
        }
      }
    }

    return true;
  }

  private matchAttrPattern(attrPattern: AttrPattern, element: Element, bindings: Bindings): boolean {
    const attr = element.attrs?.find(a => a.key === attrPattern.key);

    if (!attr) {
      return false;
    }

    if (attrPattern.literal) {
      return attr.value === attrPattern.literal;
    }

    if (attrPattern.valueVar) {
      bindings.set(attrPattern.valueVar, attr.value);
    }

    return true;
  }

  private matchVarPattern(
    pattern: { type: 'VarPattern'; varName: string },
    element: Element,
    bindings: Bindings
  ): boolean {
    bindings.set(pattern.varName, element);
    return true;
  }

  /**
   * Match a list of patterns against a list of elements
   */
  matchList(patterns: Pattern[], elements: Element[], bindings: Bindings): boolean {
    if (patterns.length === 0 && elements.length === 0) {
      return true;
    }

    if (patterns.length === 0 || elements.length === 0) {
      return false;
    }

    // Check for rest pattern (ListPattern with restVar)
    const lastPattern = patterns[patterns.length - 1];
    if (lastPattern.type === 'ListPattern' && lastPattern.restVar) {
      // Match fixed patterns first
      for (let i = 0; i < patterns.length - 1; i++) {
        if (i >= elements.length) return false;
        if (!this.matchPattern(patterns[i], elements[i], bindings)) {
          return false;
        }
      }

      // Bind rest to remaining elements
      const rest = elements.slice(patterns.length - 1);
      bindings.set(lastPattern.restVar, rest);
      return true;
    }

    // Exact match
    if (patterns.length !== elements.length) {
      return false;
    }

    for (let i = 0; i < patterns.length; i++) {
      if (!this.matchPattern(patterns[i], elements[i], bindings)) {
        return false;
      }
    }

    return true;
  }
}
