# Contributing to Kotcya

IssueやPull Requestを作成する前に、既存の項目を確認してください。バグ報告には再現手順、期待した結果、実際の結果、ブラウザとOSを含めてください。脆弱性は [`SECURITY.md`](SECURITY.md) の方法で非公開報告してください。

## 開発

Node.js 22を使用します。

```bash
npm ci
npm run dev
```

変更は目的を絞り、利用者向けの機能を変更した場合は画面ヘルプと `docs/manual/` も更新してください。

## 提出前の確認

```bash
npm run lint
npm run test:run
npm run build
npm run license:check
```

Pull Requestには変更理由、動作確認方法、画面変更がある場合は画像を記載してください。提出した貢献はプロジェクトのMIT Licenseで配布されます。
