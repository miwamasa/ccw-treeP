# TreeP概要

## TreePとは

TreeP（Tree Processor）は、静的型を持った関数型プログラミング言語であり、抽象構文木を使ったマクロを簡単に定義できるプログラミング言語です。名前自体がLisp（List Processor）のもじりです。

## 主な特徴

### 1. Hindley-Milner型推論
TreePは、Standard MLやOCamlなどと同じ原理に基づく型推論システムを持っています。関数の引数や返り値の型を明示的に書かなくても、使用箇所から自動的に推論されます。

```treep
def add(x, y) {
  return x + y
}
// x と y は Int、返り値も Int と推論される
```

### 2. EAST（Element-based AST）
TreePの核心となるのが、EAST（Element AST）という中間表現です。すべてのノードが統一された構造を持つため、マクロの定義と展開が非常にシンプルになります。

XMLの要素モデルに似ていますが、TreeP専用に設計されています：

```typescript
interface Element {
  kind: string;                    // "def", "let", "call" など
  name?: string;                   // 識別子名
  attrs?: Attr[];                  // 属性（型情報など）
  children?: Element[];            // 子要素
  span?: SourceSpan;              // ソース位置
}
```

### 3. 強力なマクロシステム
EASTのおかげで、マクロが簡単に書けます。パターンマッチングと変数置換で実現される、衛生的なマクロシステムです。

```treep
// when マクロの定義例（組み込み）
when(x > 0) {
  println("x is positive")
}

// 内部的には if に展開される
```

### 4. 関数型プログラミング
- 第一級関数
- ラムダ式
- クロージャ
- イミュータブルな値（let束縛）

### 5. ブロック引数構文
マクロを使いやすくするために、ブロック引数構文を実装しています：

```treep
// ラムダ式を明示的に書かなくても
when(x > 0) {
  println("positive")
}

// 内部的には以下のように変換される
when(x > 0, () -> {
  println("positive")
})
```

## TreePの処理フロー

```
ソースコード
    ↓
  Lexer（字句解析）
    ↓
  Token列
    ↓
  Parser（構文解析）
    ↓
  CST（具象構文木）
    ↓
  Normalizer（正規化）
    ↓
  EAST（Element AST）
    ↓
  Macro Expansion（マクロ展開）
    ↓
  EAST（展開済み）
    ↓
  Type Checker（型検査）
    ↓
  型付きEAST
    ↓
  Interpreter（インタプリタ）
    ↓
  実行結果
```

## 設計思想

### 小さいメタ構文
XMLのような要素+属性モデルを採用することで、シンプルで拡張性の高いメタ構文を実現しています。

### 具象構文は普通に書ける
LispやXML系のプログラミング言語と違って、「具象構文は普通に見える」ことを重視しています。プログラマは通常のC風の構文でコードを書けます。

### 抽象構文木に対するマクロが簡単に作れる
EAST形式を挟むことで、Lispのようなマクロシステムを実現しつつ、見た目は普通のプログラミング言語になっています。

## 組み込みマクロ一覧

| マクロ | 用途 | 使用例 |
|-------|------|--------|
| `when` | elseなしif | `when(x > 0) { ... }` |
| `assert` | アサーション | `assert(x > 0)` |
| `debug` | デバッグ出力 | `debug(x)` |
| `log` | ロギング | `log("message")` |
| `trace` | トレーシング | `trace(func())` |
| `inc` | インクリメント | `inc(x)` |
| `dec` | デクリメント | `dec(x)` |
| `ifZero` | ゼロチェック | `ifZero(x) { ... }` |
| `ifPositive` | 正数チェック | `ifPositive(x) { ... }` |
| `until` | untilループ | `until(x >= 5) { ... }` |

## 応用：トランスデューサーシステム

TreePの応用として、ある木構造を別の木構造に変換するトランスデューサーシステムも実装されています。これにより、TreePを活用した宣言的な変換ルールから、木構造変換器を自動生成できます。

詳細は[トランスデューサーの説明](05_transducer.md)を参照してください。
