import { Element } from '../ast/types';
import { Type, TypeVar, TypeCon, TypeFun, TypeScheme, TypeEnv } from '../ast/types';

/**
 * Hindley-Milner Type Inference
 */
export class TypeInference {
  private nextVarId: number = 0;
  private substitution: Map<string, Type> = new Map();

  /**
   * Infer types for all elements
   */
  infer(elements: Element[], env: TypeEnv = new Map()): TypeEnv {
    const newEnv = new Map(env);

    // Add built-in types
    this.addBuiltins(newEnv);

    // Infer each element
    for (const elem of elements) {
      this.inferElement(elem, newEnv);
    }

    return newEnv;
  }

  private addBuiltins(env: TypeEnv): void {
    // Primitive operators
    const intType: TypeCon = { kind: 'TypeCon', name: 'Int' };
    const boolType: TypeCon = { kind: 'TypeCon', name: 'Bool' };
    const stringType: TypeCon = { kind: 'TypeCon', name: 'String' };

    // Binary operators: Int -> Int -> Int
    const intBinOp: TypeScheme = {
      typeVars: [],
      type: this.makeFun(intType, this.makeFun(intType, intType))
    };

    for (const op of ['+', '-', '*', '/', '%']) {
      env.set(op, intBinOp);
    }

    // Comparison operators: Int -> Int -> Bool
    const intCmpOp: TypeScheme = {
      typeVars: [],
      type: this.makeFun(intType, this.makeFun(intType, boolType))
    };

    for (const op of ['<', '>', '<=', '>=', '==', '!=']) {
      env.set(op, intCmpOp);
    }

    // Logical operators: Bool -> Bool -> Bool
    const boolBinOp: TypeScheme = {
      typeVars: [],
      type: this.makeFun(boolType, this.makeFun(boolType, boolType))
    };

    for (const op of ['&&', '||']) {
      env.set(op, boolBinOp);
    }

    // Unary operators
    env.set('unary_!', {
      typeVars: [],
      type: this.makeFun(boolType, boolType)
    });

    env.set('unary_-', {
      typeVars: [],
      type: this.makeFun(intType, intType)
    });

    // Built-in functions
    const a = this.freshVar();
    env.set('println', {
      typeVars: [a.name],
      type: this.makeFun(a, { kind: 'TypeCon', name: 'Unit' })
    });

    env.set('toString', {
      typeVars: [a.name],
      type: this.makeFun(a, stringType)
    });

    env.set('error', {
      typeVars: [a.name],
      type: this.makeFun(stringType, a)
    });
  }

  private inferElement(elem: Element, env: TypeEnv): Type {
    switch (elem.kind) {
      case 'def':
        return this.inferFunctionDef(elem, env);
      case 'let':
        return this.inferLet(elem, env);
      case 'if':
        return this.inferIf(elem, env);
      case 'call':
        return this.inferCall(elem, env);
      case 'var':
        return this.inferVar(elem, env);
      case 'literal':
        return this.inferLiteral(elem);
      case 'lambda':
        return this.inferLambda(elem, env);
      case 'block':
        return this.inferBlock(elem, env);
      case 'return':
        return this.inferReturn(elem, env);
      case 'while':
        return this.inferWhile(elem, env);
      case 'for':
        return this.inferFor(elem, env);
      default:
        return this.freshVar();
    }
  }

  private inferFunctionDef(elem: Element, env: TypeEnv): Type {
    const name = elem.name!;
    const children = elem.children || [];

    // Separate parameters from body
    const params = children.filter(c => c.kind === 'param');
    const body = children.find(c => c.kind === 'block');

    if (!body) {
      throw new Error(`Function ${name} has no body`);
    }

    // Create function type
    const paramTypes = params.map(() => this.freshVar());
    const returnType = this.freshVar();

    // Create new environment with parameters
    const newEnv = new Map(env);
    params.forEach((param, i) => {
      newEnv.set(param.name!, {
        typeVars: [],
        type: paramTypes[i]
      });
    });

    // Infer body type
    const bodyType = this.inferElement(body, newEnv);

    // Unify body type with return type
    this.unify(bodyType, returnType);

    // Create function type
    let funType: Type = this.apply(returnType);
    for (let i = paramTypes.length - 1; i >= 0; i--) {
      funType = this.makeFun(this.apply(paramTypes[i]), funType);
    }

    // Generalize and add to environment
    const scheme = this.generalize(env, funType);
    env.set(name, scheme);

    return funType;
  }

