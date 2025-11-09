import { Element } from '../ast/types';
import { TransformRule, TransducerSpec } from './types';
import { PatternMatcher } from './matcher';
import { TemplateGenerator } from './generator';

/**
 * Tree Transducer: Transforms trees using declarative rules
 */
export class Transducer {
  private matcher: PatternMatcher;
  private generator: TemplateGenerator;
  private rules: TransformRule[];

  constructor(spec: TransducerSpec) {
    this.matcher = new PatternMatcher();
    this.generator = new TemplateGenerator();
    this.rules = spec.rules;
  }

  /**
   * Transform a tree using the transducer rules
   */
  transform(element: Element): Element {
    // Try each rule in order
    for (const rule of this.rules) {
      const bindings = this.matcher.match(rule.pattern, element);

      if (bindings) {
        // Check condition if present
        if (rule.condition && !rule.condition(bindings)) {
          continue;
        }

        // Apply transformation
        const result = this.generator.generate(rule.template, bindings);

        if (Array.isArray(result)) {
          throw new Error('Rule template must produce a single element, not a list');
        }

        // Recursively transform children
        if (result.children) {
          result.children = result.children.map(child => this.transform(child));
        }

        return result;
      }
    }

    // No rule matched, recursively transform children
    if (element.children) {
      return {
        ...element,
        children: element.children.map(child => this.transform(child))
      };
    }

    return element;
  }

  /**
   * Transform a list of elements
   */
  transformAll(elements: Element[]): Element[] {
    return elements.map(elem => this.transform(elem));
  }
}

/**
 * Builder for creating transducers
 */
export class TransducerBuilder {
  private rules: TransformRule[] = [];

  /**
   * Add a transformation rule
   */
  addRule(rule: TransformRule): this {
    this.rules.push(rule);
    return this;
  }

  /**
   * Build the transducer
   */
  build(name: string): Transducer {
    return new Transducer({
      name,
      rules: this.rules
    });
  }
}
