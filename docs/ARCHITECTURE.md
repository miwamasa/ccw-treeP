# TreeP アーキテクチャ設計

## システム概要

TreePは、マクロシステムとTree Transducerを統合した関数型プログラミング言語処理系です。

```
┌─────────────────────────────────────────────────────────┐
│                    TreeP System                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐           │
│  │  Lexer   │→│  Parser  │→│ Normalizer │           │
│  └──────────┘  └──────────┘  └────────────┘           │
│                                     ↓                   │
│                             ┌───────────────┐           │
│                             │     EAST      │           │
│                             │ (Unified AST) │           │
│                             └───────────────┘           │
│                                     ↓                   │
│                    ┌────────────────┴────────────────┐  │
│                    ↓                                 ↓  │
│            ┌──────────────┐              ┌─────────────┐│
│            │ Macro System │              │ Transducer  ││
│            │  (Built-in)  │              │  (Custom)   ││
│            └──────────────┘              └─────────────┘│
│                    ↓                                 ↓  │
│                    └────────────────┬────────────────┘  │
│                                     ↓                   │
│                             ┌──────────────┐            │
│                             │ Type System  │            │
│                             │   (HM型推論) │            │
│                             └──────────────┘            │
│                                     ↓                   │
│                             ┌──────────────┐            │
│                             │ Interpreter  │            │
│                             └──────────────┘            │
│                                     ↓                   │
│                                  Result                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## コア設計原則

### 1. 統一的なAST表現（EAST）

**Element-based AST (EAST)**は、すべての構文要素を統一的に表現：

```typescript
interface Element {
  kind: string;        // ノードの種類
  name?: string;       // 識別子名
  attrs?: Attr[];      // 属性（型、値など）
  children?: Element[]; // 子要素
  span?: SourceSpan;   // ソースコード位置
}
```

**利点**:
- すべてのフェーズで同じデータ構造
- 変換が容易（入力と出力が同じ型）
- パイプライン処理が自然

**例**:
```javascript
// TreePコード:
def add(x, y) { return x + y }

// EAST表現:
{
  kind: "def",
  name: "add",
  children: [
    { kind: "param", name: "x" },
    { kind: "param", name: "y" },
    {
      kind: "block",
      children: [
        {
          kind: "return",
          children: [
            { kind: "call", name: "+", children: [...] }
          ]
        }
      ]
    }
  ]
}
```

### 2. パイプライン アーキテクチャ

各フェーズは独立したトランスフォーマー：

```
Source → [Lexer] → Tokens
       → [Parser] → CST
       → [Normalizer] → EAST
       → [Macro Expander] → EAST
       → [Transducer] → EAST (optional)
       → [Type Checker] → EAST + Types
       → [Interpreter] → Result
```

**特徴**:
- 各段階が明確に分離
- 中間表現（EAST）の検査が容易
- 新しい変換の追加が簡単

### 3. マクロシステムの設計

**ビルトインマクロ**:
```typescript
// 定義
{
  name: 'when',
  pattern: '$cond, $body',
  expand: (args) => {
    const cond = args.get('cond');
    const body = args.get('body');
    return makeIf(cond, extractLambdaBody(body));
  }
}

// 使用
when(x > 0) {
  println("positive")
}

// 展開後
if (x > 0) {
  println("positive")
}
```

**設計のポイント**:
1. パターンベースの引数マッチング
2. ラムダ本体の自動抽出
3. EAST生成による型安全性

### 4. Transducerの設計

**宣言的な変換ルール**:
```typescript
{
  name: 'optimize',
  pattern: Pattern,      // どの木構造にマッチするか
  condition: Condition,  // 追加の条件
  template: Template     // どう変換するか
}
```

**パターンマッチャー**:
```
PatternMatcher
  ├─ matchKindPattern()   // ノードの種類でマッチ
  ├─ matchVarPattern()    // 任意の要素をキャプチャ
  ├─ matchListPattern()   // 複数要素をキャプチャ
  └─ matchAttrPattern()   // 属性でマッチ
```

**テンプレートジェネレーター**:
```
TemplateGenerator
  ├─ generateNode()       // 新しいノード生成
  ├─ generateVar()        // 変数を展開
  ├─ generateList()       // リストを展開
  └─ generateLiteral()    // リテラル生成
```

## 重要なデザインパターン

### 1. Visitor Pattern (暗黙的)

TransducerはVisitorパターンを実装：

```typescript
class Transducer {
  transform(element: Element): Element {
    // ルールを試行
    for (const rule of this.rules) {
      const bindings = this.matcher.match(rule.pattern, element);
      if (bindings) {
        const result = this.generator.generate(rule.template, bindings);
        // 子要素を再帰的に変換
        if (result.children) {
          result.children = result.children.map(child => this.transform(child));
        }
        return result;
      }
    }
    // マッチしなければ子要素だけ変換
    if (element.children) {
      return {
        ...element,
        children: element.children.map(child => this.transform(child))
      };
    }
    return element;
  }
}
```

**利点**:
- 木構造の再帰的な処理が自然
- ルールの追加が容易
- デフォルト動作（恒等変換）が明確

### 2. Builder Pattern

TransducerBuilderとTransformRuleBuilder：

```typescript
// Fluent Interface
const transducer = new TransducerBuilder()
  .addRule(rule1)
  .addRule(rule2)
  .addRule(rule3)
  .build('optimizer');

const rule = new TransformRuleBuilder()
  .setName('optimize')
  .matchBinaryOp('+')
  .when(condition)
  .generateVar('result')
  .build();
