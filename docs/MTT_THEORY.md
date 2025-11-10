# Macro Tree Transducer (MTT) 理論と実装

## MTTとは

**Macro Tree Transducer (MTT)** は、木構造を入力として別の木構造を生成するトップダウン型の変換器に、**パラメータ（累積引数）**を持たせた拡張モデルです。

### 基本概念

通常のTree Transducerとの違い：
- **通常のTransducer**: `q(tree) → output`
- **MTT**: `q(tree, param1, param2, ...) → output`

パラメータにより：
- コンテキスト情報の伝播
- 累積計算（アキュムレータパターン）
- より強力な表現力

## 形式的定義（簡略版）

MTTは以下の要素で定義されます：

```
MTT = (Q, Σ, Q₀, R)

Q  = 有限の関数名（状態）集合。各関数qはパラメータ数kを持つ
Σ  = 入出力の記号集合（記号には順位/子ノード数がある）
Q₀ = 初期関数集合
R  = 変換規則の集合
```

### 変換規則の形式

```
q(σ(x₁,...,xₙ), y₁,...,yₖ) → t

ここで:
- q: 関数名（状態）
- σ: 入力記号
- x₁,...,xₙ: 入力木の子ノード
- y₁,...,yₖ: パラメータ
- t: 出力（記号、パラメータ、関数呼び出しの組み合わせ）
```

## TreePでの実装

TreePのTransducerシステムを拡張してMTTを実現します。

### パラメータ化Transducerの実装

```typescript
/**
 * パラメータ化されたTransducer
 * MTTの概念を実装
 */
class ParameterizedTransducer {
  constructor(
    private rules: ParameterizedRule[],
    private name: string
  ) {}

  /**
   * パラメータ付きで変換を実行
   */
  transform(tree: Element, ...params: any[]): Element {
    for (const rule of this.rules) {
      // パターンマッチング
      const bindings = this.match(rule.pattern, tree);

      if (bindings) {
        // 条件チェック
        if (rule.condition && !rule.condition(bindings, params)) {
          continue;
        }

        // パラメータをbindingsに追加
        params.forEach((param, i) => {
          bindings.set(`param${i}`, param);
        });

        // テンプレート生成
        return this.generate(rule.template, bindings, params);
      }
    }

    // デフォルト処理
    return tree;
  }

  private generate(
    template: any,
    bindings: Map<string, any>,
    params: any[]
  ): Element {
    // テンプレートタイプに応じた生成
    if (template.type === 'RecursiveCall') {
      // 再帰呼び出し: q(x, params...)
      const child = bindings.get(template.childVar) as Element;
      const newParams = template.params.map((p: any) =>
        this.evalParam(p, bindings, params)
      );
      return this.transform(child, ...newParams);
    }

    // 通常のテンプレート生成
    // ... (既存の実装を使用)
  }

  private evalParam(paramExpr: any, bindings: Map<string, any>, params: any[]): any {
    if (paramExpr.type === 'Param') {
      return params[paramExpr.index];
    }
    if (paramExpr.type === 'RecursiveCall') {
      const child = bindings.get(paramExpr.childVar) as Element;
      const newParams = paramExpr.params.map((p: any) =>
        this.evalParam(p, bindings, params)
      );
      return this.transform(child, ...newParams);
    }
    // その他の式評価
    return paramExpr;
  }
}

interface ParameterizedRule {
  name: string;
  pattern: Pattern;
  params: number;  // パラメータの数
  condition?: (bindings: Map<string, any>, params: any[]) => boolean;
  template: any;
}
```

## 例1: 単純なコピー（パラメータなし）

### 仕様

入力木と同じ構造の木を生成する最も基本的な変換。

```
入力アルファベット: a(·,·), b(·,·), e()
状態: q (パラメータ数 = 0)

ルール:
  q(a(x₁,x₂)) → a(q(x₁), q(x₂))
  q(b(x₁,x₂)) → b(q(x₁), q(x₂))
  q(e())      → e()
```

### TreePでの実装

