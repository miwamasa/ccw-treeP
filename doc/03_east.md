# EAST（Element-based AST）詳細

## EASTとは

EAST（Element AST）は、TreePの核心となる中間表現です。すべてのノードが統一された`Element`構造を持つことで、マクロ展開や木構造変換を簡潔に記述できます。

## Element構造

```typescript
interface Element {
  kind: string;                    // ノードの種類
  name?: string;                   // 識別子名（オプション）
  attrs?: Attr[];                  // 属性リスト（オプション）
  children?: Element[];            // 子要素リスト（オプション）
  span?: SourceSpan;              // ソース位置情報（オプション）
}

interface Attr {
  key: string;                     // 属性名
  value: string;                   // 属性値
}
```

## kindの種類

### 定義系
- `def`: 関数定義
- `let`: 変数束縛
- `macro`: マクロ定義
- `param`: パラメータ

### 制御構文
- `if`: if式
- `while`: whileループ
- `for`: forループ
- `return`: return文

### 式
- `call`: 関数呼び出し
- `var`: 変数参照
- `literal`: リテラル値
- `lambda`: ラムダ式
- `block`: ブロック

### その他
- `condition`: 条件式（ifやwhileの条件部）
- `from`, `to`: forループの範囲指定

## TreePコード→EAST変換例

### 例1: 単純な関数定義

**TreePコード:**
```treep
def add(a, b) {
  return a + b
}
```

**EAST表現:**
```javascript
{
  kind: "def",
  name: "add",
  children: [
    { kind: "param", name: "a" },
    { kind: "param", name: "b" },
    {
      kind: "block",
      children: [
        {
          kind: "return",
          children: [
            {
              kind: "call",
              name: "+",
              children: [
                { kind: "var", name: "a" },
                { kind: "var", name: "b" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### 例2: 型注釈付き関数

**TreePコード:**
```treep
def add(a: Int, b: Int) returns: Int {
  return a + b
}
```

**EAST表現:**
```javascript
{
  kind: "def",
  name: "add",
  attrs: [
    { key: "a", value: "Int" },
    { key: "b", value: "Int" },
    { key: "returns", value: "Int" }
  ],
  children: [
    {
      kind: "param",
      name: "a",
      attrs: [{ key: "type", value: "Int" }]
    },
    {
      kind: "param",
      name: "b",
      attrs: [{ key: "type", value: "Int" }]
    },
    {
      kind: "block",
      children: [
        {
          kind: "return",
          children: [
            {
              kind: "call",
              name: "+",
              children: [
                { kind: "var", name: "a" },
                { kind: "var", name: "b" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### 例3: if式

**TreePコード:**
```treep
if (x > 0) {
  return 1
} else {
  return 0
}
```

**EAST表現:**
```javascript
{
  kind: "if",
  children: [
    {
      kind: "condition",
      children: [
        {
          kind: "call",
          name: ">",
          children: [
            { kind: "var", name: "x" },
            {
              kind: "literal",
              attrs: [
                { key: "type", value: "Int" },
                { key: "value", value: "0" }
              ]
            }
          ]
        }
      ]
    },
    {
      kind: "block",
      children: [
        {
          kind: "return",
          children: [
            {
              kind: "literal",
              attrs: [
                { key: "type", value: "Int" },
                { key: "value", value: "1" }
              ]
            }
          ]
        }
      ]
    },
    {
      kind: "block",
      children: [
        {
          kind: "return",
          children: [
            {
              kind: "literal",
              attrs: [
                { key: "type", value: "Int" },
                { key: "value", value: "0" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### 例4: let束縛

**TreePコード:**
```treep
let x = 42
```

**EAST表現:**
```javascript
{
  kind: "let",
  name: "x",
  children: [
    {
      kind: "literal",
      attrs: [
        { key: "type", value: "Int" },
        { key: "value", value: "42" }
      ]
    }
  ]
}
```

## EASTの利点

### 1. 統一されたデータ構造
すべてのノードが同じ`Element`型なので、パターンマッチングや変換処理が書きやすくなります。

### 2. 拡張性
新しいノード種類を追加するには、`kind`の値を増やすだけです。構造は変わりません。

### 3. マクロとの相性
マクロは「EAST → EAST」の変換として実装されます。入力も出力も同じ`Element`型なので、マクロ展開を繰り返し適用できます。

### 4. 木構造変換との親和性
トランスデューサーシステムは、EASTのパターンマッチングとテンプレート生成を使って、宣言的な変換ルールを記述できます。

## C-EAST（Concrete EAST）

EASTをそのままテキストで書くのは冗長なので、プログラマ向けにC-EAST（Concrete EAST）という形式も用意されています：

**C-EAST:**
```
def name="add" a="Int" b="Int" returns="Int" {
  param name="a"
  param name="b"
  block {
    return {
      call name="+" {
        var name="a"
        var name="b"
      }
    }
  }
}
```

C-EASTは、XMLライクな構文でEASTを表現したものです。より読みやすく、手で編集することも可能です。

## EAST処理の実装

### Normalizer（CST→EAST変換）

```typescript
class Normalizer {
  normalize(nodes: CSTNode[]): Element[] {
    return nodes.map(node => this.normalizeNode(node));
  }

  private normalizeNode(node: CSTNode): Element {
    switch (node.type) {
      case 'FunctionDef':
        return this.normalizeFunctionDef(node);
      case 'CallExpr':
        return this.normalizeCallExpr(node);
      // ...
    }
  }
}
```

### Macro Expander（EAST→EAST変換）

```typescript
class MacroExpander {
  expand(elements: Element[]): Element[] {
    return elements.map(elem => this.expandElement(elem));
  }

  private expandElement(elem: Element): Element {
    // マクロ呼び出しをチェック
    if (elem.kind === 'call' && this.isMacro(elem.name)) {
      return this.expandMacro(elem);
    }

    // 子要素を再帰的に展開
    if (elem.children) {
      elem.children = elem.children.map(child =>
        this.expandElement(child)
      );
    }

    return elem;
  }
}
```

## まとめ

EASTは、TreePの中核となる設計です。統一された構造により：

- マクロシステムがシンプルに実装できる
- 木構造変換が宣言的に記述できる
- 型検査や最適化などのパスを追加しやすい
- 拡張性が高い

この設計により、TreePは「普通に見える具象構文」と「強力なメタプログラミング」を両立しています。
