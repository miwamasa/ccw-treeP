# TreeP チュートリアル

## インストールと準備

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/treep-language.git
cd treep-language

# 依存関係をインストール
npm install

# ビルド
npm run build

# テストを実行
npm test
```

## 基本的な使い方

### 1. 簡単なプログラムを書く

`hello.treep`というファイルを作成：

```treep
def main() returns: Int {
  println("Hello, TreeP!")
  return 0
}
```

### 2. プログラムを実行

```typescript
import { TreeP } from './src/index';

const source = `
def main() returns: Int {
  println("Hello, TreeP!")
  return 0
}
`;

const treep = new TreeP(source);
const result = treep.run();
```

## 基本的なプログラミング

### 変数と演算

```treep
def calculate() {
  let x = 10
  let y = 20
  let sum = x + y
  let product = x * y

  println(sum)      // 30
  println(product)  // 200
}
```

### 関数定義

```treep
// 型推論による関数定義
def add(a, b) {
  return a + b
}

// 型注釈付き関数定義
def multiply(a: Int, b: Int) returns: Int {
  return a * b
}

def greet(name) {
  println("Hello, " + name)
}
```

### 条件分岐

```treep
def checkSign(x) {
  if (x > 0) {
    println("positive")
  } else if (x < 0) {
    println("negative")
  } else {
    println("zero")
  }
}
```

### ループ

```treep
// whileループ
def countToTen() {
  let i = 1
  while (i <= 10) {
    println(i)
    i = i + 1
  }
}

// forループ
def printRange() {
  for (i = 1, 10) {
    println(i)
  }
}
```

## 再帰関数

### 階乗

```treep
def factorial(n) {
  if (n <= 1) {
    return 1
  } else {
    return n * factorial(n - 1)
  }
}

def main() returns: Int {
  let result = factorial(5)
  println(result)  // 120
  return 0
}
```

### フィボナッチ数列

```treep
def fib(n) {
  if (n <= 1) {
    return n
  } else {
    return fib(n - 1) + fib(n - 2)
  }
}

def main() returns: Int {
  for (i = 0, 10) {
    let f = fib(i)
    println(f)
  }
  return 0
}
```

## マクロの使用

### when マクロ

```treep
def checkPositive(x) {
  when(x > 0) {
    println("x is positive")
  }
}
```

### assert マクロ

```treep
def safeDivide(a, b) {
  assert(b != 0)
  return a / b
}
```

### debug と log マクロ

```treep
def processData(data) {
  log("Processing started")
  debug(data)

  let result = data * 2

  log("Processing completed")
  return result
}
```

### trace マクロ

```treep
def complexCalculation(x, y) {
  let a = trace(x + y)
  let b = trace(a * 2)
  return b
}
```

### until マクロ

```treep
def waitUntilReady(value) {
  until(value >= 100) {
    value = value + 10
    println(value)
  }
}
```

### ifZero と ifPositive マクロ

```treep
def analyzeNumber(x) {
  ifZero(x) {
    println("The number is zero")
  }

  ifPositive(x) {
    println("The number is positive")
  }
}
```

## トランスデューサーの使用

### 例1: ノード名の変更

```typescript
import { Element } from './src/ast/types';
import { TransducerBuilder } from './src/transducer/transducer';

// 入力木
const inputTree: Element = {
  kind: 'def',
  name: 'myFunction',
  children: [
    { kind: 'param', name: 'x' },
    { kind: 'param', name: 'y' }
  ]
};

// トランスデューサーを構築
const transducer = new TransducerBuilder()
  .addRule({
    name: 'rename_def',
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
    name: 'rename_param',
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
  .build('renamer');

// 変換実行
const outputTree = transducer.transform(inputTree);

console.log(outputTree);
// {
//   kind: 'function',
//   name: 'myFunction',
//   children: [
//     { kind: 'argument', name: 'x' },
//     { kind: 'argument', name: 'y' }
//   ]
// }
```

### 例2: 属性を使った変換

```typescript
const transducer = new TransducerBuilder()
  .addRule({
    name: 'transform_int_literal',
    pattern: {
      type: 'KindPattern',
      kind: 'literal',
      attrPatterns: [
        { key: 'type', literal: 'Int' },
        { key: 'value', valueVar: 'val' }
      ]
    },
    template: {
      type: 'NodeTemplate',
      kind: 'IntegerLiteral',
      attrs: [
        { key: 'value', value: { type: 'Var', varName: 'val' } }
      ]
    }
  })
  .build('literal_transformer');

const input: Element = {
  kind: 'literal',
  attrs: [
    { key: 'type', value: 'Int' },
    { key: 'value', value: '42' }
  ]
};

const output = transducer.transform(input);
// {
//   kind: 'IntegerLiteral',
//   attrs: [{ key: 'value', value: '42' }]
// }
```

## 実践例

### 例：素数判定

```treep
def isPrime(n) {
  assert(n > 0)

  if (n <= 1) {
    return false
  }

  if (n == 2) {
    return true
  }

  let i = 2
  while (i * i <= n) {
    if (n % i == 0) {
      return false
    }
    i = i + 1
  }

  return true
}

def main() returns: Int {
  for (n = 1, 20) {
    when(isPrime(n)) {
      println(n)
    }
  }
  return 0
}
```

### 例：最大公約数（ユークリッドの互除法）

```treep
def gcd(a, b) {
  assert(a > 0)
  assert(b > 0)

  while (b != 0) {
    let temp = b
    b = a % b
    a = temp
  }

  return a
}

def main() returns: Int {
  let result = gcd(48, 18)
  println(result)  // 6
  return 0
}
```

### 例：配列の合計（シミュレーション）

```treep
def sumRange(from, to) {
  let sum = 0
  for (i = from, to) {
    sum = sum + i
  }
  return sum
}

def main() returns: Int {
  let result = sumRange(1, 100)
  println(result)  // 5050
  return 0
}
```

## デバッグのヒント

### 1. debug マクロを使う

```treep
def buggyFunction(x) {
  debug(x)  // 変数の値を確認
  let result = x * 2
  debug(result)
  return result
}
```

### 2. trace マクロで式を追跡

```treep
def calculate(x, y) {
  let result = trace(x + y * 2)
  return result
}
```

### 3. assert でバリデーション

```treep
def process(value) {
  assert(value >= 0)
  assert(value <= 100)
  // 処理...
}
```

## よくあるエラー

### 型エラー

```treep
// エラー: 型の不一致
def add(x, y) {
  return x + y
}

let result = add(10, "hello")  // Int と String を加算できない
```

### 未定義変数

```treep
// エラー: 未定義の変数
def test() {
  println(undefinedVar)  // undefinedVar が定義されていない
}
```

### アサーション失敗

```treep
def safeDivide(a, b) {
  assert(b != 0)  // b が 0 の場合、実行時エラー
  return a / b
}

safeDivide(10, 0)  // エラー！
```

## 次のステップ

1. [言語仕様](02_language_spec.md)で詳細な文法を学ぶ
2. [EAST](03_east.md)でTreePの内部表現を理解する
3. [マクロシステム](04_macro_system.md)でマクロの実装を学ぶ
4. [トランスデューサー](05_transducer.md)で木構造変換を学ぶ
5. [型推論](06_type_inference.md)で型システムを理解する

Happy coding with TreeP!