```typescript
import { TransducerBuilder } from './src/index';

// 例1: 単純コピー
const copyMTT = new TransducerBuilder()
  // a(x1, x2) → a(copy(x1), copy(x2))
  .addRule({
    name: 'copy_a',
    pattern: {
      type: 'KindPattern',
      kind: 'a',
      childPatterns: [
        { type: 'VarPattern', varName: 'x1' },
        { type: 'VarPattern', varName: 'x2' }
      ]
    },
    template: {
      type: 'NodeTemplate',
      kind: 'a',
      children: [
        { type: 'VarTemplate', varName: 'x1' },  // 再帰的に変換される
        { type: 'VarTemplate', varName: 'x2' }
      ]
    }
  })
  // b(x1, x2) → b(copy(x1), copy(x2))
  .addRule({
    name: 'copy_b',
    pattern: {
      type: 'KindPattern',
      kind: 'b',
      childPatterns: [
        { type: 'VarPattern', varName: 'x1' },
        { type: 'VarPattern', varName: 'x2' }
      ]
    },
    template: {
      type: 'NodeTemplate',
      kind: 'b',
      children: [
        { type: 'VarTemplate', varName: 'x1' },
        { type: 'VarTemplate', varName: 'x2' }
      ]
    }
  })
  // e() → e()
  .addRule({
    name: 'copy_leaf',
    pattern: {
      type: 'KindPattern',
      kind: 'e'
    },
    template: {
      type: 'NodeTemplate',
      kind: 'e'
    }
  })
  .build('copy_mtt');

// 使用例
const input = {
  kind: 'a',
  children: [
    {
      kind: 'b',
      children: [
        { kind: 'e' },
        { kind: 'e' }
      ]
    },
    { kind: 'e' }
  ]
};

const output = copyMTT.transform(input);
// 結果: 入力と同じ構造
```

### 実行トレース

```
入力: a(b(e(), e()), e())

q(a(b(e(), e()), e()))
  → a(q(b(e(), e())), q(e()))
    → a(b(q(e()), q(e())), e())
      → a(b(e(), e()), e())

出力: a(b(e(), e()), e())  // 入力と同一
```

## 例2: 葉を右結合リストに平坦化（パラメータあり）

### 仕様

二分木の葉を左から右へ走査して、右結合のconsリストに変換。

```
入力: a(·,·), b(·,·), e() (二分木)
出力: cons(·,·), nil (リスト)
状態: q (パラメータ数 = 1)  ← 累積リストを表すパラメータy

ルール (初期呼び出し: q(root, nil)):
  q(a(x₁,x₂), y) → q(x₁, q(x₂, y))
  q(b(x₁,x₂), y) → q(x₁, q(x₂, y))
  q(e(), y)      → cons(e(), y)
```

### パラメータの役割

パラメータ`y`は「右側の部分木を処理した結果のリスト」を表します：
- 右の子から処理して結果を`y`に累積
- 左の子を処理するときに累積結果を渡す
- 葉に到達したら、葉を累積リストの先頭に追加

### TreePでの実装

```typescript
/**
 * パラメータ化されたTransducerビルダー
 */
class ParameterizedTransducerBuilder {
  private rules: any[] = [];

  addRule(rule: {
    name: string;
    pattern: Pattern;
    paramCount: number;
    generator: (bindings: Map<string, any>, params: any[], transform: Function) => any;
  }): this {
    this.rules.push(rule);
    return this;
  }

  build(): ParameterizedTransducer {
    return new ParameterizedTransducer(this.rules);
  }
}

// 例2: 葉の平坦化
const flattenMTT = new ParameterizedTransducerBuilder()
  // q(a(x1, x2), y) → q(x1, q(x2, y))
  .addRule({
    name: 'flatten_a',
    pattern: {
      type: 'KindPattern',
      kind: 'a',
      childPatterns: [
        { type: 'VarPattern', varName: 'x1' },
        { type: 'VarPattern', varName: 'x2' }
      ]
    },
    paramCount: 1,
    generator: (bindings, [y], transform) => {
      const x1 = bindings.get('x1') as Element;
      const x2 = bindings.get('x2') as Element;

      // q(x1, q(x2, y))
      const rightResult = transform(x2, y);
      return transform(x1, rightResult);
    }
  })
  // q(b(x1, x2), y) → q(x1, q(x2, y))
  .addRule({
    name: 'flatten_b',
    pattern: {
      type: 'KindPattern',
      kind: 'b',
      childPatterns: [
        { type: 'VarPattern', varName: 'x1' },
        { type: 'VarPattern', varName: 'x2' }
      ]
    },
    paramCount: 1,
    generator: (bindings, [y], transform) => {
      const x1 = bindings.get('x1') as Element;
      const x2 = bindings.get('x2') as Element;

      // q(x1, q(x2, y))
      const rightResult = transform(x2, y);
      return transform(x1, rightResult);
    }
  })
  // q(e(), y) → cons(e(), y)
  .addRule({
    name: 'flatten_leaf',
    pattern: {
      type: 'KindPattern',
      kind: 'e'
    },
    paramCount: 1,
    generator: (bindings, [y], transform) => {
      // cons(e(), y)
      return {
        kind: 'cons',
        children: [
          { kind: 'e' },
          y
        ]
      };
    }
  })
  .build();

// 使用例
const input = {
  kind: 'a',
  children: [
    {
      kind: 'b',
      children: [
        { kind: 'e' },
        { kind: 'e' }
      ]
    },
    { kind: 'e' }
  ]
};

const nil = { kind: 'nil' };
const output = flattenMTT.transform(input, nil);

// 結果:
// cons(e(), cons(e(), cons(e(), nil)))
```

