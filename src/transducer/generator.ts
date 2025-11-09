import { Element, Attr } from '../ast/types';
import { Template, AttrTemplate, TemplateExpr, Bindings } from './types';

/**
 * Template generator for tree transformation
 */
export class TemplateGenerator {
  /**
   * Generate an element from a template using bindings
   */
  generate(template: Template, bindings: Bindings): Element | Element[] {
    switch (template.type) {
      case 'NodeTemplate':
        return this.generateNode(template, bindings);
      case 'VarTemplate':
        return this.generateVar(template, bindings);
      case 'LiteralTemplate':
        return this.generateLiteral(template);
      case 'ListTemplate':
        return this.generateList(template, bindings);
      default:
        throw new Error(`Unknown template type: ${(template as any).type}`);
    }
  }

  private generateNode(
    template: { type: 'NodeTemplate'; kind: string; name?: TemplateExpr; attrs?: AttrTemplate[]; children?: Template[] },
    bindings: Bindings
  ): Element {
    const element: Element = {
      kind: template.kind
    };

    // Generate name
    if (template.name) {
      element.name = this.evalExpr(template.name, bindings);
    }

    // Generate attributes
    if (template.attrs && template.attrs.length > 0) {
      element.attrs = template.attrs.map(attrTemplate => ({
        key: attrTemplate.key,
        value: this.evalExpr(attrTemplate.value, bindings)
      }));
    }

    // Generate children
    if (template.children && template.children.length > 0) {
      element.children = [];

      for (const childTemplate of template.children) {
        const result = this.generate(childTemplate, bindings);

        if (Array.isArray(result)) {
          element.children.push(...result);
        } else {
          element.children.push(result);
        }
      }
    }

    return element;
  }

  private generateVar(template: { type: 'VarTemplate'; varName: string }, bindings: Bindings): Element | Element[] {
    const value = bindings.get(template.varName);

    if (value === undefined) {
      throw new Error(`Unbound variable: ${template.varName}`);
    }

    if (typeof value === 'string') {
      // If the bound value is a string, create a literal element
      return {
        kind: 'literal',
        attrs: [
          { key: 'type', value: 'String' },
          { key: 'value', value }
        ]
      };
    }

    if (Array.isArray(value)) {
      return value;
    }

    return value as Element;
  }

  private generateLiteral(template: { type: 'LiteralTemplate'; value: string }): Element {
    return {
      kind: 'literal',
      attrs: [
        { key: 'type', value: 'String' },
        { key: 'value', value: template.value }
      ]
    };
  }

  private generateList(template: { type: 'ListTemplate'; templates: Template[] }, bindings: Bindings): Element[] {
    const result: Element[] = [];

    for (const t of template.templates) {
      const generated = this.generate(t, bindings);

      if (Array.isArray(generated)) {
        result.push(...generated);
      } else {
        result.push(generated);
      }
    }

    return result;
  }

  private evalExpr(expr: TemplateExpr, bindings: Bindings): string {
    switch (expr.type) {
      case 'Var': {
        const value = bindings.get(expr.varName);
        if (value === undefined) {
          throw new Error(`Unbound variable: ${expr.varName}`);
        }
        return String(value);
      }
      case 'Literal':
        return expr.value;
      case 'Concat': {
        return expr.parts.map(part => this.evalExpr(part, bindings)).join('');
      }
      default:
        throw new Error(`Unknown expression type: ${(expr as any).type}`);
    }
  }
}
