# 無人島ゲーム Mockup

## 起動方法

もっとも簡単:
1. `index.html` をダブルクリック
2. ブラウザでそのまま開く

ローカルHTTPサーバーを使う場合:
```bash
python3 -m http.server 8000
```

その後:
`http://localhost:8000`

## 内容
- HTML + JavaScriptのみ
- 外部ライブラリ不要
- 256x256px Canvas
- 上部: 海と波打ち際、砂浜
- 下部: 島内部
- ドット絵風の描画
- 波アニメーション
- 漂着物の自動生成
- 砂浜クリックで漂着物追加
