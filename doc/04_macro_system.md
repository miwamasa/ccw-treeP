# マクロシステム

## マクロとは

TreePのマクロは、コンパイル時にコードを変換する仕組みです。Lispのマクロに似ていますが、EASTという統一された中間表現を使うことで、よりシンプルに実装されています。

## マクロの仕組み

### 基本フロー

```
TreePコード
    ↓
  Parser
    ↓
  CST
    ↓
  Normalizer
    ↓
  EAST（マクロ呼び出しを含む）
    ↓
  Macro Expander ← マクロ定義
    ↓
  EAST（マクロ展開済み）
```

### マクロ展開の原理

1. **パターンマッチング**: マクロ呼び出しを検出し、引数をパターンにマッチング
2. **変数バインディング**: パターン中の変数（`$var`）に実際の引数をバインド
3. **テンプレート展開**: バインドされた変数を使ってテンプレートからEASTを生成
4. **再帰的展開**: 生成されたEASTに対して、さらにマクロ展開を適用

## 組み込みマクロ詳解

### 1. when マクロ

**用途**: elseのないif文を簡潔に書く

**使用例:**
```treep
when(x > 0) {
  println("x is positive")
}
```

**展開後:**
```treep
if (x > 0) {
  (() -> {
    println("x is positive")
  })()
}
```

**実装:**
```typescript
{
  name: 'when',
  pattern: '$cond, $body',
  expand: (args) => {
    const cond = args.get('cond')!;
    const body = args.get('body')!;

    return makeIf(
      cond,
      {
        kind: 'block',
        children: [
          makeCall('call', [body])
        ]
      }
    );
  }
}
```

### 2. assert マクロ

**用途**: アサーションチェック

**使用例:**
```treep
assert(x > 0)
```

**展開後:**
```treep
if (!(x > 0)) {
  error("Assertion failed")
}
```

**実装:**
```typescript
{
  name: 'assert',
  pattern: '$cond',
  expand: (args) => {
    const cond = args.get('cond')!;

    return makeIf(
      makeCall('unary_!', [cond]),
      {
        kind: 'block',
        children: [
          makeCall('error', [
            {
              kind: 'literal',
              attrs: [
                { key: 'type', value: 'String' },
                { key: 'value', value: 'Assertion failed' }
              ]
            }
          ])
        ]
      }
    );
  }
}
```

### 3. debug マクロ

**用途**: デバッグ情報の出力

**使用例:**
```treep
debug(x)
```

**展開後:**
```treep
println("Debug: " + toString(x))
```

### 4. log マクロ

**用途**: ロギング

**使用例:**
```treep
log("Processing started")
```

**展開後:**
```treep
println("[LOG] " + "Processing started")
```

### 5. trace マクロ

**用途**: 式の評価結果をトレース

**使用例:**
```treep
let result = trace(complexCalculation())
```

**展開後:**
```treep
let result = {
  let __trace_result = complexCalculation()
  println("Trace: " + toString(__trace_result))
  __trace_result
}
```

### 6. inc / dec マクロ

**用途**: インクリメント/デクリメント

**使用例:**
```treep
inc(counter)
dec(counter)
```

**展開後:**
```treep
counter = counter + 1
counter = counter - 1
```

### 7. ifZero マクロ

**用途**: 値がゼロかチェック

**使用例:**
```treep
ifZero(x) {
  println("x is zero")
}
```

**展開後:**
```treep
if (x == 0) {
  (() -> {
    println("x is zero")
  })()
}
```

### 8. ifPositive マクロ

**用途**: 値が正数かチェック

**使用例:**
```treep
ifPositive(x) {
  println("x is positive")
}
```

**展開後:**
```treep
if (x > 0) {
  (() -> {
    println("x is positive")
  })()
}
```

### 9. until マクロ

**用途**: 条件が真になるまでループ

**使用例:**
```treep
until(x >= 5) {
  x = x + 1
}
```

