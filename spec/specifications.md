TreePの概要
TreeP: Tree Processorは、静的型を持った関数型プログラミング言語で、かつ、抽象構文木を使ったマクロを簡単に定義できるプログラミング言語です。わかる方ならわかるかと思いますが、TreePという名前自体がそもそもLisp（List Processor）のもじりです。

TreePのコンセプトとして

小さいメタ構文： XMLのような要素+属性モデル
具象構文は普通に書ける
LispやXML系のプログラミング言語と違って「具象構文は普通に見える」
抽象構文木に対するマクロが簡単に作れる
Lisp系言語っぽさ
Hindley-Milner型推論をもった関数型プログラミング言語
引数や返り値の型を推論可能
Standard MLやOCamlなどの型推論と同じ原理に基づくものです
があります。これくらいリッチな言語を人間が書くと1週間はかかってしまいそうですが、Codex CLIなら1日や2日でいけるだろうと楽観的に考えて作らせてみることにしました。

できたリポジトリがこちらです。

AIとのペアプログラミング
Codex CLI（GPT-5）に加えて、終盤はClaude Code（Sonnet 4.5）に整えてもらう方向で実装を進めました。言語の骨格や型システムの主要な部分はCodex CLIで、細かい調整やデバッグはClaude Codeで、という感じです。

当初はCodex CLIだけでやろうと思ったのですが、計画を詰める能力についてはClaude Codeの方がまだ優れている印象で、一長一短あることを痛感しました。これはモデル自体の能力よりもツールとしての作り込みの問題かもしれません。

実装の進め方
最初は「Hindley-Milner型推論を持っていて、LispのS式のようなメタ構文EASTを持っている言語」くらいの大まかな指示から始めました。すると、Codex CLIはだいたい以下のような構成を提案してくれました（細かいところで指示を入れましたが割愛）：

文字列 → Lexer（字句解析）→ Parser（構文解析）→ CST（具象構文木）
CST → Normalize（正規化）→ EAST（Element AST：要素ベースの抽象構文木）
EAST → Macro Expansion（マクロ展開）→ EAST
EAST → Type Checker（型検査）→ (検査結果, EAST）
EAST → Interpreter（インタプリタ）→ 結果
このパイプライン構成は割と王道な形ですが、抽象構文木の代わりに「EAST」という中間表現を挟むことで、マクロ定義と展開を簡単に実行できるようにしています。そのような中間表現を作るにしても「Lispのようなマクロを」みたいな雑な表現から意図を汲んでくれるのはさすがですね。

EASTとは
EASTは、すべてのノードがElement(kind, name, attrs, children, span)という統一された構造を持つAST形式です。XMLの要素モデルに似ていますが、TreeP専用に設計されています。

case class Element(
  kind: String,                    // "def", "let", "call" など
  name: Option[String] = None,     // 識別子
  attrs: List[Attr] = Nil,         // 属性（型情報など）
  children: List[Element] = Nil,   // 子要素
  span: Option[SourceSpan] = None  // ソース位置
)

たとえば、次のようなTreePにおける単純な関数定義を考えてみます。ざっと見ただけで大体の意味は取れるかと思います。

def add(a: Int, b: Int) returns: Int {
  return a + b
}

これをEAST形式に変形すると次のようになります。

def name="fib" a="Int" b="Int" returns="Int" {
  return {
    call name="+" {
      var name="a"
      var name="b"
    }
  }
}

EAST形式のポイントは、各要素が必ずkindを持っており、かつ、省略可能なnameを持っていることです。XML的なラベル付き木構造をベースにしつつ、不要な冗長性を減らすように工夫してあるのです。

この統一されたデータ構造のおかげで、マクロ展開が非常にシンプルに書けます…と言いたいところなのですが、EASTもさすがに、そのままテキストで書くのがしんどかったので、プログラマはEASTをよりわかりやすくした、C-EASTとでも呼ぶ形式で読み書きをして、それがEASTに変換されるようにしました。

このEAST形式を挟んでいるおかげで、TreePでは割と簡単にマクロが書けます。たとえば、whenマクロ（elseのないif）は以下のように定義できます。

macro when {
  pattern: when($cond, $body)
  expand: {
    if (cond) {
      body()
    }
  }
}

これのEAST形式の表現は以下のようになります：

macro name="when" {
  pattern name="when" pattern="$cond, $body"
  expand {
    if cond="cond" {
      body
    }
  }
}

EAST形式に変換したあとにマクロ展開するようになっているので、内部的な処理は結構シンプルです。

使用例：

when(x > 0) {
  println("x is positive")
}

これが内部的には以下のように展開されます。

if (x > 0) {
  (() -> { println("x is positive") })()
}

展開形に() -> ...つまりラムダ式相当が出てくるのが不格好ですが、これには理由があります。上記のwhileはいったん以下のようになるのです。

when(x > 0, () -> {
  println("x is positive")
})

さらにこれが展開されて

if (x > 0) {
  (() -> { println("x is positive") })()
}

となるわけです。何故こうしたかというと、できるだけマクロを格好よく読み書きしたいと思って、

<name>(...) {
  ...
}

を

<name>(..., () -> {
})

とする特殊ルールを私が加えたせいなのですが、ちょっとイケてないかもしれません。

実装された主要機能
1. 型推論システム
TreePの最大の特徴は、Hindley-Milner型推論です。関数の引数や返り値の型を明示的に書かなくても、使用箇所から自動的に推論してくれます。ML系言語やHaskellが採用している型推論方式（のベースとなるもの）です。

def add(x, y) {
  return x + y
}
// x と y は Int、返り値も Int と推論される

def main() returns: Int {
  let result = add(10, 20)  // result は Int
  println(result)           // 30
  return 0
}

実はHindley-Milner型推論は手で書くのがなかなかに大変でバグりやすい代物なのですが、最新のコーディングAIは特にミスなくやってくれるのは驚きです。

2. ブロック引数構文
先ほど少しでてきましたが、マクロを使いやすくするために、ブロック引数構文を実装しました。これにより、ラムダ式を明示的に書かなくても、自然な構文でマクロを呼び出せます。

// Before
when(x > 0, () -> {
  println("positive")
})

// After
when(x > 0) {
  println("positive")
}

内部的には、パーサーでname(args) { block }パターンを認識し、正規化時にname(args, () -> { block })へと変換します。些細ですが、使い勝手が大幅に向上します。

3. マクロシステム
TreePでは自由にマクロを定義できるうえに、9個の組み込みマクロがあります：

マクロ	用途	使用例
assert	アサーション	assert(x > 0)
debug	デバッグ出力	debug(x)
log	ロギング	log("message")
trace	トレーシング	trace(func())
inc/dec	インクリメント	inc(x)
ifZero	ゼロチェック	ifZero(x) { ... }
ifPositive	正数チェック	ifPositive(x) { ... }
until	untilループ	until(x >= 5) { ... }
when	elseなしif	when(cond) { ... }
マクロ展開は、パターンマッチングと変数置換で実現しています。いわゆる衛生的なマクロに相当するもので、古典Lispマクロでありがちな変数捕捉を避けられます。