# Macro Tree Transducer: 統合変換システムの解説

## 概要

TreePのMacro Tree Transducerは、**マクロシステム**と**Tree Transducer**を統合した強力な変換システムです。これにより、宣言的なパターンマッチングとテンプレートベースの変換を組み合わせて、AST（抽象構文木）を柔軟に操作できます。

## 設計思想

### 1. マクロシステムとTransducerの統合

TreePでは、2つの異なるアプローチでコード変換を実現しています：

```
┌─────────────────┐        ┌──────────────────┐
│  Macro System   │        │   Transducer     │
│  (コンパイル時)  │   +    │  (AST変換時)      │
│                 │        │                  │
│ - when()        │        │ - パターンマッチ   │
│ - debug()       │        │ - テンプレート生成 │
│ - assert()      │        │ - 条件付き変換    │
└─────────────────┘        └──────────────────┘
         │                          │
         └──────────┬───────────────┘
                    ▼
         ┌─────────────────────┐
         │ Macro Tree Transducer │
         │  (統合変換システム)    │
         └─────────────────────┘
```

**マクロシステム**:
- コンパイル時にソースコードを変換
- `when(cond) { body }` → `if (cond) { body }`
- パターンに基づく自動展開

**Transducer**:
- AST（EAST）を直接操作
- 木構造の変換ルールを宣言的に定義
- 最適化、リライティング、コード生成

**統合による利点**:
- マクロで高レベルな構文を提供
- Transducerで低レベルな最適化を実施
- 両者を組み合わせて多段階変換を実現

### 2. EAST（Element-based AST）の役割

TreePのすべての構造はEASTとして統一的に表現されます：

```typescript
interface Element {
  kind: string;        // ノードの種類 ("def", "call", "if", etc.)
  name?: string;       // 名前（関数名、変数名など）
  attrs?: Attr[];      // 属性（型情報など）
  children?: Element[]; // 子要素
  span?: SourceSpan;   // ソースコード位置
}
```

この統一表現により：
- マクロ展開の結果もEAST
- Transducerの入出力もEAST
- パイプライン処理が容易

## コア機能

### 1. パターンマッチング

Transducerは強力なパターンマッチング機能を提供します：

#### KindPattern - ノードの種類でマッチ

```typescript
{
  type: 'KindPattern',
  kind: 'call',           // "call"ノードにマッチ
  nameVar: 'funcName',    // 関数名を変数に束縛
  childPatterns: [...]    // 子要素のパターン
}
```

**例**: 関数呼び出しをマッチ
```typescript
// x + 0 のパターン
{
  type: 'KindPattern',
  kind: 'call',
  nameVar: 'op',
  childPatterns: [
    { type: 'VarPattern', varName: 'left' },   // 左辺を'left'に束縛
    { type: 'VarPattern', varName: 'right' }   // 右辺を'right'に束縛
  ]
}
```

#### ListPattern - 可変長の子要素をマッチ

```typescript
{
  type: 'ListPattern',
  restVar: 'children'  // すべての子要素を'children'に束縛
}
```

**例**: すべての引数をキャプチャ
```typescript
{
  type: 'KindPattern',
  kind: 'def',
  nameVar: 'fname',
  childPatterns: [
    { type: 'ListPattern', restVar: 'children' }
  ]
}
```

#### VarPattern - 任意の要素をマッチ

```typescript
{
  type: 'VarPattern',
  varName: 'expr'  // 任意の式を'expr'に束縛
}
```

### 2. テンプレート生成

マッチしたパターンから新しいASTを生成します：

#### NodeTemplate - 新しいノードを生成

```typescript
{
  type: 'NodeTemplate',
  kind: 'function',                           // 新しいノードの種類
  name: { type: 'Var', varName: 'fname' },    // 束縛変数から名前を取得
  children: [
    { type: 'ListTemplate', listVar: 'children' }  // 束縛リストを展開
  ]
}
```

