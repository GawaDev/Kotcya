# Third-party notices

Kotcyaは、主に次の第三者ソフトウェアを使用しています。

- React / React DOM — MIT License
- Mantine（Core、Dropzone、Hooks）— MIT License
- Tabler Icons for React — MIT License
- MediaPipe Tasks Vision — Apache License 2.0
- MediaPipe Selfie Segmenter（float16、version 1）— Apache License 2.0
- C2PA Web SDK / C2PA WASM（Adobe、2025）— MIT License
- exifr — MIT License
- marked — MIT License
- DOMPurify — Apache License 2.0 or Mozilla Public License 2.0

人物の切り抜きでは、Googleが配布する[MediaPipe Selfie Segmenterモデル](https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite)と、jsDelivrが配布するMediaPipe WASMを実行時に取得します。MediaPipe Tasks VisionとモデルはApache License 2.0です。MediaPipeの利用には[利用規約](https://developers.google.com/edge/mediapipe/legal/tos)と[プライバシー情報](https://developers.google.com/edge/mediapipe/solutions/tasks)も適用されます。

Apache License 2.0の全文は[Apache Software Foundation](https://www.apache.org/licenses/LICENSE-2.0)で確認できます。C2PA WASMはアプリの配布物に含まれます。

完全な直接・推移的依存関係と各パッケージのライセンスは、`package-lock.json` およびインストールされた各パッケージのライセンス文書で確認できます。画面に同梱する案内は [`docs/license/02-third-party.md`](docs/license/02-third-party.md) にあります。
