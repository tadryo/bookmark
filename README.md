# bookmark

新規タブページとして使うブックマーク管理システム。  
**Mac / iPhone / iPad** で共通利用できるよう Cloudflare Pages でホストします。

---

## 機能

- Safari 風のアイコンタイル表示
- よく見る順 / カテゴリ別表示
- ブックマークレットまたは Cmd+D（Shortcuts.app）で現在のページを保存
- ライト / ダークテーマ切替
- 壁紙設定対応

---

## セットアップ（ローカル開発）

```bash
git clone https://github.com/<you>/bookmark
cd bookmark
bash setup.sh
```

ブラウザの新規タブを `http://localhost:8765` に設定。

---

## Cloudflare Pages へのデプロイ

### 1. KV Namespace を作成

```bash
npm install -g wrangler
wrangler login

# 本番用
wrangler kv:namespace create DATA
# プレビュー用（ローカル開発 wrangler pages dev で使用）
wrangler kv:namespace create DATA --preview
```

出力された ID を `wrangler.toml` の `id` / `preview_id` に記入してください。

### 2. GitHub リポジトリを Cloudflare Pages に接続

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages → プロジェクトを作成
2. GitHub リポジトリを選択
3. ビルド設定:
   - フレームワーク: **なし**
   - ビルドコマンド: *(空欄)*
   - 出力ディレクトリ: `.`
4. **環境変数** → **KV バインディング** を追加:
   - 変数名: `DATA`
   - KV Namespace: 作成した Namespace を選択

### 3. 既存の bookmarks.md を KV へ移行

```bash
KV_NAMESPACE_ID=<your_id> bash scripts/migrate-to-kv.sh
```

### 4. アクセス制限（推奨）

Cloudflare Access を有効にすることで Google / GitHub アカウント認証が追加できます。  
Pages → アクセスポリシー → ゼロトラストアクセスを有効化

---

## ブックマーク保存方法

### Safari（iPhone / iPad / Mac）: ブックマークレット

ページ下部の「🔖 このページを保存」をブックマークバーにドラッグ。  
クリックするだけで現在のページを保存します。

### Safari（Mac）: Cmd+D ショートカット

`scripts/shortcut-setup.md` を参照してください。  
Shortcuts.app で Cmd+D を本システムに割り当てられます。

### Chrome（Mac）: 拡張機能

`extension/` フォルダを Chrome に読み込んで使用します（Cmd+Shift+D で保存）。  
`chrome://extensions/shortcuts` で Cmd+D にリマップ可能。

---

## ブックマークの書式（ローカル）

```markdown
# Bookmarks

- [GitHub](https://github.com) #dev #oss
- [Arxiv](https://arxiv.org) #research #papers
```

クラウド版ではブックマークは KV に保存され、UI から追加・管理します。

---

## キーボードショートカット（ブックマークページ内）

| キー | 動作 |
|------|------|
| `n` | ブックマーク追加モーダルを開く |
| `Escape` | モーダルを閉じる |
| `Enter` | フォーム送信（入力欄フォーカス中） |

---

## License

MIT
