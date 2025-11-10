# Macro Tree Transducer チュートリアル

このチュートリアルでは、TreePのMacro Tree Transducerを段階的に学びます。

## 目次

1. [基本: 最初の変換ルール](#基本-最初の変換ルール)
2. [パターンマッチング](#パターンマッチング)
3. [テンプレート生成](#テンプレート生成)
4. [条件付き変換](#条件付き変換)
5. [DSLの使用](#dslの使用)
6. [複雑な変換](#複雑な変換)
7. [実践: AST最適化](#実践-ast最適化)

## 基本: 最初の変換ルール

### Step 1: ノードの種類を変更する

最も単純な変換から始めます。`def`ノードを`function`ノードに変換します。

```typescript
import { TransducerBuilder } from './src/index';

// Transducerを作成
const transducer = new TransducerBuilder()
  .addRule({
    name: 'rename_def',
    pattern: {
      type: 'KindPattern',
      kind: 'def',  // 'def'ノードにマッチ
      nameVar: 'fname'  // 名前を'fname'変数に束縛
    },
    template: {
      type: 'NodeTemplate',
      kind: 'function',  // 'function'ノードを生成
      name: { type: 'Var', varName: 'fname' }  // 束縛した名前を使用
    }
  })
  .build('renamer');

// 使用
const input = {
  kind: 'def',
  name: 'add'
};

const output = transducer.transform(input);
// => { kind: 'function', name: 'add' }
```

### Step 2: 子要素を含む変換

子要素も変換する場合：

```typescript
const transducer = new TransducerBuilder()
  .addRule({
    name: 'rename_def_with_children',
    pattern: {
      type: 'KindPattern',
      kind: 'def',
      nameVar: 'fname',
      childPatterns: [
        { type: 'ListPattern', restVar: 'children' }  // すべての子要素をキャプチャ
      ]
    },
    template: {
      type: 'NodeTemplate',
      kind: 'function',
      name: { type: 'Var', varName: 'fname' },
      children: [
        { type: 'ListTemplate', listVar: 'children' }  // 子要素を展開
      ]
    }
  })
  .build('renamer');

// 入力
const input = {
  kind: 'def',
  name: 'add',
  children: [
    { kind: 'param', name: 'x' },
    { kind: 'param', name: 'y' }
  ]
};

// 出力
// {
//   kind: 'function',
//   name: 'add',
//   children: [
//     { kind: 'param', name: 'x' },
//     { kind: 'param', name: 'y' }
//   ]
// }
```

## パターンマッチング

### 二項演算のマッチング

算術演算`x + y`のような二項演算をマッチ：

```typescript
const pattern = {
  type: 'KindPattern',
  kind: 'call',
  nameVar: 'op',  // 演算子名を束縛
  childPatterns: [
    { type: 'VarPattern', varName: 'left' },   // 左辺
    { type: 'VarPattern', varName: 'right' }   // 右辺
  ]
};

// このパターンは以下にマッチ:
// { kind: 'call', name: '+', children: [x, y] }
// { kind: 'call', name: '*', children: [a, b] }
// 等
```

### ネストしたパターン

`!(!x)`のようなネストした構造：

```typescript
const pattern = {
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
};

// { kind: 'call', name: '!', children: [
//   { kind: 'call', name: '!', children: [x] }
// ]}
// にマッチし、innerの'x'を'expr'に束縛
```

## テンプレート生成

### 新しいノードの生成

マッチしたデータから新しいノードを作成：

```typescript
const template = {
  type: 'NodeTemplate',
  kind: 'optimized_add',
  name: { type: 'Literal', value: 'fast_add' },
  children: [
    { type: 'VarTemplate', varName: 'left' },
    { type: 'VarTemplate', varName: 'right' }
  ]
};

// 入力: left = {kind: 'var', name: 'x'}
//       right = {kind: 'var', name: 'y'}
//
// 出力: {
//   kind: 'optimized_add',
//   name: 'fast_add',
//   children: [
//     { kind: 'var', name: 'x' },
//     { kind: 'var', name: 'y' }
//   ]
// }
```

### リストの展開

複数の子要素を展開：

```typescript
const template = {
  type: 'NodeTemplate',
  kind: 'block',
  children: [
    { type: 'LiteralTemplate', value: 'start' },
    { type: 'ListTemplate', listVar: 'body' },  // 複数の文を展開
    { type: 'LiteralTemplate', value: 'end' }
  ]
};

// body = [stmt1, stmt2, stmt3]
//
// 出力:
// {
//   kind: 'block',
//   children: [
//     'start',
//     stmt1,
//     stmt2,
//     stmt3,
//     'end'
//   ]
// }
```

## 条件付き変換

### 値に基づく条件

特定の値の場合のみ変換：

```typescript
const rule = {
  name: 'optimize_add_zero',
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
    // 演算子が'+'で、右辺が0の場合のみ
    const op = bindings.get('op');
    const right = bindings.get('right') as Element;

    return op === '+' &&
           right.kind === 'literal' &&
           right.attrs?.find(a => a.key === 'value')?.value === '0';
  },
  template: {
    type: 'VarTemplate',
    varName: 'left'  // 左辺だけを返す
  }
};

// x + 0 => x
// x + 1 => x + 1 (変換されない)
```

### 複数条件の組み合わせ

```typescript
condition: (bindings) => {
  const op = bindings.get('op') as string;
  const left = bindings.get('left') as Element;
  const right = bindings.get('right') as Element;

  // (1) 演算子が'*'
  // (2) 両辺のどちらかが0
  return op === '*' && (
    (left.kind === 'literal' && left.attrs?.find(a => a.key === 'value')?.value === '0') ||
    (right.kind === 'literal' && right.attrs?.find(a => a.key === 'value')?.value === '0')
  );
}

// 0 * x => 0
// x * 0 => 0
```

## DSLの使用

### TransformRuleBuilderの基本

より読みやすい構文：

```typescript
import { TransformRuleBuilder, isLiteral } from './src/index';

const rule = new TransformRuleBuilder()
  .setName('add_zero')
  .matchBinaryOp('+')  // 二項演算'+'をマッチ
  .when(bindings => isLiteral(bindings.get('right') as Element, '0'))
  .generateVar('left')
  .build();
```

上記は以下と同等ですが、より簡潔：

```typescript
const rule = {
  name: 'add_zero',
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
    const op = bindings.get('op');
    const right = bindings.get('right') as Element;
    return op === '+' &&
           right.kind === 'literal' &&
           right.attrs?.find(a => a.key === 'value')?.value === '0';
  },
  template: {
    type: 'VarTemplate',
    varName: 'left'
  }
};
```

### ヘルパー関数の活用

```typescript
import { isLiteral, isVar, makeLiteral } from './src/index';

// リテラルチェック
if (isLiteral(elem, '0')) {
  // elem は 0
}

// 変数チェック
if (isVar(elem, 'x')) {
  // elem は変数x
}

// リテラル生成
const zero = makeLiteral('Int', '0');
// => { kind: 'literal', attrs: [
//      { key: 'type', value: 'Int' },
//      { key: 'value', value: '0' }
//    ]}
```

## 複雑な変換

### 例1: 定数畳み込み（Constant Folding）

```typescript
const constantFolder = new TransducerBuilder()
  .addRule({
    name: 'fold_add',
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
      const op = bindings.get('op');
      const left = bindings.get('left') as Element;
      const right = bindings.get('right') as Element;

      if (op !== '+' || !isLiteral(left) || !isLiteral(right)) {
        return false;
      }

      // 計算を実行
      const leftVal = parseInt(left.attrs!.find(a => a.key === 'value')!.value);
      const rightVal = parseInt(right.attrs!.find(a => a.key === 'value')!.value);
      const result = leftVal + rightVal;

      // 結果をbindingsに保存
      bindings.set('result', makeLiteral('Int', result.toString()));
      return true;
    },
    template: {
      type: 'VarTemplate',
      varName: 'result'
    }
  })
  .build('constant_folder');

// 2 + 3 => 5
// 10 + 20 => 30
```

### 例2: デッドコード除去

```typescript
const deadCodeEliminator = new TransducerBuilder()
  .addRule({
    name: 'eliminate_if_false',
    pattern: {
      type: 'KindPattern',
      kind: 'if',
      childPatterns: [
        { type: 'VarPattern', varName: 'cond' },
        { type: 'VarPattern', varName: 'then' },
        { type: 'VarPattern', varName: 'else' }
      ]
    },
    condition: (bindings) => {
      const cond = bindings.get('cond') as Element;
      return cond.kind === 'condition' &&
             cond.children?.[0]?.kind === 'literal' &&
             cond.children[0].attrs?.find(a => a.key === 'value')?.value === 'false';
    },
    template: {
      type: 'VarTemplate',
      varName: 'else'  // else節だけを残す
    }
  })
  .addRule({
    name: 'eliminate_if_true',
    pattern: {
      type: 'KindPattern',
      kind: 'if',
      childPatterns: [
        { type: 'VarPattern', varName: 'cond' },
        { type: 'VarPattern', varName: 'then' },
        { type: 'VarPattern', varName: 'else' }
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
      varName: 'then'  // then節だけを残す
    }
  })
  .build('dead_code_eliminator');

// if (false) { a } else { b } => b
// if (true) { a } else { b } => a
```

## 実践: AST最適化

### 完全な最適化パイプライン

```typescript
import {
  TransducerBuilder,
  TransformRuleBuilder,
  isLiteral,
  makeLiteral
} from './src/index';

// 1. 算術最適化
const arithmeticOptimizer = new TransducerBuilder()
  .addRule(new TransformRuleBuilder()
    .setName('add_zero_right')
    .matchBinaryOp('+')
    .when(bindings => isLiteral(bindings.get('right') as Element, '0'))
    .generateVar('left')
    .build())
  .addRule(new TransformRuleBuilder()
    .setName('add_zero_left')
    .matchBinaryOp('+')
    .when(bindings => isLiteral(bindings.get('left') as Element, '0'))
    .generateVar('right')
    .build())
  .addRule(new TransformRuleBuilder()
    .setName('mul_one')
    .matchBinaryOp('*')
    .when(bindings =>
      isLiteral(bindings.get('right') as Element, '1') ||
      isLiteral(bindings.get('left') as Element, '1')
    )
    .generateVar('left')  // 簡略化のため左を返す
    .build())
  .addRule(new TransformRuleBuilder()
    .setName('mul_zero')
    .matchBinaryOp('*')
    .when(bindings =>
      isLiteral(bindings.get('left') as Element, '0') ||
      isLiteral(bindings.get('right') as Element, '0')
    )
    .generateLiteral('0')
    .build())
  .build('arithmetic_optimizer');

// 2. 論理最適化
const logicOptimizer = new TransducerBuilder()
  .addRule({
    name: 'double_negation',
    pattern: {
      type: 'KindPattern',
      kind: 'call',
      nameVar: 'op1',
      childPatterns: [{
        type: 'KindPattern',
        kind: 'call',
        nameVar: 'op2',
        childPatterns: [{ type: 'VarPattern', varName: 'expr' }]
      }]
    },
    condition: (bindings) =>
      bindings.get('op1') === 'unary_!' &&
      bindings.get('op2') === 'unary_!',
    template: { type: 'VarTemplate', varName: 'expr' }
  })
  .build('logic_optimizer');

// 3. Fixpoint変換
class FixpointTransducer {
  constructor(private transducer: any, private maxIterations = 10) {}

  transform(tree: Element): Element {
    let current = tree;
    for (let i = 0; i < this.maxIterations; i++) {
      const next = this.transducer.transform(current);
      if (JSON.stringify(next) === JSON.stringify(current)) {
        console.log(`Fixpoint reached after ${i} iterations`);
        return current;
      }
      current = next;
    }
    return current;
  }
}

// 4. パイプライン構築
class TransducerPipeline {
  private transducers: any[] = [];

  add(t: any): this {
    this.transducers.push(t);
    return this;
  }

  transform(tree: Element): Element {
    return this.transducers.reduce(
      (acc, t) => t.transform(acc),
      tree
    );
  }
}

// 5. 統合
const fullOptimizer = new TransducerPipeline()
  .add(new FixpointTransducer(arithmeticOptimizer))
  .add(logicOptimizer);

// 6. 使用
const complexExpression = parseExpression("((!(!x)) + 0) * 1");
const optimized = fullOptimizer.transform(complexExpression);
// => x

console.log('Original:', complexExpression);
console.log('Optimized:', optimized);
```

### TreePとの統合

TreePプログラム全体を最適化：

```typescript
import { TreeP } from './src/index';

const source = `
def compute(x) {
  return ((x + 0) * 1) + 0
}

def main() returns: Int {
  let result = compute(42)
  println(result)
  return 0
}
`;

// 1. TreePで解析
const treep = new TreeP(source);
const ast = treep.getEAST();

// 2. 最適化
const optimizedAst = fullOptimizer.transform(ast);

// 3. 最適化後のコードを実行
// (新しいInterpreterで実行)
```

## まとめ

このチュートリアルで学んだこと：

1. **基本変換**: ノードの種類変更、子要素の処理
2. **パターンマッチング**: 二項演算、ネスト構造
3. **テンプレート**: 新規ノード生成、リスト展開
4. **条件**: 値ベースの条件、複雑な条件
5. **DSL**: TransformRuleBuilder、ヘルパー関数
6. **実践**: 定数畳み込み、デッドコード除去、パイプライン

次のステップ：
- `examples/macro_tree_transducer.ts` - 実践例
- `examples/advanced_transducer.ts` - 高度な使用例
- `docs/MACRO_TREE_TRANSDUCER.md` - 詳細リファレンス
