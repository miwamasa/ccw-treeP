import { Element } from '../ast/types';

/**
 * Runtime value
 */
export type Value =
  | { kind: 'Int'; value: number }
  | { kind: 'String'; value: string }
  | { kind: 'Bool'; value: boolean }
  | { kind: 'Unit' }
  | { kind: 'Function'; params: string[]; body: Element; env: Environment }
  | { kind: 'Builtin'; fn: (args: Value[]) => Value };

/**
 * Runtime environment
 */
export type Environment = Map<string, Value>;

/**
 * Interpreter for TreeP EAST
 */
export class Interpreter {
  private globalEnv: Environment = new Map();
  private returnValue: Value | null = null;

  constructor() {
    this.initBuiltins();
  }

  private initBuiltins(): void {
    // println
    this.globalEnv.set('println', {
      kind: 'Builtin',
      fn: (args: Value[]) => {
        const str = this.valueToString(args[0]);
        console.log(str);
        return { kind: 'Unit' };
      }
    });

    // toString
    this.globalEnv.set('toString', {
      kind: 'Builtin',
      fn: (args: Value[]) => {
        return {
          kind: 'String',
          value: this.valueToString(args[0])
        };
      }
    });

    // error
    this.globalEnv.set('error', {
      kind: 'Builtin',
      fn: (args: Value[]) => {
        const msg = args[0].kind === 'String' ? args[0].value : 'Error';
        throw new Error(msg);
      }
    });

    // Binary operators
    // Special handling for + to support both Int and String
    this.globalEnv.set('+', {
      kind: 'Builtin',
      fn: (args: Value[]) => {
        if (args.length !== 2) throw new Error('+ expects 2 arguments');
        const a = args[0];
        const b = args[1];

        // String concatenation
        if (a.kind === 'String' || b.kind === 'String') {
          const aStr = a.kind === 'String' ? a.value : this.valueToString(a);
          const bStr = b.kind === 'String' ? b.value : this.valueToString(b);
          return { kind: 'String', value: aStr + bStr };
        }

        // Integer addition
        if (a.kind === 'Int' && b.kind === 'Int') {
          return { kind: 'Int', value: a.value + b.value };
        }

        throw new Error('+ expects Int or String arguments');
      }
    });

    this.addBinaryOp('-', (a, b) => ({ kind: 'Int', value: a.value - b.value }));
    this.addBinaryOp('*', (a, b) => ({ kind: 'Int', value: a.value * b.value }));
    this.addBinaryOp('/', (a, b) => ({ kind: 'Int', value: Math.floor(a.value / b.value) }));
    this.addBinaryOp('%', (a, b) => ({ kind: 'Int', value: a.value % b.value }));

    this.addCmpOp('<', (a, b) => a.value < b.value);
    this.addCmpOp('>', (a, b) => a.value > b.value);
    this.addCmpOp('<=', (a, b) => a.value <= b.value);
    this.addCmpOp('>=', (a, b) => a.value >= b.value);
    this.addCmpOp('==', (a, b) => a.value === b.value);
    this.addCmpOp('!=', (a, b) => a.value !== b.value);

    this.addBoolOp('&&', (a, b) => a.value && b.value);
    this.addBoolOp('||', (a, b) => a.value || b.value);

    // Unary operators
    this.globalEnv.set('unary_!', {
      kind: 'Builtin',
      fn: (args: Value[]) => {
        const arg = args[0];
        if (arg.kind !== 'Bool') throw new Error('Expected boolean');
        return { kind: 'Bool', value: !arg.value };
      }
    });

    this.globalEnv.set('unary_-', {
      kind: 'Builtin',
      fn: (args: Value[]) => {
        const arg = args[0];
        if (arg.kind !== 'Int') throw new Error('Expected integer');
        return { kind: 'Int', value: -arg.value };
      }
    });
  }

  private addBinaryOp(name: string, op: (a: any, b: any) => Value): void {
    this.globalEnv.set(name, {
      kind: 'Builtin',
      fn: (args: Value[]) => {
        if (args.length !== 2) throw new Error(`${name} expects 2 arguments`);
        return op(args[0], args[1]);
      }
    });
  }