### 実行トレース（ステップバイステップ）

```
入力: a(b(e(), e()), e())
初期呼び出し: q(a(b(e(), e()), e()), nil)

ステップ1: a規則適用
  q(a(b(e(), e()), e()), nil)
  → q(b(e(), e()), q(e(), nil))

ステップ2: 右側のq(e(), nil)を評価
  q(e(), nil)
  → cons(e(), nil)

ステップ3: 左側のq(b(e(), e()), cons(e(), nil))を評価
  q(b(e(), e()), cons(e(), nil))
  → q(e(), q(e(), cons(e(), nil)))

ステップ4: 内側のq(e(), cons(e(), nil))を評価
  q(e(), cons(e(), nil))
  → cons(e(), cons(e(), nil))

ステップ5: 外側のq(e(), cons(e(), cons(e(), nil)))を評価
  q(e(), cons(e(), cons(e(), nil)))
  → cons(e(), cons(e(), cons(e(), nil)))

最終結果: cons(e(), cons(e(), cons(e(), nil)))
```

### 視覚化

```
入力木:
     a
    / \
   b   e
  / \
 e   e

処理順序（右から左へ）:
1. 最右の e → cons(e(), nil)
2. b の右子 e → cons(e(), cons(e(), nil))
3. b の左子 e → cons(e(), cons(e(), cons(e(), nil)))

出力リスト:
cons → e
  cons → e
    cons → e
      nil
```

## TreePでの完全実装

実際に動作する完全なコード例：

```typescript
import { Element } from './src/ast/types';

/**
 * シンプルなMTT実装
 */
class SimpleMTT {
  private rules: Map<string, (elem: Element, params: any[]) => Element> = new Map();

  addRule(kind: string, handler: (elem: Element, params: any[]) => Element): this {
    this.rules.set(kind, handler);
    return this;
  }

  transform(elem: Element, ...params: any[]): Element {
    const handler = this.rules.get(elem.kind);
    if (handler) {
      return handler.call(this, elem, params);
    }
    // デフォルト: そのまま返す
    return elem;
  }
}

// 例2の完全実装
const flattenMTT = new SimpleMTT()
  .addRule('a', function(elem, [accumulator]) {
    const [x1, x2] = elem.children!;
    // q(x1, q(x2, y))
    const rightResult = this.transform(x2, accumulator);
    return this.transform(x1, rightResult);
  })
  .addRule('b', function(elem, [accumulator]) {
    const [x1, x2] = elem.children!;
    // q(x1, q(x2, y))
    const rightResult = this.transform(x2, accumulator);
    return this.transform(x1, rightResult);
  })
  .addRule('e', function(elem, [accumulator]) {
    // cons(e(), y)
    return {
      kind: 'cons',
      children: [
        { kind: 'e' },
        accumulator
      ]
    };
  });

// テスト
const testTree = {
  kind: 'a',
  children: [
    {
      kind: 'b',
      children: [
        { kind: 'e' },
        { kind: 'e' }
      ]
    },
    { kind: 'e' }
  ]
};

const result = flattenMTT.transform(testTree, { kind: 'nil' });
console.log(JSON.stringify(result, null, 2));
```

## 例3: 家系図変換（マルチステートMTT）

この例は、複数の状態（q0, q, qid）を持つMTTの典型例です。家系図の構造を、性別タグ付きのメンバーリストに変換し、姓を継承させます。

### 入力木

```
Family(
  lastName(March),
  m-list(
    father(Jim),
    m-list(
      mother(Cindy),
      m-list(
        daughter(Brenda),
        e
      )
    )
  )
)
```

### MTTルール

```
<q0, Family>        -> <q, x2>( <q, x1> )
<q, m-list>(y)      -> o( <q, x1>(y), <q, x2>(y) )
<q, father>(y)      -> Male( <qid, x1>, y )
<q, mother>(y)      -> Female( <qid, x1>, y )
<q, son>(y)         -> Male( <qid, x1>, y )
<q, daughter>(y)    -> Female( <qid, x1>, y )
<q, e>(y)           -> e
<qid, identifier>   -> identifier_value
```

