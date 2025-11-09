# トランスデューサーシステム

## トランスデューサーとは

トランスデューサー（Transducer）は、ある木構造を別の木構造に変換するシステムです。TreePのトランスデューサーは、宣言的な変換ルールを使って、EAST形式の木構造を別の形式に変換できます。

## ユースケース

### 1. コード変換
- TreePコードを別の言語のコードに変換
- AST形式の変換（例：TreePのEAST → JavaScript AST）

### 2. リファクタリング
- 関数名の一括変更
- 構造の正規化

### 3. 最適化
- 冗長なノードの除去
- 式の簡約

### 4. コード生成
- テンプレートからのコード生成
- DSLのコンパイラ実装

## トランスデューサーの構成要素

### 1. パターン（Pattern）
入力木構造のマッチング条件を指定します。

```typescript
type Pattern =
  | { type: 'KindPattern'; kind: string; nameVar?: string;
      attrPatterns?: AttrPattern[]; childPatterns?: Pattern[] }
  | { type: 'VarPattern'; varName: string }
  | { type: 'AnyPattern' }
  | { type: 'ListPattern'; patterns: Pattern[]; restVar?: string };
```

### 2. テンプレート（Template）
出力木構造の生成方法を指定します。

```typescript
type Template =
  | { type: 'NodeTemplate'; kind: string; name?: TemplateExpr;
      attrs?: AttrTemplate[]; children?: Template[] }
  | { type: 'VarTemplate'; varName: string }
  | { type: 'LiteralTemplate'; value: string }
  | { type: 'ListTemplate'; templates: Template[] };
```

### 3. 変換ルール（TransformRule）
パターンとテンプレートのペアです。

```typescript
interface TransformRule {
  name: string;
  pattern: Pattern;
  template: Template;
  condition?: (bindings: Bindings) => boolean;
}
```

## 基本的な使い方

### 例1: ノードの種類を変更

**目的**: `def`ノードを`function`ノードに変換

```typescript
import { TransducerBuilder } from './transducer/transducer';

const transducer = new TransducerBuilder()
  .addRule({
    name: 'rename_def_to_function',
    pattern: {
      type: 'KindPattern',
      kind: 'def',
      nameVar: 'fname'
    },
    template: {
      type: 'NodeTemplate',
      kind: 'function',
      name: { type: 'Var', varName: 'fname' }
    }
  })
  .build('def_to_function');
```

**入力:**
```javascript
{
  kind: 'def',
  name: 'add',
  children: [...]
}
```

**出力:**
```javascript
{
  kind: 'function',
  name: 'add',
  children: [...]
}
```

### 例2: 子ノードも変換

**目的**: `param`ノードを`argument`ノードに変換

```typescript
const transducer = new TransducerBuilder()
  .addRule({
    name: 'rename_def_to_function',
    pattern: {
      type: 'KindPattern',
      kind: 'def',
      nameVar: 'fname'
    },
    template: {
      type: 'NodeTemplate',
      kind: 'function',
      name: { type: 'Var', varName: 'fname' }
    }
  })
  .addRule({
    name: 'rename_param_to_arg',
    pattern: {
      type: 'KindPattern',
      kind: 'param',
      nameVar: 'pname'
    },
    template: {
      type: 'NodeTemplate',
      kind: 'argument',
      name: { type: 'Var', varName: 'pname' }
    }
  })
  .build('transformer');

const outputTree = transducer.transform(inputTree);
```

トランスデューサーは**再帰的に子ノードも変換**します。

### 例3: 属性を使ったマッチング

**目的**: Int型のリテラルだけを変換

```typescript
const transducer = new TransducerBuilder()
  .addRule({
    name: 'extract_int_value',
    pattern: {
      type: 'KindPattern',
      kind: 'literal',
      attrPatterns: [
        { key: 'type', literal: 'Int' },  // 型がIntのみマッチ
        { key: 'value', valueVar: 'val' } // 値を変数に束縛
      ]
    },
    template: {
      type: 'NodeTemplate',
      kind: 'number',
      attrs: [
        { key: 'value', value: { type: 'Var', varName: 'val' } }
      ]
    }
  })
  .build('int_literal_transformer');
```

**入力:**
```javascript
{
  kind: 'literal',
  attrs: [
    { key: 'type', value: 'Int' },
    { key: 'value', value: '42' }
  ]
}
```

**出力:**
```javascript
{
  kind: 'number',
  attrs: [
    { key: 'value', value: '42' }
  ]
}
```

## パターンの種類

### KindPattern
特定の種類のノードにマッチします。

```typescript
{
  type: 'KindPattern',
  kind: 'def',              // kindが'def'のノードにマッチ
  nameVar: 'fname',         // nameを変数'fname'に束縛
  attrPatterns: [...],      // 属性のパターン（オプション）
  childPatterns: [...]      // 子要素のパターン（オプション）
}
```

### VarPattern
任意のノードにマッチし、変数に束縛します。

```typescript
{
  type: 'VarPattern',
  varName: 'anyNode'        // 任意のノードを'anyNode'に束縛
}
```

### AnyPattern
任意のノードにマッチしますが、束縛しません。

```typescript
{
  type: 'AnyPattern'        // マッチするだけ
}
```

### ListPattern
複数のノードにマッチします（将来の拡張）。

```typescript
{
  type: 'ListPattern',
  patterns: [...],          // 固定パターンのリスト
  restVar: 'rest'           // 残りのノードを'rest'に束縛
}
```

## テンプレートの種類

### NodeTemplate
新しいノードを生成します。

```typescript
{
  type: 'NodeTemplate',
  kind: 'function',
  name: { type: 'Var', varName: 'fname' },
  attrs: [
    { key: 'exported', value: { type: 'Literal', value: 'true' } }
  ],
  children: [
    { type: 'VarTemplate', varName: 'params' }
  ]
}
```

