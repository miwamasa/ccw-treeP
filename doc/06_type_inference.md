# 型推論システム

## Hindley-Milner型推論

TreePは、Hindley-Milner型推論アルゴリズムを実装しています。これは、Standard MLやOCaml、Haskellなどの関数型言語で採用されている型推論方式です。

## 型システムの基本

### 型の種類

```typescript
type Type =
  | TypeVar        // 型変数（例：t0, t1）
  | TypeCon        // 型コンストラクタ（例：Int, String, Bool）
  | TypeFun;       // 関数型（例：Int -> Int）

interface TypeVar {
  kind: 'TypeVar';
  name: string;     // t0, t1, t2, ...
}

interface TypeCon {
  kind: 'TypeCon';
  name: string;     // Int, String, Bool, Unit
  args?: Type[];
}

interface TypeFun {
  kind: 'TypeFun';
  from: Type;       // 引数の型
  to: Type;         // 返り値の型
}
```

### 型スキーム（多相型）

```typescript
interface TypeScheme {
  typeVars: string[];    // 型変数のリスト
  type: Type;           // 型
}
```

例：
```
∀a. a -> a          // 恒等関数の型
∀a. a -> String     // toStringの型
```

## 型推論の流れ

```
EAST
  ↓
型推論エンジン
  ↓ 1. 型変数の生成
  ↓ 2. 制約の収集
  ↓ 3. 単一化（Unification）
  ↓ 4. 一般化（Generalization）
  ↓
型環境（TypeEnv）
```

## 型推論の例

### 例1: 単純な関数

**TreePコード:**
```treep
def add(x, y) {
  return x + y
}
```

**型推論の手順:**

1. **型変数の割り当て**
   ```
   x: t0
   y: t1
   add: t2
   ```

2. **制約の収集**
   ```
   x + y の型推論:
     + の型: Int -> Int -> Int
     x: t0
     y: t1

   制約:
     t0 = Int
     t1 = Int
     t2 = Int -> Int -> Int
   ```

3. **単一化**
   ```
   t0 = Int
   t1 = Int
   t2 = Int -> Int -> Int
   ```

4. **結果**
   ```
   add: Int -> Int -> Int
   ```

### 例2: 多相関数

**TreePコード:**
```treep
def identity(x) {
  return x
}
```

**型推論:**

1. **型変数の割り当て**
   ```
   x: t0
   identity: t1
   ```

2. **制約の収集**
   ```
   return x の型: t0

   制約:
     t1 = t0 -> t0
   ```

3. **一般化**
   ```
   identity: ∀t0. t0 -> t0
   ```

### 例3: 再帰関数

**TreePコード:**
```treep
def factorial(n) {
  if (n <= 1) {
    return 1
  } else {
    return n * factorial(n - 1)
  }
}
```

**型推論:**

1. **型変数の割り当て**
   ```
   n: t0
   factorial: t1
   ```

2. **制約の収集**
   ```
   n <= 1 の型推論:
     <= の型: Int -> Int -> Bool
     n: t0
     1: Int

   制約:
     t0 = Int

   n * factorial(n - 1) の型推論:
     * の型: Int -> Int -> Int
     n: Int
     factorial(n - 1): t2

   制約:
     t2 = Int
     t1 = Int -> Int
   ```

3. **結果**
   ```
   factorial: Int -> Int
   ```

## 実装詳細

### TypeInference クラス

```typescript
class TypeInference {
  private nextVarId: number = 0;
  private substitution: Map<string, Type> = new Map();

  infer(elements: Element[], env: TypeEnv): TypeEnv {
    const newEnv = new Map(env);
    this.addBuiltins(newEnv);

    for (const elem of elements) {
      this.inferElement(elem, newEnv);
    }

    return newEnv;
  }
}
```

### 型変数の生成

```typescript
private freshVar(): TypeVar {
  return {
    kind: 'TypeVar',
    name: `t${this.nextVarId++}`
  };
}
```

### 単一化（Unification）

2つの型を統一し、矛盾がないかチェックします。

```typescript
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
```

### 型変数の束縛

```typescript
private bindVar(name: string, type: Type): void {
  // 自己参照チェック
  if (type.kind === 'TypeVar' && type.name === name) {
    return;
  }

  // 発生チェック（無限型の防止）
  if (this.occursIn(name, type)) {
    throw new Error(`Infinite type: ${name} occurs in ${JSON.stringify(type)}`);
  }

  this.substitution.set(name, type);
}
```