  private addCmpOp(name: string, op: (a: any, b: any) => boolean): void {
    this.globalEnv.set(name, {
      kind: 'Builtin',
      fn: (args: Value[]) => {
        if (args.length !== 2) throw new Error(`${name} expects 2 arguments`);
        const result = op(args[0], args[1]);
        return { kind: 'Bool', value: result };
      }
    });
  }

  private addBoolOp(name: string, op: (a: any, b: any) => boolean): void {
    this.globalEnv.set(name, {
      kind: 'Builtin',
      fn: (args: Value[]) => {
        if (args.length !== 2) throw new Error(`${name} expects 2 arguments`);
        if (args[0].kind !== 'Bool' || args[1].kind !== 'Bool') {
          throw new Error('Expected boolean arguments');
        }
        const result = op(args[0], args[1]);
        return { kind: 'Bool', value: result };
      }
    });
  }

  /**
   * Execute a program
   */
  execute(elements: Element[]): Value {
    let result: Value = { kind: 'Unit' };

    // First, evaluate all top-level elements (function definitions, etc.)
    for (const elem of elements) {
      result = this.eval(elem, this.globalEnv);
      if (this.returnValue) {
        const ret = this.returnValue;
        this.returnValue = null;
        return ret;
      }
    }

    // If a main function exists, call it automatically
    const mainFunc = this.globalEnv.get('main');
    if (mainFunc && mainFunc.kind === 'Function') {
      // Call main with no arguments
      const newEnv = new Map(mainFunc.env);
      result = this.eval(mainFunc.body, newEnv);

      // If main returned via return statement, use that value
      if (this.returnValue) {
        result = this.returnValue;
        this.returnValue = null;
      }
    }

    return result;
  }

  private eval(elem: Element, env: Environment): Value {
    if (this.returnValue) {
      return this.returnValue;
    }

    switch (elem.kind) {
      case 'def':
        return this.evalFunctionDef(elem, env);
      case 'let':
        return this.evalLet(elem, env);
      case 'if':
        return this.evalIf(elem, env);
      case 'call':
        return this.evalCall(elem, env);
      case 'var':
        return this.evalVar(elem, env);
      case 'literal':
        return this.evalLiteral(elem);
      case 'lambda':
        return this.evalLambda(elem, env);
      case 'block':
        return this.evalBlock(elem, env);
      case 'return':
        return this.evalReturn(elem, env);
      case 'while':
        return this.evalWhile(elem, env);
      case 'for':
        return this.evalFor(elem, env);
      default:
        throw new Error(`Unknown element kind: ${elem.kind}`);
    }
  }

  private evalFunctionDef(elem: Element, env: Environment): Value {
    const name = elem.name!;
    const children = elem.children || [];

    const params = children.filter(c => c.kind === 'param').map(p => p.name!);
    const body = children.find(c => c.kind === 'block')!;

    const func: Value = {
      kind: 'Function',
      params,
      body,
      env
    };

    env.set(name, func);

    return { kind: 'Unit' };
  }

  private evalLet(elem: Element, env: Environment): Value {
    const name = elem.name!;
    const value = this.eval(elem.children![0], env);

    env.set(name, value);

    return value;
  }

  private evalIf(elem: Element, env: Environment): Value {
    const children = elem.children || [];
    const condElem = children.find(c => c.kind === 'condition')!;
    const thenBranch = children.find(c => c.kind === 'block')!;
    const elseBranch = children.find((c, i) => c.kind === 'block' && i > 0);

    const cond = this.eval(condElem.children![0], env);

    if (cond.kind !== 'Bool') {
      throw new Error('Condition must be boolean');
    }

    if (cond.value) {
      return this.eval(thenBranch, env);
    } else if (elseBranch) {
      return this.eval(elseBranch, env);
    }

    return { kind: 'Unit' };
  }

