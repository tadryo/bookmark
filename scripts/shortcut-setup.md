# macOS Shortcuts で Cmd+D をブックマーク保存に割り当てる

## 前提
- macOS Ventura 以降
- Cloudflare Pages または localhost:8765 でサーバーが起動済み
- Shortcuts.app（ショートカット）がインストール済み

---

## Step 1: Safari の Cmd+D を無効化

1. **システム設定** → **キーボード** → **キーボードショートカット**
2. **アプリのショートカット** → **+**
3. 以下を入力して追加:
   - アプリケーション: **Safari**
   - メニュータイトル: `ブックマークを追加…`（末尾の `…` まで正確に）
   - キーボードショートカット: **Shift+Cmd+D**（または任意の別キー）
4. **追加** をクリック

これで Safari の標準 Cmd+D が Shift+Cmd+D に移動し、Cmd+D が空きます。

---

## Step 2: Shortcuts.app でショートカットを作成

1. **ショートカット.app** を開く
2. **+** で新規ショートカット作成
3. 名前: `Safariブックマーク保存`

### 追加するアクション（順番に）

**① Safari で JavaScript を実行**
```javascript
var result = JSON.stringify({
  title: document.title,
  url: document.URL,
  tags: []
});
completion(result);
```

**② URLのコンテンツを取得**
- URL: `https://YOUR_PAGES_URL/api/bookmark`
  （ローカル使用の場合: `http://localhost:8765/api/bookmark`）
- 方法: **POST**
- ヘッダー: `Content-Type` → `application/json`
- リクエストの本文: **ファイル**
  - 内容: **①の結果**（ショートカット変数を選択）

**③ 通知を表示**
- タイトル: `保存しました ✓`
- 本文: **①の結果** の `title` フィールド（任意）

---

## Step 3: Cmd+D をショートカットに割り当て

1. 作成したショートカットを **右クリック** → **詳細**（または ⌘I）
2. **キーボードショートカット** → **Cmd+D** を入力
3. 設定を閉じる

---

## 動作確認

1. Safari で任意のページを開く
2. **Cmd+D** を押す
3. 「保存しました ✓」通知が表示され、ブックマークに追加される

---

## トラブルシューティング

**「Safari で JavaScript を実行」がエラーになる場合**  
→ システム設定 → プライバシーとセキュリティ → アクセシビリティ → ショートカット.app を許可

**Cmd+D を押しても Safari のダイアログが出る場合**  
→ Step 1 でメニュータイトルが完全一致しているか確認  
→ Safari を再起動してみる