  private inferLet(elem: Element, env: TypeEnv): Type {
    const name = elem.name!;
    const value = elem.children?.[0];

    if (!value) {
      throw new Error(`Let binding ${name} has no value`);
    }

    const valueType = this.inferElement(value, env);
    const scheme = this.generalize(env, valueType);
    env.set(name, scheme);

    return valueType;
  }

  private inferIf(elem: Element, env: TypeEnv): Type {
    const children = elem.children || [];
    const condElem = children.find(c => c.kind === 'condition');
    const thenBranch = children.find(c => c.kind === 'block');
    const elseBranch = children.find((c, i) => c.kind === 'block' && i > 0);

    if (!condElem || !thenBranch) {
      throw new Error('Invalid if expression');
    }

    const condType = this.inferElement(condElem.children![0], env);
    this.unify(condType, { kind: 'TypeCon', name: 'Bool' });

    const thenType = this.inferElement(thenBranch, env);

    if (elseBranch) {
      const elseType = this.inferElement(elseBranch, env);
      this.unify(thenType, elseType);
    }

    return thenType;
  }

  private inferCall(elem: Element, env: TypeEnv): Type {
    const name = elem.name!;
    const args = elem.children || [];

    // Get function type
    const funScheme = env.get(name);
    if (!funScheme) {
      throw new Error(`Undefined function: ${name}`);
    }

    let funType = this.instantiate(funScheme);

    // Infer argument types and apply
    for (const arg of args) {
      const argType = this.inferElement(arg, env);

      // Expect funType to be a function type
      const resultType = this.freshVar();
      const expectedFunType = this.makeFun(argType, resultType);

      this.unify(funType, expectedFunType);

      funType = this.apply(resultType);
    }

    return funType;
  }

  private inferVar(elem: Element, env: TypeEnv): Type {
    const name = elem.name!;
    const scheme = env.get(name);

    if (!scheme) {
      throw new Error(`Undefined variable: ${name}`);
    }

    return this.instantiate(scheme);
  }

  private inferLiteral(elem: Element): Type {
    const typeAttr = elem.attrs?.find(a => a.key === 'type');
    if (!typeAttr) {
      throw new Error('Literal has no type attribute');
    }

    return { kind: 'TypeCon', name: typeAttr.value };
  }

  private inferLambda(elem: Element, env: TypeEnv): Type {
    const children = elem.children || [];
    const params = children.filter(c => c.kind === 'param');
    const body = children.find(c => c.kind === 'block');

    if (!body) {
      throw new Error('Lambda has no body');
    }

    const paramTypes = params.map(() => this.freshVar());
    const newEnv = new Map(env);

    params.forEach((param, i) => {
      newEnv.set(param.name!, {
        typeVars: [],
        type: paramTypes[i]
      });
    });

    const bodyType = this.inferElement(body, newEnv);

    let funType: Type = bodyType;
    for (let i = paramTypes.length - 1; i >= 0; i--) {
      funType = this.makeFun(paramTypes[i], funType);
    }

    return funType;
  }

  private inferBlock(elem: Element, env: TypeEnv): Type {
    const stmts = elem.children || [];

    if (stmts.length === 0) {
      return { kind: 'TypeCon', name: 'Unit' };
    }

    let lastType: Type = { kind: 'TypeCon', name: 'Unit' };
    for (const stmt of stmts) {
      lastType = this.inferElement(stmt, env);
    }

    return lastType;
  }

  private inferReturn(elem: Element, env: TypeEnv): Type {
    const value = elem.children?.[0];
    if (value) {
      return this.inferElement(value, env);
    }
    return { kind: 'TypeCon', name: 'Unit' };
  }

  private inferWhile(elem: Element, env: TypeEnv): Type {
    const children = elem.children || [];
    const condElem = children.find(c => c.kind === 'condition');
    const body = children.find(c => c.kind === 'block');

    if (!condElem || !body) {
      throw new Error('Invalid while loop');
    }

    const condType = this.inferElement(condElem.children![0], env);
    this.unify(condType, { kind: 'TypeCon', name: 'Bool' });

    this.inferElement(body, env);

    return { kind: 'TypeCon', name: 'Unit' };
  }