```

**利点**:
- 段階的な構築が可能
- メソッドチェーンで読みやすい
- 不完全な状態を防ぐ

### 3. Strategy Pattern

条件付き変換：

```typescript
interface TransformRule {
  pattern: Pattern;
  condition?: (bindings: Bindings) => boolean;  // Strategy
  template: Template;
}

// 異なる戦略を動的に適用
const rule = {
  pattern: binaryOpPattern,
  condition: (bindings) => {
    // 戦略1: 算術最適化
    if (isArithmeticOptimizable(bindings)) return true;
    // 戦略2: 定数畳み込み
    if (isConstantFoldable(bindings)) return true;
    return false;
  },
  template: optimizedTemplate
};
```

### 4. Composite Pattern

パイプラインの構成：

```typescript
class TransducerPipeline {
  private transducers: Transducer[] = [];

  add(transducer: Transducer): this {
    this.transducers.push(transducer);
    return this;
  }

  transform(tree: Element): Element {
    return this.transducers.reduce(
      (acc, t) => t.transform(acc),
      tree
    );
  }
}

// 複合的な変換
const pipeline = new TransducerPipeline()
  .add(macroExpander)
  .add(optimizer)
  .add(deadCodeEliminator);
```

### 5. Fixpoint Iteration

不動点変換：

```typescript
class FixpointTransducer {
  transform(tree: Element): Element {
    let current = tree;
    while (true) {
      const next = this.transducer.transform(current);
      if (equals(next, current)) {
        return current;  // 不動点に到達
      }
      current = next;
    }
  }
}
```

**用途**:
- ネストした最適化
- 再帰的な簡約
- 正規形への変換

## 型システムの統合

### Hindley-Milner型推論

```typescript
class TypeInference {
  infer(elements: Element[]): void {
    const env = this.initEnv();

    for (const elem of elements) {
      this.inferElement(elem, env);
    }
  }

  private inferElement(elem: Element, env: TypeEnv): Type {
    switch (elem.kind) {
      case 'def':
        return this.inferFunctionDef(elem, env);
      case 'call':
        return this.inferCall(elem, env);
      // ...
    }
  }
}
```

**Transducerとの関係**:
1. Transducerで変換後のEAST
2. 型推論で型チェック
3. 型エラーがあれば報告

### 型情報の保存

```typescript
// 型情報を属性として保存
{
  kind: 'def',
  name: 'add',
  attrs: [
    { key: 'type', value: 'Int -> Int -> Int' }
  ],
  children: [...]
}
```

## 拡張性

### 新しいマクロの追加

```typescript
// ユーザー定義マクロ（将来の拡張）
class CustomMacroExpander extends MacroExpander {
  constructor() {
    super();
    this.addMacro({
      name: 'repeat',
      pattern: '$n, $body',
      expand: (args) => {
        const n = args.get('n');
        const body = args.get('body');
        // n回繰り返すwhileループを生成
        return makeWhile(makeRange(n), body);
      }
    });
  }
}
```

### 新しいTransducer変換

```typescript
// カスタム最適化
const myOptimizer = new TransducerBuilder()
  .addRule({
    name: 'custom_optimization',
    pattern: myPattern,
    condition: myCondition,
    template: myTemplate
  })
  .build('my_optimizer');

// 既存パイプラインに追加
pipeline.add(myOptimizer);
```

### 新しいバックエンド

```typescript
// JavaScript生成器
class JavaScriptGenerator extends Transducer {
  constructor() {
    super({
      name: 'js_generator',
      rules: [
        // TreeP EAST → JavaScript AST
        defToFunction,
        callToJsCall,
        // ...
      ]
    });
  }
}

// 使用
const jsAst = jsGenerator.transform(treepAst);
const jsCode = generateCode(jsAst);
```

## パフォーマンス考慮事項

### 1. メモ化

同じサブツリーの変換を記憶：

```typescript
class MemoizedTransducer {
  private cache = new Map<Element, Element>();

  transform(tree: Element): Element {
    const cached = this.cache.get(tree);
    if (cached) return cached;

    const result = this.transducer.transform(tree);
    this.cache.set(tree, result);
    return result;
  }
}
```

### 2. 早期終了

Fixpointの最適化：

```typescript
class OptimizedFixpoint {
  transform(tree: Element): Element {
    let current = tree;
    let hash = this.hash(current);

    for (let i = 0; i < this.maxIterations; i++) {
      const next = this.transducer.transform(current);
      const nextHash = this.hash(next);

      if (hash === nextHash) {
        return current;  // ハッシュで高速比較
      }

      current = next;
      hash = nextHash;
    }
    return current;
  }
}
```

### 3. 並列化（将来の拡張）

独立したサブツリーを並列処理：

```typescript
class ParallelTransducer {
  transform(tree: Element): Element {
    if (tree.children) {
      // 子要素を並列変換
      const promises = tree.children.map(child =>
        this.transformAsync(child)
      );
      tree.children = await Promise.all(promises);
    }
    return this.applyRules(tree);
  }
}
```

## まとめ

TreePのアーキテクチャは：

1. **統一的**: EASTによる一貫した表現
2. **モジュラー**: 各フェーズが独立
3. **拡張可能**: 新しいマクロ・変換の追加が容易
4. **宣言的**: パターンとテンプレートで変換を記述
5. **型安全**: Hindley-Milner型推論
6. **効率的**: 最適化とメモ化

このアーキテクチャにより、TreePは強力で柔軟な言語処理系となっています。
