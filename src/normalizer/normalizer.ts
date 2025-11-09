import { CSTNode, Element, Attr } from '../ast/types';

/**
 * Normalizer: Converts CST to EAST (Element-based AST)
 * Also handles block argument transformation: func(args) { block } -> func(args, () -> { block })
 */
export class Normalizer {
  normalize(nodes: CSTNode[]): Element[] {
    return nodes.map(node => this.normalizeNode(node));
  }

  private normalizeNode(node: CSTNode): Element {
    switch (node.type) {
      case 'FunctionDef':
        return this.normalizeFunctionDef(node);
      case 'LetBinding':
        return this.normalizeLetBinding(node);
      case 'IfExpr':
        return this.normalizeIfExpr(node);
      case 'CallExpr':
        return this.normalizeCallExpr(node);
      case 'BinaryOp':
        return this.normalizeBinaryOp(node);
      case 'UnaryOp':
        return this.normalizeUnaryOp(node);
      case 'Variable':
        return this.normalizeVariable(node);
      case 'Literal':
        return this.normalizeLiteral(node);
      case 'Lambda':
        return this.normalizeLambda(node);
      case 'Block':
        return this.normalizeBlock(node);
      case 'ReturnStmt':
        return this.normalizeReturnStmt(node);
      case 'MacroDef':
        return this.normalizeMacroDef(node);
      case 'WhileLoop':
        return this.normalizeWhileLoop(node);
      case 'ForLoop':
        return this.normalizeForLoop(node);
      default:
        throw new Error(`Unknown node type: ${(node as any).type}`);
    }
  }

  private normalizeFunctionDef(node: CSTNode & { type: 'FunctionDef' }): Element {
    const attrs: Attr[] = [];

    // Add parameter types as attributes
    node.params.forEach((param, i) => {
      if (param.paramType) {
        attrs.push({ key: param.name, value: param.paramType });
      }
    });

    if (node.returnType) {
      attrs.push({ key: 'returns', value: node.returnType });
    }

    // Parameters as children
    const paramElements = node.params.map(param => ({
      kind: 'param',
      name: param.name,
      attrs: param.paramType ? [{ key: 'type', value: param.paramType }] : undefined,
      span: param.span
    }));

    return {
      kind: 'def',
      name: node.name,
      attrs: attrs.length > 0 ? attrs : undefined,
      children: [
        ...paramElements,
        this.normalizeNode(node.body)
      ],
      span: node.span
    };
  }

  private normalizeLetBinding(node: CSTNode & { type: 'LetBinding' }): Element {
    const attrs: Attr[] = [];
    if (node.valueType) {
      attrs.push({ key: 'type', value: node.valueType });
    }

    return {
      kind: 'let',
      name: node.name,
      attrs: attrs.length > 0 ? attrs : undefined,
      children: [this.normalizeNode(node.value)],
      span: node.span
    };
  }

  private normalizeIfExpr(node: CSTNode & { type: 'IfExpr' }): Element {
    const children: Element[] = [
      {
        kind: 'condition',
        children: [this.normalizeNode(node.condition)],
      },
      this.normalizeNode(node.thenBranch)
    ];

    if (node.elseBranch) {
      children.push(this.normalizeNode(node.elseBranch));
    }

    return {
      kind: 'if',
      children,
      span: node.span
    };
  }

  private normalizeCallExpr(node: CSTNode & { type: 'CallExpr' }): Element {
    let args = node.args.map(arg => this.normalizeNode(arg));

    // Block argument transformation: func(args) { block } -> func(args, () -> { block })
    if (node.blockArg) {
      const lambda: Element = {
        kind: 'lambda',
        children: [this.normalizeNode(node.blockArg)],
        span: node.blockArg.span
      };
      args.push(lambda);
    }

    return {
      kind: 'call',
      name: node.callee,
      children: args,
      span: node.span
    };
  }

  private normalizeBinaryOp(node: CSTNode & { type: 'BinaryOp' }): Element {
    return {
      kind: 'call',
      name: node.operator,
      children: [
        this.normalizeNode(node.left),
        this.normalizeNode(node.right)
      ],
      span: node.span
    };
  }

  private normalizeUnaryOp(node: CSTNode & { type: 'UnaryOp' }): Element {
    return {
      kind: 'call',
      name: `unary_${node.operator}`,
      children: [this.normalizeNode(node.operand)],
      span: node.span
    };
  }

  private normalizeVariable(node: CSTNode & { type: 'Variable' }): Element {
    return {
      kind: 'var',
      name: node.name,
      span: node.span
    };
  }

  private normalizeLiteral(node: CSTNode & { type: 'Literal' }): Element {
    return {
      kind: 'literal',
      attrs: [
        { key: 'type', value: node.literalType },
        { key: 'value', value: String(node.value) }
      ],
      span: node.span
    };
  }

  private normalizeLambda(node: CSTNode & { type: 'Lambda' }): Element {
    const paramElements = node.params.map(param => ({
      kind: 'param',
      name: param.name,
      attrs: param.paramType ? [{ key: 'type', value: param.paramType }] : undefined,
      span: param.span
    }));

    return {
      kind: 'lambda',
      children: [
        ...paramElements,
        this.normalizeNode(node.body)
      ],
      span: node.span
    };
  }

  private normalizeBlock(node: CSTNode & { type: 'Block' }): Element {
    return {
      kind: 'block',
      children: node.statements.map(stmt => this.normalizeNode(stmt)),
      span: node.span
    };
  }

  private normalizeReturnStmt(node: CSTNode & { type: 'ReturnStmt' }): Element {
    return {
      kind: 'return',
      children: node.value ? [this.normalizeNode(node.value)] : undefined,
      span: node.span
    };
  }

  private normalizeMacroDef(node: CSTNode & { type: 'MacroDef' }): Element {
    return {
      kind: 'macro',
      name: node.name,
      attrs: [
        { key: 'pattern', value: node.pattern }
      ],
      children: [node.expand],
      span: node.span
    };
  }

  private normalizeWhileLoop(node: CSTNode & { type: 'WhileLoop' }): Element {
    return {
      kind: 'while',
      children: [
        {
          kind: 'condition',
          children: [this.normalizeNode(node.condition)]
        },
        this.normalizeNode(node.body)
      ],
      span: node.span
    };
  }

  private normalizeForLoop(node: CSTNode & { type: 'ForLoop' }): Element {
    return {
      kind: 'for',
      attrs: [{ key: 'var', value: node.variable }],
      children: [
        {
          kind: 'from',
          children: [this.normalizeNode(node.from)]
        },
        {
          kind: 'to',
          children: [this.normalizeNode(node.to)]
        },
        this.normalizeNode(node.body)
      ],
      span: node.span
    };
  }
}
