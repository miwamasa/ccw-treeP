# TreeP ドキュメント

TreeP（Tree Processor）の詳細な説明資料です。

## ドキュメント一覧

### 1. [概要](01_overview.md)
TreePの基本的な特徴、設計思想、処理フローを説明します。

**内容:**
- TreePとは
- 主な特徴（型推論、EAST、マクロシステム、関数型プログラミング）
- 処理フロー
- 組み込みマクロ一覧
- トランスデューサーシステムの紹介

### 2. [言語仕様](02_language_spec.md)
TreeP言語の文法と構文を詳しく説明します。

**内容:**
- 基本構文（コメント、リテラル）
- 変数と束縛
- 関数定義
- 式（算術、比較、論理演算）
- 制御構文（if、while、for）
- ラムダ式
- 型システム
- マクロの使用方法
- 完全なプログラム例

### 3. [EAST（Element-based AST）詳細](03_east.md)
TreePの核心となる中間表現EASTについて解説します。

**内容:**
- EASTとは
- Element構造の詳細
- kindの種類
- TreePコード→EAST変換例
- EASTの利点
- C-EAST（Concrete EAST）
- EAST処理の実装

### 4. [マクロシステム](04_macro_system.md)
TreePのマクロシステムの仕組みと使い方を説明します。

**内容:**
- マクロとは
- マクロの仕組み（パターンマッチング、変数バインディング、テンプレート展開）
- 組み込みマクロ詳解（9個のマクロの詳細説明）
- ブロック引数構文
- ユーザー定義マクロ（将来的な拡張）
- マクロ展開の実装
- 衛生的マクロ

### 5. [トランスデューサーシステム](05_transducer.md)
木構造変換システムの詳細を説明します。

**内容:**
- トランスデューサーとは
- ユースケース（コード変換、リファクタリング、最適化、コード生成）
- トランスデューサーの構成要素（パターン、テンプレート、変換ルール）
- 基本的な使い方
- パターンの種類（KindPattern、VarPattern、AnyPattern、ListPattern）
- テンプレートの種類（NodeTemplate、VarTemplate、LiteralTemplate、ListTemplate）
- 実践例（TreeP→JavaScript変換、最適化）
- 実装詳細（PatternMatcher、TemplateGenerator、Transducer）

### 6. [型推論システム](06_type_inference.md)
Hindley-Milner型推論アルゴリズムの実装を解説します。

**内容:**
- Hindley-Milner型推論とは
- 型システムの基本（型の種類、型スキーム）
- 型推論の流れ
- 型推論の例（単純な関数、多相関数、再帰関数）
- 実装詳細（TypeInferenceクラス、単一化、一般化、インスタンス化）
- 組み込み型の定義
- Let多相性
- 型エラーの例

### 7. [チュートリアル](07_tutorial.md)
TreePの基本的な使い方を実践的に学べます。

**内容:**
- インストールと準備
- 基本的なプログラミング（変数、関数、条件分岐、ループ）
- 再帰関数（階乗、フィボナッチ）
- マクロの使用（9個のマクロの実例）
- トランスデューサーの使用（ノード変換の例）
- 実践例（素数判定、最大公約数、配列の合計）
- デバッグのヒント
- よくあるエラー

## 推奨される読み方

### 初めての方

1. **[概要](01_overview.md)** でTreePの全体像を把握
2. **[チュートリアル](07_tutorial.md)** で実際にコードを書いてみる
3. **[言語仕様](02_language_spec.md)** で詳細な文法を学ぶ

### TreePの内部に興味がある方

1. **[EAST詳細](03_east.md)** で中間表現を理解
2. **[マクロシステム](04_macro_system.md)** でマクロ展開の仕組みを学ぶ
3. **[型推論システム](06_type_inference.md)** で型システムを理解

### トランスデューサーを使いたい方

1. **[EAST詳細](03_east.md)** でEASTの構造を理解
2. **[トランスデューサーシステム](05_transducer.md)** で変換ルールの書き方を学ぶ
3. **[チュートリアル](07_tutorial.md)** の実践例で使い方を確認

## 参考資料

### TreePの設計に影響を与えた言語・システム

- **Lisp**: S式とマクロシステム
- **Standard ML / OCaml**: Hindley-Milner型推論
- **XML**: 要素モデル
- **XSLT**: 木構造変換

### 関連論文・資料

- Damas, Luis, and Robin Milner. "Principal type-schemes for functional programs." POPL 1982.
- Hudak, Paul, et al. "A history of Haskell: being lazy with class." HOPL 2007.

## コントリビューション

ドキュメントの改善提案やバグ報告は、GitHubのIssueまでお願いします。

## ライセンス

MIT License