  private inferFor(elem: Element, env: TypeEnv): Type {
    const children = elem.children || [];
    const fromElem = children.find(c => c.kind === 'from');
    const toElem = children.find(c => c.kind === 'to');
    const body = children.find(c => c.kind === 'block');

    if (!fromElem || !toElem || !body) {
      throw new Error('Invalid for loop');
    }

    const fromType = this.inferElement(fromElem.children![0], env);
    const toType = this.inferElement(toElem.children![0], env);

    const intType: TypeCon = { kind: 'TypeCon', name: 'Int' };
    this.unify(fromType, intType);
    this.unify(toType, intType);

    const varAttr = elem.attrs?.find(a => a.key === 'var');
    if (varAttr) {
      const newEnv = new Map(env);
      newEnv.set(varAttr.value, { typeVars: [], type: intType });
      this.inferElement(body, newEnv);
    }

    return { kind: 'TypeCon', name: 'Unit' };
  }

  // Type operations
  private freshVar(): TypeVar {
    return { kind: 'TypeVar', name: `t${this.nextVarId++}` };
  }

  private makeFun(from: Type, to: Type): TypeFun {
    return { kind: 'TypeFun', from, to };
  }

  private unify(t1: Type, t2: Type): void {
    const a1 = this.apply(t1);
    const a2 = this.apply(t2);

    if (a1.kind === 'TypeVar') {
      this.bindVar(a1.name, a2);
    } else if (a2.kind === 'TypeVar') {
      this.bindVar(a2.name, a1);
    } else if (a1.kind === 'TypeCon' && a2.kind === 'TypeCon') {
      if (a1.name !== a2.name) {
        throw new Error(`Type mismatch: ${a1.name} vs ${a2.name}`);
      }
    } else if (a1.kind === 'TypeFun' && a2.kind === 'TypeFun') {
      this.unify(a1.from, a2.from);
      this.unify(a1.to, a2.to);
    } else {
      throw new Error(`Cannot unify ${JSON.stringify(a1)} with ${JSON.stringify(a2)}`);
    }
  }

  private bindVar(name: string, type: Type): void {
    if (type.kind === 'TypeVar' && type.name === name) {
      return;
    }

    if (this.occursIn(name, type)) {
      throw new Error(`Infinite type: ${name} occurs in ${JSON.stringify(type)}`);
    }

    this.substitution.set(name, type);
  }

  private occursIn(name: string, type: Type): boolean {
    const applied = this.apply(type);

    if (applied.kind === 'TypeVar') {
      return applied.name === name;
    } else if (applied.kind === 'TypeFun') {
      return this.occursIn(name, applied.from) || this.occursIn(name, applied.to);
    }

    return false;
  }

  private apply(type: Type): Type {
    if (type.kind === 'TypeVar') {
      const sub = this.substitution.get(type.name);
      return sub ? this.apply(sub) : type;
    } else if (type.kind === 'TypeFun') {
      return {
        kind: 'TypeFun',
        from: this.apply(type.from),
        to: this.apply(type.to)
      };
    }

    return type;
  }

  private generalize(env: TypeEnv, type: Type): TypeScheme {
    const appliedType = this.apply(type);
    const freeVars = this.freeVars(appliedType);
    const envFreeVars = new Set<string>();

    for (const scheme of env.values()) {
      for (const v of this.freeVars(scheme.type)) {
        envFreeVars.add(v);
      }
    }

    const typeVars = Array.from(freeVars).filter(v => !envFreeVars.has(v));

    return { typeVars, type: appliedType };
  }

  private instantiate(scheme: TypeScheme): Type {
    const subst = new Map<string, Type>();

    for (const tv of scheme.typeVars) {
      subst.set(tv, this.freshVar());
    }

    return this.substituteType(scheme.type, subst);
  }

  private substituteType(type: Type, subst: Map<string, Type>): Type {
    if (type.kind === 'TypeVar') {
      return subst.get(type.name) || type;
    } else if (type.kind === 'TypeFun') {
      return {
        kind: 'TypeFun',
        from: this.substituteType(type.from, subst),
        to: this.substituteType(type.to, subst)
      };
    }

    return type;
  }

  private freeVars(type: Type): Set<string> {
    const applied = this.apply(type);

    if (applied.kind === 'TypeVar') {
      return new Set([applied.name]);
    } else if (applied.kind === 'TypeFun') {
      const fromVars = this.freeVars(applied.from);
      const toVars = this.freeVars(applied.to);
      return new Set([...fromVars, ...toVars]);
    }

    return new Set();
  }
}