**展開後:**
```treep
while (!(x >= 5)) {
  (() -> {
    x = x + 1
  })()
}
```

## ブロック引数構文

### 問題

マクロに無名関数を渡すとき、通常は以下のように書きます：

```treep
when(x > 0, () -> {
  println("positive")
})
```

これは冗長で読みにくくなります。

### 解決策：ブロック引数構文

パーサーで `name(args) { block }` パターンを認識し、自動的に `name(args, () -> { block })` に変換します：

```treep
// 書く時
when(x > 0) {
  println("positive")
}

// パーサーが変換
when(x > 0, () -> {
  println("positive")
})
```

### 実装

**Parser:**
```typescript
private parseCall(): CSTNode {
  let expr = this.parsePrimary();

  while (this.match(TokenType.LPAREN)) {
    const args = this.parseArguments();
    this.consume(TokenType.RPAREN);

    // ブロック引数のチェック
    let blockArg: Block | undefined;
    if (this.check(TokenType.LBRACE)) {
      blockArg = this.parseBlock();
    }

    expr = {
      type: 'CallExpr',
      callee: expr.name,
      args,
      blockArg
    };
  }

  return expr;
}
```

**Normalizer:**
```typescript
private normalizeCallExpr(node: CallExpr): Element {
  let args = node.args.map(arg => this.normalizeNode(arg));

  // ブロック引数をラムダに変換
  if (node.blockArg) {
    const lambda: Element = {
      kind: 'lambda',
      children: [this.normalizeNode(node.blockArg)]
    };
    args.push(lambda);
  }

  return {
    kind: 'call',
    name: node.callee,
    children: args
  };
}
```

## ユーザー定義マクロ（将来的な拡張）

現在は組み込みマクロのみですが、将来的にはユーザー定義マクロもサポート予定です：

```treep
// マクロ定義構文（案）
macro swap {
  pattern: swap($a, $b)
  expand: {
    let temp = $a
    $a = $b
    $b = temp
  }
}

// 使用
let x = 1
let y = 2
swap(x, y)
```

## マクロ展開の実装

### MacroExpander クラス

```typescript
class MacroExpander {
  private macros: Map<string, MacroDefinition> = new Map();

  constructor() {
    // 組み込みマクロをロード
    for (const macro of builtinMacros) {
      this.macros.set(macro.name, macro);
    }
  }

  expand(elements: Element[]): Element[] {
    return elements.map(elem => this.expandElement(elem));
  }

  private expandElement(elem: Element): Element {
    // マクロ呼び出しチェック
    if (elem.kind === 'call' &&
        elem.name &&
        this.macros.has(elem.name)) {
      return this.expandMacroCall(elem);
    }

    // 子要素を再帰的に展開
    if (elem.children) {
      elem.children = elem.children.map(child =>
        this.expandElement(child)
      );
    }

    return elem;
  }

  private expandMacroCall(elem: Element): Element {
    const macro = this.macros.get(elem.name!)!;

    // パターンマッチング
    const args = this.matchPattern(macro.pattern, elem.children || []);

    // テンプレート展開
    const expanded = macro.expand(args);

    // 再帰的に展開
    return this.expandElement(expanded);
  }
}
```

## 衛生的マクロ

TreePのマクロは、変数捕捉を避けるために衛生的（hygienic）です。マクロ展開時に生成される一時変数は、自動的にユニークな名前が付けられます：

```treep
// traceマクロの展開で生成される変数
let __trace_result = expr
```

このアンダースコア2つで始まる変数名は、ユーザーコードでは使えないようにすることで、名前の衝突を防ぎます。

## まとめ

TreePのマクロシステムは：

1. **EAST形式**により、入力も出力も統一されたデータ構造
2. **パターンマッチング**で柔軟な引数マッチング
3. **テンプレート展開**で結果を生成
4. **ブロック引数構文**で可読性向上
5. **衛生的**で安全

これにより、強力で使いやすいマクロシステムを実現しています。
