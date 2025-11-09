# TreeP言語仕様

## 基本構文

### コメント

```treep
// 行コメント

/*
 * ブロックコメント
 */
```

### リテラル

```treep
// 整数リテラル
42
123

// 文字列リテラル
"hello"
"world"

// 真偽値リテラル
true
false
```

## 変数と束縛

### let束縛

```treep
let x = 10
let name = "Alice"
let flag = true

// 型注釈（オプション）
let y: Int = 20
```

## 関数定義

### 基本的な関数定義

```treep
def add(x, y) {
  return x + y
}

// 型注釈付き
def add(x: Int, y: Int) returns: Int {
  return x + y
}
```

### パラメータと返り値

```treep
// パラメータなし
def greet() {
  println("Hello!")
}

// 複数パラメータ
def calculate(a, b, c) {
  return a * b + c
}

// 返り値の型指定
def factorial(n: Int) returns: Int {
  if (n <= 1) {
    return 1
  } else {
    return n * factorial(n - 1)
  }
}
```

## 式

### 算術演算

```treep
x + y    // 加算
x - y    // 減算
x * y    // 乗算
x / y    // 除算（整数除算）
x % y    // 剰余
```

### 比較演算

```treep
x == y   // 等価
x != y   // 非等価
x < y    // 小なり
x > y    // 大なり
x <= y   // 小なりイコール
x >= y   // 大なりイコール
```

### 論理演算

```treep
x && y   // 論理AND
x || y   // 論理OR
!x       // 論理NOT
```

### 関数呼び出し

```treep
add(10, 20)
factorial(5)
println("Hello")
```

## 制御構文

### if式

```treep
if (x > 0) {
  println("positive")
} else {
  println("not positive")
}

// else省略可能
if (x > 0) {
  println("positive")
}
```

### while ループ

```treep
let i = 0
while (i < 10) {
  println(i)
  i = i + 1
}
```

### for ループ

```treep
for (i = 0, 10) {
  println(i)
}
```

## ラムダ式

### 基本形

```treep
// ラムダ式の定義
let twice = (x) -> {
  return x * 2
}

// 使用
let result = twice(5)  // 10
```

### ブロック引数構文

マクロや高階関数で使いやすいように、ブロック引数構文をサポートしています：

```treep
// 通常の書き方
when(x > 0, () -> {
  println("positive")
})

// ブロック引数構文
when(x > 0) {
  println("positive")
}
```

内部的には、`name(args) { block }` パターンが `name(args, () -> { block })` に変換されます。

## 型システム

### 基本型

- `Int`: 整数型
- `String`: 文字列型
- `Bool`: 真偽値型
- `Unit`: 値を持たない型（副作用のみの処理）

### 関数型

```treep
// Int -> Int の型を持つ関数
def increment(x: Int) returns: Int {
  return x + 1
}

// Int -> Int -> Int の型を持つ関数
def add(x: Int, y: Int) returns: Int {
  return x + y
}
```

### 型推論

型注釈を省略しても、使用箇所から型が推論されます：

```treep
def add(x, y) {
  return x + y
}
// x, y, 返り値 すべて Int と推論

def main() {
  let result = add(10, 20)
  // result は Int と推論
  println(result)
}
```

## マクロ

### 組み込みマクロの使用

```treep
// when: elseなしif
when(x > 0) {
  println("positive")
}

// assert: アサーション
assert(x > 0)

// debug: デバッグ出力
debug(x)

// log: ロギング
log("Processing started")

// trace: 式の評価をトレース
let result = trace(complexCalculation())

// inc/dec: インクリメント/デクリメント
inc(counter)
dec(counter)

// ifZero: ゼロチェック
ifZero(x) {
  println("x is zero")
}

// ifPositive: 正数チェック
ifPositive(x) {
  println("x is positive")
}

// until: untilループ
until(x >= 10) {
  x = x + 1
}
```

## 完全な例

### 階乗計算

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

### マクロを使った例

```treep
def processValue(x) {
  // アサーション
  assert(x >= 0)

  // デバッグ出力
  debug(x)

  // 条件分岐
  ifZero(x) {
    log("Value is zero")
  }

  ifPositive(x) {
    log("Value is positive")
  }

  return x * 2
}

def main() returns: Int {
  let value = 42
  let result = trace(processValue(value))
  println(result)
  return 0
}
```
