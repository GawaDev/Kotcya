# 公開前監査

監査日: 2026-09-13  
対象版: 0.1.0

## 結論

公開を妨げる重大・高優先の問題はありません。Kotcya本体はMIT Licenseで公開でき、production依存のライセンスは許可対象内です。

## 実施内容

- TypeScript本番ビルド
- Oxlintによる静的検査
- Vitestによる文書カタログと公開メタデータの検査
- production依存の脆弱性監査
- production依存ライセンスの許可リスト検査
- 秘密情報、旧製品名、未使用の鉄道データ、浮動モデルURLの確認
- Blob URLの解放、非同期解析の競合、入力容量と画像寸法の制限確認
- アイコン操作、エラー通知、モバイル操作対象のアクセシビリティ確認
- ヘルプHTMLのサニタイズとRender Web Serviceの配信ヘッダー、ヘルスチェックの確認

## 結果

- `npm run lint`: 成功
- `npm run test:run`: 19件成功
- `npm run build`: 成功
- `npm audit --omit=dev --audit-level=high`: 脆弱性0件
- `npm run license:check`: 成功
- Critical: 0件
- High: 0件

## 監査で是正した事項

- AGPL-3.0依存を除去し、Apache License 2.0のMediaPipeへ置換
- 旧ICカード機能、鉄道データ、未使用依存を除去
- MediaPipeモデルURLをversion 1へ固定
- MediaPipeの利用状況送信について初回同意を追加
- 30MBと8192pxの入力制限を全読込経路へ適用
- 解析とC2PA確認の世代競合を防止
- Blob URLを差替、取消、終了時に解放
- エラーを全ペインから確認できる通知へ移動
- Content Security Policyと基本的な配信ヘッダーを追加
- ヘルプHTMLをDOMPurifyでサニタイズ
- C2PA確認を一般的なAI画像判定と誤認させる文言を除去

## 既知の制約

- 人物の切り抜きにはGoogleとjsDelivrへの接続が必要です。
- MediaPipeは利用状況と診断情報をGoogleへ送信します。画像自体は送信しません。
- C2PA認証情報がない画像について、AI生成かどうかを断定できません。SynthID画像ウォーターマークは検出しません。
- C2PA WASMは約8.4MBあり、初回の生成情報確認に読み込み時間がかかる場合があります。
- ブラウザや端末のメモリ量によって、大きな画像の処理時間が変わります。

## 継続監査

GitHub Actionsでpushとpull requestごとにLint、テスト、ビルド、脆弱性監査、ライセンス検査を実行します。依存更新時は`THIRD_PARTY.md`と画面ヘルプの第三者ライセンスを同時に更新します。