#### VarTemplate - 束縛変数をそのまま出力

```typescript
{
  type: 'VarTemplate',
  varName: 'expr'  // 束縛した式をそのまま出力
}
```

#### LiteralTemplate - リテラル値を生成

```typescript
{
  type: 'LiteralTemplate',
  value: '0'  // 固定値を生成
}
```

### 3. 条件付き変換

パターンマッチに成功した後、追加の条件で変換を制御：

```typescript
{
  name: 'optimize_add_zero',
  pattern: { ... },
  condition: (bindings) => {
    const right = bindings.get('right') as Element;
    return right.kind === 'literal' &&
           right.attrs?.find(a => a.key === 'value')?.value === '0';
  },
  template: { ... }
}
```

## DSL（Domain-Specific Language）

### TransformRuleBuilder

より読みやすい構文でルールを定義：

```typescript
new TransformRuleBuilder()
  .setName('simplify_add_zero')      // ルール名
  .matchBinaryOp('+')                 // 二項演算をマッチ
  .when(bindings =>                   // 条件
    isLiteral(bindings.get('right') as Element, '0')
  )
  .generateVar('left')                // 左辺を出力
  .build()
```

**利点**:
- メソッドチェーンで直感的
- 型安全
- 再利用可能

### ヘルパー関数

よくあるパターンをサポート：

```typescript
// リテラル値の判定
isLiteral(elem, '0')  // elem が値0のリテラルか？

// 変数の判定
isVar(elem, 'x')  // elem が変数xか？

// リテラル要素の生成
makeLiteral('Int', '42')
```

## 実践例

### 例1: 算術恒等式の最適化

```typescript
const optimizer = new TransducerBuilder()
  // x + 0 => x
  .addRule(
    new TransformRuleBuilder()
      .setName('add_zero')
      .matchBinaryOp('+')
      .when(bindings => isLiteral(bindings.get('right'), '0'))
      .generateVar('left')
      .build()
  )
  // x * 1 => x
  .addRule(
    new TransformRuleBuilder()
      .setName('mul_one')
      .matchBinaryOp('*')
      .when(bindings => isLiteral(bindings.get('right'), '1'))
      .generateVar('left')
      .build()
  )
  // 0 * x => 0
  .addRule(
    new TransformRuleBuilder()
      .setName('mul_zero')
      .matchBinaryOp('*')
      .when(bindings => isLiteral(bindings.get('left'), '0'))
      .generateLiteral('0')
      .build()
  )
  .build('optimizer');

// 適用
const input = parseExpression("(x * 1) + 0");
const output = optimizer.transform(input);
// 結果: x
```

### 例2: 論理式の簡約化

```typescript
const logicSimplifier = new TransducerBuilder()
  // !!x => x (二重否定の除去)
  .addRule({
    name: 'double_negation',
    pattern: {
      type: 'KindPattern',
      kind: 'call',
      nameVar: 'op1',
      childPatterns: [
        {
          type: 'KindPattern',
          kind: 'call',
          nameVar: 'op2',
          childPatterns: [
            { type: 'VarPattern', varName: 'expr' }
          ]
        }
      ]
    },
    condition: (bindings) => {
      return bindings.get('op1') === 'unary_!' &&
             bindings.get('op2') === 'unary_!';
    },
    template: {
      type: 'VarTemplate',
      varName: 'expr'
    }
  })
  .build('logic_simplifier');

// !!x => x
```

### 例3: TreeP言語の拡張変換

```typescript
// TreePコードを別の言語に変換
const codeGenerator = new TransducerBuilder()
  // def -> function
  .addRule({
    name: 'gen_function',
    pattern: {
      type: 'KindPattern',
      kind: 'def',
      nameVar: 'fname',
      childPatterns: [
        { type: 'ListPattern', restVar: 'body' }
      ]
    },
    template: {
      type: 'NodeTemplate',
      kind: 'js_function',
      name: { type: 'Var', varName: 'fname' },
      children: [
        { type: 'ListTemplate', listVar: 'body' }
      ]
    }
  })
  // param -> js_param
  .addRule({
    name: 'gen_param',
    pattern: {
      type: 'KindPattern',
      kind: 'param',
      nameVar: 'pname'
    },
    template: {
      type: 'NodeTemplate',
      kind: 'js_param',
      name: { type: 'Var', varName: 'pname' }
    }
  })
  .build('codegen');
```

