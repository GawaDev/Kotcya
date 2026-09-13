# Kotcya

Kotcyaは、画像の加工、解析、メタデータ確認をブラウザで行う画像ワークベンチです。

[デモを開く](https://kotcya.onrender.com)

## 機能

- 人物や前景の切り抜き、透明画像とSVGの縁取り
- 色、質感、構図、寸法の調整
- PNG、JPEG、WebPへの保存
- EXIF、XMP、IPTC、GPS、寸法、主要色、SHA-256の確認
- C2PAコンテンツ認証情報と署名の確認

C2PAの確認は、画像に付与された来歴情報と署名を表示するものです。画像全般がAIで生成されたかどうかを判定する機能ではありません。

## プライバシー

画像の読み込み、加工、解析、保存はブラウザ内で行います。人物の切り抜きを初めて使うときは、MediaPipeの実行コードとモデルを外部配信元から取得します。詳しくは[セキュリティとプライバシー](docs/spec/security-privacy.md)を参照してください。

## 開発

```bash
npm ci
npm run dev
```

Node.js 22を使用します。

## テスト

```bash
npm run lint
npm run test:run
npm run license:check
```

## ビルド

```bash
npm run build
```

生成物は `dist/` に出力されます。

## 公開

RenderではNode.jsのWeb Serviceとして動作します。`server.mjs`が`dist/`を配信し、`/health`で稼働状態と公開メタデータを返します。構成は`render.yaml`に定義しています。

## 文書

利用方法と対応範囲は[文書索引](docs/INDEX.md)にまとめています。変更への参加方法は[CONTRIBUTING.md](CONTRIBUTING.md)、変更履歴は[CHANGELOG.md](CHANGELOG.md)、公開前の確認結果は[公開前監査](AUDIT.md)を参照してください。

## ライセンス

Kotcyaは[MIT License](LICENSE)で公開しています。利用しているソフトウェアと配布物の表記は[THIRD_PARTY.md](THIRD_PARTY.md)および[画面内の第三者ライセンス](docs/license/02-third-party.md)にあります。

## Security

脆弱性は公開Issueではなく、[セキュリティポリシー](SECURITY.md)に記載した非公開の方法で報告してください。
