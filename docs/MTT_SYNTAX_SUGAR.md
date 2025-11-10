# MTT Syntax Sugar 設計

TreePのMacro Tree Transducerをより簡潔に記述するためのsyntax sugar設計。

## 目標

現在のMTT記述は冗長：
```typescript
const input: Element = {
  kind: 'Family',
  children: [
    {
      kind: 'lastName',
      children: [
        { kind: 'identifier', name: 'March' }
      ]
    },
    // ...
  ]
};
```

これを簡潔な記法で書けるようにする：
```treep
Family(lastName(March), m-list(father(Jim), ...))
```

## 1. 木構造のSyntax Sugar

### 1.1 S式風記法（Tree Literal）

TUM参考資料の記法に近い形式：

```treep
tree Family(
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

**文法:**
```
tree_literal := 'tree' node
node        := identifier '(' node_list? ')'
             | identifier                    // 葉ノード
node_list   := node (',' node)*
```

**展開先（EAST）:**
```javascript
{
  kind: 'Family',
  children: [
    { kind: 'lastName', children: [{ kind: 'March' }] },
    // ...
  ]
}
```

### 1.2 マクロによる実装

```treep
macro tree(expr) {
  // パース: expr を木構造に変換
  return parseTreeLiteral(expr)
}

// 使用例
def main() {
  let input = tree Family(lastName(March), m-list(father(Jim), e))
  println(input)
}
```

### 1.3 属性付きノード

```treep
tree Person[age="30", gender="M"](name(John))
```

**展開:**
```javascript
{
  kind: 'Person',
  attrs: [
    { key: 'age', value: '30' },
    { key: 'gender', value: 'M' }
  ],
  children: [
    { kind: 'name', children: [{ kind: 'John' }] }
  ]
}
```

## 2. MTTルールのSyntax Sugar

### 2.1 宣言的ルール記法

TUM参考資料の記法をベースに：

```treep
mtt FamilyTransducer {
  states: q0, q, qid
  initial: q0

  // <q0, Family> -> <q, x2>( <q, x1> )
  rule <q0, Family(x1, x2)> => q(x2, qid(x1))

  // <q, m-list>(y) -> o( <q, x1>(y), <q, x2>(y) )
  rule <q, m-list(x1, x2)>(y) => o(q(x1, y), q(x2, y))

  // <q, father>(y) -> Male( <qid, x1>, y )
  rule <q, father(x1)>(y) => Male(qid(x1), y)

  // <q, mother>(y) -> Female( <qid, x1>, y )
  rule <q, mother(x1)>(y) => Female(qid(x1), y)

  // <q, e>(y) -> e
  rule <q, e>(y) => e

  // <qid, identifier> -> identifier_value
  rule <qid, @name> => @name
}

// 使用
def main() {
  let input = tree Family(lastName(March), m-list(father(Jim), e))
  let output = FamilyTransducer.transform(input)
  println(output)
}
```

**文法:**
```
mtt_decl    := 'mtt' identifier '{' mtt_body '}'
mtt_body    := states_decl initial_decl rule_decl*

states_decl := 'states:' identifier (',' identifier)*
initial_decl:= 'initial:' identifier

rule_decl   := 'rule' pattern (params)? '=>' template

pattern     := '<' state ',' node_pattern '>'
node_pattern:= identifier '(' var_list? ')'
             | '@' identifier              // 名前キャプチャ
var_list    := identifier (',' identifier)*

params      := '(' identifier (',' identifier)* ')'

template    := state '(' expr_list? ')'
             | identifier '(' expr_list? ')'
             | '@' identifier              // 変数参照