## 高度な機能

### 1. Fixpoint変換

変更がなくなるまで繰り返し適用：

```typescript
class FixpointTransducer {
  constructor(
    private transducer: any,
    private maxIterations: number = 10
  ) {}

  transform(tree: Element): Element {
    let current = tree;
    let iterations = 0;

    while (iterations < this.maxIterations) {
      const next = this.transducer.transform(current);

      // 変更がなければ終了
      if (JSON.stringify(next) === JSON.stringify(current)) {
        console.log(`Reached fixpoint after ${iterations} iterations`);
        return current;
      }

      current = next;
      iterations++;
    }

    console.log(`Max iterations reached`);
    return current;
  }
}

// 使用例
const fixpointOptimizer = new FixpointTransducer(optimizer);

// ((x + 0) * 1) + 0
// => (x * 1) + 0      (1回目)
// => x + 0            (2回目)
// => x                (3回目) fixpoint到達
const result = fixpointOptimizer.transform(complexTree);
```

**利点**:
- ネストした変換を自動的に処理
- 最適化の連鎖を実現
- 収束検出で効率的

### 2. マルチパス変換パイプライン

複数のTransducerを組み合わせ：

```typescript
class TransducerPipeline {
  private transducers: any[] = [];

  add(transducer: any): this {
    this.transducers.push(transducer);
    return this;
  }

  transform(tree: Element): Element {
    let result = tree;
    for (const transducer of this.transducers) {
      result = transducer.transform(result);
    }
    return result;
  }
}

// パイプライン構築
const pipeline = new TransducerPipeline()
  .add(macroExpander)         // 1. マクロ展開
  .add(logicSimplifier)       // 2. 論理簡約
  .add(arithmeticOptimizer)   // 3. 算術最適化
  .add(deadCodeEliminator);   // 4. デッドコード除去

// 適用
const optimized = pipeline.transform(sourceTree);
```

### 3. 条件付きルール適用

複雑な条件での制御：

```typescript
const advancedOptimizer = new TransducerBuilder()
  .addRule({
    name: 'constant_folding',
    pattern: {
      type: 'KindPattern',
      kind: 'call',
      nameVar: 'op',
      childPatterns: [
        { type: 'VarPattern', varName: 'left' },
        { type: 'VarPattern', varName: 'right' }
      ]
    },
    condition: (bindings) => {
      const op = bindings.get('op') as string;
      const left = bindings.get('left') as Element;
      const right = bindings.get('right') as Element;

      // 両方がリテラルの場合のみ
      if (!isLiteral(left) || !isLiteral(right)) {
        return false;
      }

      // 演算を実行して結果を保存
      if (op === '+') {
        const leftVal = parseInt(left.attrs!.find(a => a.key === 'value')!.value);
        const rightVal = parseInt(right.attrs!.find(a => a.key === 'value')!.value);
        const result = leftVal + rightVal;

        bindings.set('__result__', makeLiteral('Int', result.toString()));
        return true;
      }

      return false;
    },
    template: {
      type: 'VarTemplate',
      varName: '__result__'
    }
  })
  .build('advanced_optimizer');

// 2 + 3 => 5
```

## マクロシステムとの統合

### 統合の流れ