### 一般化（Generalization）

型を多相型（型スキーム）に一般化します。

```typescript
private generalize(env: TypeEnv, type: Type): TypeScheme {
  const appliedType = this.apply(type);
  const freeVars = this.freeVars(appliedType);
  const envFreeVars = new Set<string>();

  // 環境の自由変数を収集
  for (const scheme of env.values()) {
    for (const v of this.freeVars(scheme.type)) {
      envFreeVars.add(v);
    }
  }

  // 環境にない自由変数を型変数として一般化
  const typeVars = Array.from(freeVars).filter(v => !envFreeVars.has(v));

  return { typeVars, type: appliedType };
}
```

### インスタンス化（Instantiation）

型スキームから具体的な型を生成します。

```typescript
private instantiate(scheme: TypeScheme): Type {
  const subst = new Map<string, Type>();

  // 各型変数に新しい型変数を割り当て
  for (const tv of scheme.typeVars) {
    subst.set(tv, this.freshVar());
  }

  return this.substituteType(scheme.type, subst);
}
```

## 組み込み型の定義

### 基本型

```typescript
const intType: TypeCon = { kind: 'TypeCon', name: 'Int' };
const boolType: TypeCon = { kind: 'TypeCon', name: 'Bool' };
const stringType: TypeCon = { kind: 'TypeCon', name: 'String' };
const unitType: TypeCon = { kind: 'TypeCon', name: 'Unit' };
```

### 組み込み演算子

```typescript
// 二項演算子: Int -> Int -> Int
const intBinOp: TypeScheme = {
  typeVars: [],
  type: makeFun(intType, makeFun(intType, intType))
};

env.set('+', intBinOp);
env.set('-', intBinOp);
env.set('*', intBinOp);
env.set('/', intBinOp);
env.set('%', intBinOp);

// 比較演算子: Int -> Int -> Bool
const intCmpOp: TypeScheme = {
  typeVars: [],
  type: makeFun(intType, makeFun(intType, boolType))
};

env.set('<', intCmpOp);
env.set('>', intCmpOp);
env.set('<=', intCmpOp);
env.set('>=', intCmpOp);
env.set('==', intCmpOp);
env.set('!=', intCmpOp);
```

### 多相組み込み関数

```typescript
// println: ∀a. a -> Unit
const a = freshVar();
env.set('println', {
  typeVars: [a.name],
  type: makeFun(a, unitType)
});

// toString: ∀a. a -> String
env.set('toString', {
  typeVars: [a.name],
  type: makeFun(a, stringType)
});
```

## 型推論の例（詳細）

### 例：Let多相性

```treep
def identity(x) {
  return x
}

def main() {
  let n = identity(42)      // n: Int
  let s = identity("hello") // s: String
  return 0
}
```

**型推論:**

1. `identity`の型推論
   ```
   x: t0
   return x: t0
   identity: t0 -> t0

   一般化:
   identity: ∀t0. t0 -> t0
   ```

2. `identity(42)`の型推論
   ```
   インスタンス化:
   identity: t1 -> t1  （t1は新しい型変数）

   42: Int

   単一化:
   t1 = Int

   結果:
   identity(42): Int
   ```

3. `identity("hello")`の型推論
   ```
   インスタンス化:
   identity: t2 -> t2  （t2は新しい型変数）

   "hello": String

   単一化:
   t2 = String

   結果:
   identity("hello"): String
   ```

同じ`identity`関数が、異なる型で複数回使用できます（Let多相性）。

## 型エラーの例

### 例1: 型の不一致

```treep
def add(x, y) {
  return x + y
}

let result = add(10, "hello")  // エラー！
```

**エラーメッセージ:**
```
Type mismatch: Int vs String
```

### 例2: 無限型

```treep
def loop(x) {
  return loop(x)
}
```

**エラーメッセージ:**
```
Infinite type: t0 occurs in t0 -> t1
```

## まとめ

TreePの型推論システムは：

1. **Hindley-Milner**アルゴリズムに基づく
2. **型変数**を自動生成
3. **単一化**で型を統一
4. **一般化**で多相型を実現
5. **Let多相性**をサポート
6. **型エラー**を検出

これにより、型注釈を省略しても型安全なプログラムが書けます。
