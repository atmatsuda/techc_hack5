# your-project

## 概要
このプロジェクトの説明をここに書いてください。

## ディレクトリ構成

```
your-project/
├── index.php             # トップページ
├── login.php             # ログイン画面
├── register.php          # 新規登録画面
├── css/                   # スタイルシート
├── js/                    # JavaScript
├── images/                # 画像素材
└── includes/              # 共通パーツ・DB接続処理
    ├── db_connect.php
    ├── header.php
    └── footer.php
```

## セットアップ

1. `includes/db_connect.php` にデータベース接続情報を設定してください。
2. PHP内蔵サーバーで起動する場合:

```bash
php -S localhost:8000
```

3. ブラウザで `http://localhost:8000` にアクセスしてください。