### 状態の説明

- **q0**: 初期状態。Familyノードを処理し、lastNameを抽出してメンバーリスト処理を開始
- **q**: メインの変換状態。パラメータyとして姓を受け取り、各メンバーに伝播
- **qid**: 識別子抽出状態。名前（identifier）の値を取得

### 実行トレース

```
ステップ1: <q0, Family(lastName(March), m-list(...))>
  → x1 = lastName(March), x2 = m-list(...)
  → <q, m-list(...)>( <qid, identifier(March)> )
  → 姓を抽出: March
  → <q, m-list(...)>(March)

ステップ2: <q, m-list(father(Jim), m-list(...))>(March)
  → x1 = father(Jim), x2 = m-list(...)
  → o( <q, father(Jim)>(March), <q, m-list(...)>(March) )

ステップ3: <q, father(Jim)>(March)
  → x1 = identifier(Jim)
  → Male( <qid, identifier(Jim)>, March )
  → Male( Jim, March )

ステップ4: <q, m-list(mother(Cindy), m-list(...))>(March)
  → x1 = mother(Cindy), x2 = m-list(...)
  → o( <q, mother(Cindy)>(March), <q, m-list(...)>(March) )

ステップ5: <q, mother(Cindy)>(March)
  → x1 = identifier(Cindy)
  → Female( <qid, identifier(Cindy)>, March )
  → Female( Cindy, March )

ステップ6: <q, m-list(daughter(Brenda), e)>(March)
  → x1 = daughter(Brenda), x2 = e
  → o( <q, daughter(Brenda)>(March), <q, e>(March) )

ステップ7: <q, daughter(Brenda)>(March)
  → x1 = identifier(Brenda)
  → Female( <qid, identifier(Brenda)>, March )
  → Female( Brenda, March )

ステップ8: <q, e>(March)
  → e

最終結果:
o(
  Male(March, Jim),
  o(
    Female(March, Cindy),
    o(
      Female(March, Brenda),
      e
    )
  )
)
```

### 出力木

```
o(
  Male(March, Jim),
  o(
    Female(March, Cindy),
    o(
      Female(March, Brenda),
      e
    )
  )
)
```

### TreePでの実装

```typescript
class StatefulMTT {
  private rules: Map<string, Map<string, (elem: Element, params: any[]) => Element>>;

  addRule(state: string, kind: string, handler: (elem: Element, params: any[]) => Element): this {
    if (!this.rules.has(state)) {
      this.rules.set(state, new Map());
    }
    this.rules.get(state)!.set(kind, handler);
    return this;
  }

  transform(state: string, elem: Element, ...params: any[]): Element {
    const stateRules = this.rules.get(state);
    if (!stateRules) {
      throw new Error(`No rules defined for state: ${state}`);
    }
    const handler = stateRules.get(elem.kind);
    if (!handler) {
      throw new Error(`No rule defined for state '${state}' and kind '${elem.kind}'`);
    }
    return handler(elem, params);
  }
}

// ルールの定義
const familyMTT = new StatefulMTT();

// <q0, Family> -> <q, x2>( <q, x1> )
familyMTT.addRule('q0', 'Family', (elem, params) => {
  const [lastNameNode, memberListNode] = elem.children!;
  const lastName = familyMTT.transform('qid', lastNameNode.children![0]);
  return familyMTT.transform('q', memberListNode, lastName.name);
});

// <q, m-list>(y) -> o( <q, x1>(y), <q, x2>(y) )
familyMTT.addRule('q', 'm-list', (elem, params) => {
  const [lastName] = params as [string];
  return {
    kind: 'o',
    children: [
      familyMTT.transform('q', elem.children![0], lastName),
      familyMTT.transform('q', elem.children![1], lastName)
    ]
  };
});

// <q, father>(y) -> Male( <qid, x1>, y )
familyMTT.addRule('q', 'father', (elem, params) => {
  const [lastName] = params as [string];
  const firstName = familyMTT.transform('qid', elem.children![0]);
  return {
    kind: 'Male',
    children: [
      { kind: 'identifier', name: lastName },
      firstName
    ]
  };
});

// <q, mother>(y) -> Female( <qid, x1>, y )
familyMTT.addRule('q', 'mother', (elem, params) => {
  const [lastName] = params as [string];
  const firstName = familyMTT.transform('qid', elem.children![0]);
  return {
    kind: 'Female',
    children: [
      { kind: 'identifier', name: lastName },
      firstName
    ]
  };
});

// <q, son>(y) -> Male( <qid, x1>, y )
familyMTT.addRule('q', 'son', (elem, params) => {
  const [lastName] = params as [string];
  const firstName = familyMTT.transform('qid', elem.children![0]);
  return {
    kind: 'Male',
    children: [
      { kind: 'identifier', name: lastName },
      firstName
    ]
  };
});

// <q, daughter>(y) -> Female( <qid, x1>, y )
familyMTT.addRule('q', 'daughter', (elem, params) => {
  const [lastName] = params as [string];
  const firstName = familyMTT.transform('qid', elem.children![0]);
  return {
    kind: 'Female',
    children: [
      { kind: 'identifier', name: lastName },
      firstName
    ]
  };
});

// <q, e>(y) -> e
familyMTT.addRule('q', 'e', (elem, params) => {
  return { kind: 'e' };
});

// <qid, identifier> -> identifier_value
familyMTT.addRule('qid', 'identifier', (elem, params) => {
  return { kind: 'identifier', name: elem.name };
});

// 入力木の定義
const inputTree: Element = {
  kind: 'Family',
  children: [
    {
      kind: 'lastName',
      children: [
        { kind: 'identifier', name: 'March' }
      ]
    },
    {
      kind: 'm-list',
      children: [
        {
          kind: 'father',
          children: [
            { kind: 'identifier', name: 'Jim' }
          ]
        },
        {
          kind: 'm-list',
          children: [
            {
              kind: 'mother',
              children: [
                { kind: 'identifier', name: 'Cindy' }
              ]
            },
            {
              kind: 'm-list',
              children: [
                {
                  kind: 'daughter',
                  children: [
                    { kind: 'identifier', name: 'Brenda' }
                  ]
                },
                { kind: 'e' }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// 変換実行
const output = familyMTT.transform('q0', inputTree);
console.log(JSON.stringify(output, null, 2));
```

