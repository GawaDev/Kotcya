# アーキテクチャ

KotcyaはViteで構築した静的なReactアプリです。画像はブラウザのFile、Object URL、Canvas、Web Crypto APIで読み込み、加工、解析します。

画面ヘルプのMarkdownはビルド時にアプリへ同梱され、明示したカタログから表示します。人物の切り抜きだけは、MediaPipe Tasks Visionの実行コード、WASM、モデルを外部配信元から取得します。

この文書は開発者向けのため、画面ヘルプの目次には掲載しません。
