# アーキテクチャ

KotcyaはViteで構築したReactアプリをNode.jsのWeb Serviceから配信します。画像はブラウザのFile、Object URL、Canvas、Web Crypto APIで読み込み、加工、解析します。サーバーは静的成果物、セキュリティヘッダー、キャッシュ制御、`/health`を提供し、画像を受信しません。

画面ヘルプのMarkdownはビルド時にアプリへ同梱され、明示したカタログから表示します。Service Workerは画面と基本アセットを保存します。人物の切り抜きだけは、MediaPipe Tasks Visionの実行コード、WASM、モデルを外部配信元から取得します。

この文書は開発者向けのため、画面ヘルプの目次には掲載しません。