### この例の特徴

1. **マルチステート**: q0（初期）、q（メイン）、qid（識別子抽出）の3つの状態を使用
2. **パラメータ継承**: 姓（lastName）をパラメータyとして全メンバーに伝播
3. **性別によるタグ付け**: father/sonはMale、mother/daughterはFemaleに変換
4. **再帰的リスト処理**: m-listは左右の子に同じパラメータを渡して再帰的に処理
5. **状態遷移**:
   - q0 → qid (姓抽出)
   - q0 → q (メンバーリスト処理)
   - q → qid (名前抽出)
   - q → q (再帰的処理)

### 応用可能性

このパターンは以下のような場面で応用できます：

- **スコープ情報の伝播**: 変数のスコープやコンテキストを子ノードに渡す
- **型情報の継承**: 型情報をパラメータとして伝播
- **累積計算**: カウンタや集約値を引き継ぐ
- **名前空間管理**: モジュール名やパッケージ名を継承
- **環境情報**: 設定や環境変数を子ノードに伝える

## MTTの応用

### 1. 構文木の属性計算

```typescript
// 式の値を計算しながら型チェック
const evalWithType = new SimpleMTT()
  .addRule('plus', function(elem, [env]) {
    const [left, right] = elem.children!;
    const leftVal = this.transform(left, env);
    const rightVal = this.transform(right, env);

    return {
      kind: 'typed_value',
      attrs: [
        { key: 'type', value: 'Int' },
        { key: 'value', value: leftVal.value + rightVal.value }
      ]
    };
  });
```

### 2. コード生成（コンテキスト付き）

```typescript
// 変数スコープを伝播させながらコード生成
const codeGen = new SimpleMTT()
  .addRule('let', function(elem, [scope]) {
    const [binding, body] = elem.children!;
    const newScope = { ...scope, [binding.name!]: binding };
    return this.transform(body, newScope);
  });
```

### 3. XML/HTML変換

```typescript
// ネストレベルを保持しながら整形
const formatXML = new SimpleMTT()
  .addRule('element', function(elem, [indent]) {
    const children = elem.children!.map(child =>
      this.transform(child, indent + 2)
    );
    return createIndentedElement(elem.name!, children, indent);
  });
```

## まとめ

MTTの特徴：
1. **パラメータによる状態伝播** - コンテキスト情報を再帰呼び出しに渡せる
2. **累積計算** - アキュムレータパターンで結果を構築
3. **強力な表現力** - 単純なTransducerより複雑な変換が可能
4. **理論的基盤** - 形式的な定義と性質が研究されている

TreePでの実装により、MTTの理論的概念を実用的なツールとして活用できます。