expr_list   := expr (',' expr)*
expr        := template | identifier
```

### 2.2 パターンマッチング拡張

ワイルドカード、リストパターンのサポート：

```treep
mtt Optimizer {
  states: q
  initial: q

  // x + 0 => x
  rule <q, add(x, 0)> => q(x)

  // 0 + x => x
  rule <q, add(0, x)> => q(x)

  // x * 1 => x
  rule <q, mul(x, 1)> => q(x)

  // x * 0 => 0
  rule <q, mul(x, 0)> => 0

  // !(!(x)) => x
  rule <q, not(not(x))> => q(x)

  // デフォルト: 再帰的に適用
  rule <q, node(...children)> => node(q(children)...)
}
```

### 2.3 条件付きルール

```treep
mtt TypedEval {
  states: eval
  initial: eval

  rule <eval, add(x, y)> when typeOf(x) == Int && typeOf(y) == Int
    => Int(valueOf(x) + valueOf(y))

  rule <eval, add(x, y)> when typeOf(x) == String || typeOf(y) == String
    => String(toString(x) + toString(y))
}
```

## 3. 完全な例：Family Tree

### 3.1 簡潔な記法

```treep
// 入力木の定義
let familyTree = tree Family(
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

// MTT定義
mtt FamilyTransducer {
  states: q0, q, qid
  initial: q0

  rule <q0, Family(lastName, members)>
    => q(members, qid(lastName))

  rule <q, m-list(first, rest)>(lastName)
    => o(q(first, lastName), q(rest, lastName))

  rule <q, father(@name)>(lastName)
    => Male(lastName, @name)

  rule <q, mother(@name)>(lastName)
    => Female(lastName, @name)

  rule <q, son(@name)>(lastName)
    => Male(lastName, @name)

  rule <q, daughter(@name)>(lastName)
    => Female(lastName, @name)

  rule <q, e>(_) => e

  rule <qid, lastName(@name)> => @name
}

// 実行
def main() {
  let result = FamilyTransducer.transform(familyTree)
  println(result)
  // 出力: o(Male(March, Jim), o(Female(March, Cindy), ...))
}
```

### 3.2 従来の記法（比較用）

```typescript
// 266行のTypeScriptコード
const familyMTT = new StatefulMTT();
familyMTT.addRule('q0', 'Family', (elem, params) => {
  const children = elem.children || [];
  // ... 長い実装 ...
});
// ... 続く ...
```

**削減効果:**
- 従来: ~266行
- 新記法: ~35行
- **削減率: 87%**

## 4. 実装アプローチ

### 4.1 パーサー拡張

`src/parser/parser.ts`に新しい構文を追加：

```typescript
// tree リテラル
parseTreeLiteral(): Element {
  this.expect('tree');
  return this.parseTreeNode();
}

parseTreeNode(): Element {
  const kind = this.expectIdentifier();

  if (this.peek().type === '(') {
    this.expect('(');
    const children = this.parseTreeNodeList();
    this.expect(')');
    return { kind, children };
  }

  return { kind };
}

// mtt 宣言
parseMTTDecl(): Element {
  this.expect('mtt');
  const name = this.expectIdentifier();
  this.expect('{');

  const states = this.parseStatesDecl();
  const initial = this.parseInitialDecl();
  const rules = [];

  while (!this.peek('}')) {
    rules.push(this.parseRuleDecl());
  }

  this.expect('}');

  return {
    kind: 'mtt-decl',
    name,
    children: [
      { kind: 'states', children: states },
      { kind: 'initial', name: initial },
      ...rules
    ]
  };
}
```

### 4.2 マクロ展開

MTT宣言をStatefulMTTクラスのインスタンス化に展開：

```typescript
// src/macro/mtt-expander.ts
export function expandMTTDecl(mttDecl: Element): Element {
  const name = mttDecl.name!;
  const states = extractStates(mttDecl);
  const rules = extractRules(mttDecl);

  // StatefulMTTのインスタンス化コードに展開
  return {
    kind: 'let',
    name,
    children: [{
      kind: 'call',
      name: 'new',
      children: [
        { kind: 'identifier', name: 'StatefulMTT' },
        ...rules.map(expandRule)
      ]
    }]
  };
}

function expandRule(rule: Element): Element {
  const { state, pattern, params, template } = parseRule(rule);

  return {
    kind: 'call',
    name: 'addRule',
    children: [
      { kind: 'string', value: state },
      { kind: 'string', value: pattern.kind },
      createHandlerFunction(pattern, params, template)
    ]
  };
}
```

### 4.3 型チェック

MTT宣言の静的検証：

```typescript
// src/type/mtt-checker.ts
export class MTTTypeChecker {
  checkMTTDecl(mttDecl: Element) {
    const states = extractStates(mttDecl);
    const rules = extractRules(mttDecl);

    // 1. すべてのルールの状態が宣言されているか
    for (const rule of rules) {
      const state = rule.state;
      if (!states.includes(state)) {
        throw new Error(`Undefined state: ${state}`);
      }
    }

    // 2. 初期状態が存在するか
    const initial = extractInitial(mttDecl);
    if (!states.includes(initial)) {
      throw new Error(`Initial state not in states: ${initial}`);
    }

    // 3. 各状態に対してルールが定義されているか（警告）
    for (const state of states) {
      const rulesForState = rules.filter(r => r.state === state);
      if (rulesForState.length === 0) {
        console.warn(`No rules defined for state: ${state}`);
      }
    }

    // 4. パターン変数がテンプレートで使用されているか
    for (const rule of rules) {
      checkVariableUsage(rule);
    }
  }
}
```

## 5. 高度な機能

### 5.1 型付きMTT

```treep
mtt TypedEval {
  states: eval : Tree -> Value
  initial: eval

  rule <eval, Num(n: Int)> : Value => IntValue(n)
  rule <eval, Add(x: Tree, y: Tree)> : Value => {
    let vx = eval(x)
    let vy = eval(y)
    return IntValue(vx.value + vy.value)
  }
}
```

### 5.2 インライン関数

```treep
mtt Normalizer {
  states: norm
  initial: norm

  rule <norm, Let(x, e, body)> => {
    let normalized_e = norm(e)
    let normalized_body = norm(body)
    return substitute(normalized_body, x, normalized_e)
  }

  // ヘルパー関数
  fn substitute(tree, var, value) {
    match tree {
      Var(v) when v == var => value
      Var(v) => Var(v)
      App(f, arg) => App(substitute(f, var, value),
                         substitute(arg, var, value))
      _ => tree
    }
  }
}
```

### 5.3 複数のTransducerの合成

```treep
mtt Pipeline = Optimizer >> TypeChecker >> CodeGenerator

def main() {
  let ast = parseProgram("...")
  let result = Pipeline.transform(ast)
  println(result)
}
```

## 6. 文法まとめ

```
// トップレベル宣言
decl ::= mtt_decl | tree_decl | ...

// Tree リテラル
tree_decl ::= 'tree' tree_node

tree_node ::= identifier attrs? '(' tree_list? ')'
            | identifier attrs?

tree_list ::= tree_node (',' tree_node)*

attrs ::= '[' attr (',' attr)* ']'
attr  ::= identifier '=' string

// MTT宣言
mtt_decl ::= 'mtt' identifier '{' mtt_body '}'

mtt_body ::= states_decl initial_decl rule_decl* helper_fn*

states_decl ::= 'states:' state_list
state_list  ::= identifier (',' identifier)*

initial_decl ::= 'initial:' identifier

rule_decl ::= 'rule' pattern params? guard? '=>' template

pattern ::= '<' identifier ',' node_pattern '>'

node_pattern ::= identifier '(' var_list? ')'
               | identifier
               | '@' identifier

var_list ::= pattern_var (',' pattern_var)*
pattern_var ::= identifier
              | '@' identifier
              | '...' identifier

params ::= '(' identifier (',' identifier)* ')'

guard ::= 'when' expr

template ::= expr
           | '{' statement* 'return' expr '}'

helper_fn ::= 'fn' identifier '(' param_list ')' block
```

## 7. 実装の優先順位

### Phase 1: 基本機能
1. ✅ tree リテラルのパース
2. ✅ 基本的な mtt 宣言のパース
3. ✅ 単純なルールの展開

### Phase 2: パターンマッチング
4. ⬜ ワイルドカードパターン
5. ⬜ リストパターン (...children)
6. ⬜ 名前キャプチャ (@name)

### Phase 3: 高度な機能
7. ⬜ 条件付きルール (when)
8. ⬜ インライン関数
9. ⬜ 型注釈

### Phase 4: 最適化
10. ⬜ ルールの順序最適化
11. ⬜ デッドコード除去
12. ⬜ パターン重複検出

## 8. 使用例：完全なプログラム

```treep
// 式の最適化と評価

mtt Optimizer {
  states: opt
  initial: opt

  rule <opt, Add(Num(0), x)> => opt(x)
  rule <opt, Add(x, Num(0))> => opt(x)
  rule <opt, Mul(Num(1), x)> => opt(x)
  rule <opt, Mul(x, Num(1))> => opt(x)
  rule <opt, Mul(Num(0), x)> => Num(0)
  rule <opt, Mul(x, Num(0))> => Num(0)

  rule <opt, Add(x, y)> => Add(opt(x), opt(y))
  rule <opt, Mul(x, y)> => Mul(opt(x), opt(y))
  rule <opt, Num(n)> => Num(n)
}

mtt Evaluator {
  states: eval
  initial: eval

  rule <eval, Num(n)> => n
  rule <eval, Add(x, y)> => eval(x) + eval(y)
  rule <eval, Mul(x, y)> => eval(x) * eval(y)
}

def main() {
  // (0 + x) * 1 + (y * 0) => x + 0 => x
  let expr = tree Add(
    Mul(Add(Num(0), Num(5)), Num(1)),
    Mul(Num(3), Num(0))
  )

  println("Original:", expr)

  let optimized = Optimizer.transform(expr)
  println("Optimized:", optimized)
  // => Num(5)

  let result = Evaluator.transform(optimized)
  println("Result:", result)
  // => 5

  return 0
}
```

## まとめ

**Syntax Sugarの利点:**
1. **簡潔性**: 87%のコード削減
2. **可読性**: 理論的記法に近い
3. **型安全性**: 静的検証が可能
4. **保守性**: 宣言的で理解しやすい

**実装の実現可能性:**
- TreePの既存のパーサー・マクロシステムを活用
- 段階的な実装が可能（Phase 1から開始）
- 既存のStatefulMTTクラスへの展開で互換性維持

この設計により、MTTを実用的なツールとして活用できます。