  private evalCall(elem: Element, env: Environment): Value {
    const name = elem.name!;
    const args = (elem.children || []).map(arg => this.eval(arg, env));

    const func = env.get(name) || this.globalEnv.get(name);

    if (!func) {
      throw new Error(`Undefined function: ${name}`);
    }

    if (func.kind === 'Builtin') {
      return func.fn(args);
    } else if (func.kind === 'Function') {
      if (args.length !== func.params.length) {
        throw new Error(`Function ${name} expects ${func.params.length} arguments, got ${args.length}`);
      }

      const newEnv = new Map(func.env);
      func.params.forEach((param, i) => {
        newEnv.set(param, args[i]);
      });

      const result = this.eval(func.body, newEnv);

      // If the function returned via return statement, clear returnValue
      // and return the result (the return value is propagated up)
      if (this.returnValue) {
        const returnedValue = this.returnValue;
        this.returnValue = null;
        return returnedValue;
      }

      return result;
    }

    throw new Error(`${name} is not a function`);
  }

  private evalVar(elem: Element, env: Environment): Value {
    const name = elem.name!;
    const value = env.get(name) || this.globalEnv.get(name);

    if (!value) {
      throw new Error(`Undefined variable: ${name}`);
    }

    return value;
  }

  private evalLiteral(elem: Element): Value {
    const typeAttr = elem.attrs?.find(a => a.key === 'type')!;
    const valueAttr = elem.attrs?.find(a => a.key === 'value')!;

    switch (typeAttr.value) {
      case 'Int':
        return { kind: 'Int', value: parseInt(valueAttr.value) };
      case 'String':
        return { kind: 'String', value: valueAttr.value };
      case 'Bool':
        return { kind: 'Bool', value: valueAttr.value === 'true' };
      default:
        throw new Error(`Unknown literal type: ${typeAttr.value}`);
    }
  }

  private evalLambda(elem: Element, env: Environment): Value {
    const children = elem.children || [];
    const params = children.filter(c => c.kind === 'param').map(p => p.name!);
    const body = children.find(c => c.kind === 'block')!;

    return {
      kind: 'Function',
      params,
      body,
      env
    };
  }

  private evalBlock(elem: Element, env: Environment): Value {
    const stmts = elem.children || [];

    if (stmts.length === 0) {
      return { kind: 'Unit' };
    }

    let result: Value = { kind: 'Unit' };
    for (const stmt of stmts) {
      result = this.eval(stmt, env);
      if (this.returnValue) {
        return this.returnValue;
      }
    }

    return result;
  }

  private evalReturn(elem: Element, env: Environment): Value {
    const value = elem.children?.[0];
    const result: Value = value ? this.eval(value, env) : { kind: 'Unit' };
    this.returnValue = result;
    return result;
  }

  private evalWhile(elem: Element, env: Environment): Value {
    const children = elem.children || [];
    const condElem = children.find(c => c.kind === 'condition')!;
    const body = children.find(c => c.kind === 'block')!;

    while (true) {
      const cond = this.eval(condElem.children![0], env);

      if (cond.kind !== 'Bool') {
        throw new Error('While condition must be boolean');
      }

      if (!cond.value) break;

      this.eval(body, env);

      if (this.returnValue) break;
    }

    return { kind: 'Unit' };
  }

  private evalFor(elem: Element, env: Environment): Value {
    const children = elem.children || [];
    const fromElem = children.find(c => c.kind === 'from')!;
    const toElem = children.find(c => c.kind === 'to')!;
    const body = children.find(c => c.kind === 'block')!;

    const fromVal = this.eval(fromElem.children![0], env);
    const toVal = this.eval(toElem.children![0], env);

    if (fromVal.kind !== 'Int' || toVal.kind !== 'Int') {
      throw new Error('For loop bounds must be integers');
    }

    const varAttr = elem.attrs?.find(a => a.key === 'var');
    const varName = varAttr?.value || 'i';

    for (let i = fromVal.value; i <= toVal.value; i++) {
      const newEnv = new Map(env);
      newEnv.set(varName, { kind: 'Int', value: i });

      this.eval(body, newEnv);

      if (this.returnValue) break;
    }

    return { kind: 'Unit' };
  }

  private valueToString(val: Value): string {
    switch (val.kind) {
      case 'Int':
        return String(val.value);
      case 'String':
        return val.value;
      case 'Bool':
        return String(val.value);
      case 'Unit':
        return '()';
      case 'Function':
        return '<function>';
      case 'Builtin':
        return '<builtin>';
    }
  }
}