### VarTemplate
束縛された変数の値を展開します。

```typescript
{
  type: 'VarTemplate',
  varName: 'fname'          // 変数'fname'の値を展開
}
```

### LiteralTemplate
リテラル値を生成します。

```typescript
{
  type: 'LiteralTemplate',
  value: 'default'
}
```

### ListTemplate
複数のノードを生成します。

```typescript
{
  type: 'ListTemplate',
  templates: [
    { type: 'VarTemplate', varName: 'head' },
    { type: 'VarTemplate', varName: 'tail' }
  ]
}
```

## 実践例

### 例：TreeP → JavaScript変換

TreePの関数定義をJavaScript風の構造に変換します。

```typescript
const treepToJS = new TransducerBuilder()
  // def → function
  .addRule({
    name: 'def_to_function',
    pattern: {
      type: 'KindPattern',
      kind: 'def',
      nameVar: 'fname'
    },
    template: {
      type: 'NodeTemplate',
      kind: 'FunctionDeclaration',
      name: { type: 'Var', varName: 'fname' }
    }
  })
  // param → Identifier
  .addRule({
    name: 'param_to_identifier',
    pattern: {
      type: 'KindPattern',
      kind: 'param',
      nameVar: 'pname'
    },
    template: {
      type: 'NodeTemplate',
      kind: 'Identifier',
      name: { type: 'Var', varName: 'pname' }
    }
  })
  // var → Identifier
  .addRule({
    name: 'var_to_identifier',
    pattern: {
      type: 'KindPattern',
      kind: 'var',
      nameVar: 'vname'
    },
    template: {
      type: 'NodeTemplate',
      kind: 'Identifier',
      name: { type: 'Var', varName: 'vname' }
    }
  })
  // call → CallExpression
  .addRule({
    name: 'call_to_call_expr',
    pattern: {
      type: 'KindPattern',
      kind: 'call',
      nameVar: 'fname'
    },
    template: {
      type: 'NodeTemplate',
      kind: 'CallExpression',
      attrs: [
        { key: 'callee', value: { type: 'Var', varName: 'fname' } }
      ]
    }
  })
  .build('treep_to_js');

// 変換実行
const jsAST = treepToJS.transform(treepEAST);
```

### 例：最適化 - 定数畳み込み

```typescript
const optimizer = new TransducerBuilder()
  .addRule({
    name: 'fold_addition',
    pattern: {
      type: 'KindPattern',
      kind: 'call',
      nameVar: 'op',
      childPatterns: [
        {
          type: 'KindPattern',
          kind: 'literal',
          attrPatterns: [
            { key: 'type', literal: 'Int' },
            { key: 'value', valueVar: 'left' }
          ]
        },
        {
          type: 'KindPattern',
          kind: 'literal',
          attrPatterns: [
            { key: 'type', literal: 'Int' },
            { key: 'value', valueVar: 'right' }
          ]
        }
      ]
    },
    template: {
      type: 'NodeTemplate',
      kind: 'literal',
      attrs: [
        { key: 'type', value: { type: 'Literal', value: 'Int' } },
        {
          key: 'value',
          value: {
            type: 'Concat',
            parts: [
              // 実際には計算が必要
              { type: 'Var', varName: 'left' }
            ]
          }
        }
      ]
    },
    condition: (bindings) => {
      // 演算子が+の場合のみ
      return bindings.get('op') === '+';
    }
  })
  .build('constant_folder');
```

## 実装詳細

### PatternMatcher

パターンと要素をマッチングし、変数バインディングを返します。

```typescript
class PatternMatcher {
  match(pattern: Pattern, element: Element): Bindings | null {
    const bindings: Bindings = new Map();

    if (this.matchPattern(pattern, element, bindings)) {
      return bindings;
    }

    return null;
  }

  private matchPattern(
    pattern: Pattern,
    element: Element,
    bindings: Bindings
  ): boolean {
    switch (pattern.type) {
      case 'KindPattern':
        return this.matchKindPattern(pattern, element, bindings);
      case 'VarPattern':
        bindings.set(pattern.varName, element);
        return true;
      case 'AnyPattern':
        return true;
      default:
        return false;
    }
  }
}
```

### TemplateGenerator

テンプレートとバインディングから、新しい要素を生成します。

```typescript
class TemplateGenerator {
  generate(template: Template, bindings: Bindings): Element | Element[] {
    switch (template.type) {
      case 'NodeTemplate':
        return this.generateNode(template, bindings);
      case 'VarTemplate':
        return bindings.get(template.varName) as Element;
      case 'LiteralTemplate':
        return this.generateLiteral(template);
      case 'ListTemplate':
        return this.generateList(template, bindings);
    }
  }
}
```

### Transducer

ルールを適用して木を変換します。

```typescript
class Transducer {
  transform(element: Element): Element {
    // ルールを順番に試す
    for (const rule of this.rules) {
      const bindings = this.matcher.match(rule.pattern, element);

      if (bindings) {
        // 条件チェック
        if (rule.condition && !rule.condition(bindings)) {
          continue;
        }

        // 変換適用
        const result = this.generator.generate(rule.template, bindings);

        // 子要素を再帰的に変換
        if (result.children) {
          result.children = result.children.map(child =>
            this.transform(child)
          );
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

## まとめ

TreePのトランスデューサーシステムは：

1. **宣言的な変換ルール**で木構造を変換
2. **パターンマッチング**で入力を指定
3. **テンプレート**で出力を生成
4. **再帰的な変換**で子ノードも処理
5. **EAST形式**との親和性が高い

これにより、コンパイラ、トランスパイラ、リファクタリングツールなど、様々な木構造変換ツールを簡潔に実装できます。