```
TreePソースコード
     ↓
┌──────────────┐
│ 1. Lexer     │ → トークン列
└──────────────┘
     ↓
┌──────────────┐
│ 2. Parser    │ → CST (具象構文木)
└──────────────┘
     ↓
┌──────────────┐
│ 3. Normalizer│ → EAST
└──────────────┘
     ↓
┌──────────────────────┐
│ 4. Macro Expansion   │ ← マクロシステム
│    when() → if()     │
│    debug() → println │
└──────────────────────┘
     ↓
┌──────────────────────┐
│ 5. Transducer        │ ← Tree Transducer
│    最適化・変換       │
└──────────────────────┘
     ↓
┌──────────────┐
│ 6. Type Check│
└──────────────┘
     ↓
┌──────────────┐
│ 7. Interpreter│ → 実行結果
└──────────────┘
```

### 統合例: マクロ展開後の最適化

```typescript
// 1. マクロ定義（内蔵）
// when(cond) { body } => if (cond) { body }

// 2. Transducerによる最適化
const optimizer = new TransducerBuilder()
  // if (true) { body } => body
  .addRule({
    name: 'if_true',
    pattern: {
      type: 'KindPattern',
      kind: 'if',
      childPatterns: [
        { type: 'VarPattern', varName: 'cond' },
        { type: 'VarPattern', varName: 'body' }
      ]
    },
    condition: (bindings) => {
      const cond = bindings.get('cond') as Element;
      return cond.kind === 'condition' &&
             cond.children?.[0]?.kind === 'literal' &&
             cond.children[0].attrs?.find(a => a.key === 'value')?.value === 'true';
    },
    template: {
      type: 'VarTemplate',
      varName: 'body'
    }
  })
  .build('optimizer');

// 3. TreePコード
const source = `
def main() {
  when(true) {
    println("Always executed")
  }
}
`;

// 処理フロー:
// when(true) { ... }
//   ↓ マクロ展開
// if (true) { ... }
//   ↓ Transducer最適化
// println("Always executed")
```

## ベストプラクティス

### 1. ルールの順序

ルールは定義順に適用されるため、順序が重要：

```typescript
// 良い例: 具体的なルールを先に
const transducer = new TransducerBuilder()
  .addRule(specificRule)   // より具体的
  .addRule(generalRule)    // より一般的
  .build();

// 悪い例: 一般的なルールが先
const transducer = new TransducerBuilder()
  .addRule(generalRule)    // これが常にマッチしてしまう
  .addRule(specificRule)   // 到達しない
  .build();
```

### 2. Fixpoint変換の使用

再帰的な最適化が必要な場合：

```typescript
// 単一パスでは不十分
const simple = optimizer.transform(tree);

// Fixpointで完全に最適化
const fixpoint = new FixpointTransducer(optimizer);
const complete = fixpoint.transform(tree);
```

### 3. パイプラインの構築

段階的な変換：

```typescript
// 1段階ずつ適用
const pipeline = new TransducerPipeline()
  .add(step1)  // マクロ展開
  .add(step2)  // 型情報の付加
  .add(step3)  // 最適化
  .add(step4); // コード生成
```

### 4. デバッグとテスト

```typescript
// 変換前後を比較
function debugTransform(transducer: any, tree: Element): void {
  console.log('Before:', JSON.stringify(tree, null, 2));
  const result = transducer.transform(tree);
  console.log('After:', JSON.stringify(result, null, 2));
  return result;
}

// ユニットテスト
function testOptimization(): void {
  const input = makeBinaryOp('+', makeVar('x'), makeLiteral('Int', '0'));
  const expected = makeVar('x');
  const actual = optimizer.transform(input);

  assert.deepEqual(actual, expected);
}
```

## まとめ

TreePのMacro Tree Transducerは：

1. **宣言的**: パターンとテンプレートで変換を記述
2. **強力**: 条件付きマッチング、Fixpoint反復
3. **柔軟**: DSL、ヘルパー関数で使いやすく
4. **統合的**: マクロシステムと組み合わせて多段階変換
5. **型安全**: TypeScriptの型システムを活用

これにより、AST変換、最適化、コード生成など、幅広い用途に対応できます。
