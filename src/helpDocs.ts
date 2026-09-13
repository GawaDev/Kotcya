export type HelpDocGroup = 'マニュアル' | '仕様書' | 'ライセンス';

export type HelpDocItem = {
  id: string;
  title: string;
  group: HelpDocGroup;
};

const markdownModules = import.meta.glob('../docs/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const helpDocs: HelpDocItem[] = [
  { id: 'manual/01-intro.md', title: 'はじめに', group: 'マニュアル' },
  { id: 'manual/02-ui-and-files.md', title: '画面と画像を開く', group: 'マニュアル' },
  { id: 'manual/03-editing.md', title: '画像を加工する', group: 'マニュアル' },
  { id: 'manual/04-information-and-provenance.md', title: '画像情報と来歴', group: 'マニュアル' },
  { id: 'manual/05-saving.md', title: '画像を保存する', group: 'マニュアル' },
  { id: 'manual/06-troubleshooting.md', title: '困ったときは', group: 'マニュアル' },
  { id: 'manual/07-about.md', title: 'このアプリについて', group: 'マニュアル' },
  { id: 'spec/input-output.md', title: '入出力仕様', group: '仕様書' },
  { id: 'spec/image-processing.md', title: '画像処理仕様', group: '仕様書' },
  { id: 'spec/security-privacy.md', title: 'セキュリティとプライバシー', group: '仕様書' },
  { id: 'spec/conformance.md', title: '対応範囲', group: '仕様書' },
  { id: 'license/01-mit.md', title: 'MITライセンス', group: 'ライセンス' },
  { id: 'license/02-third-party.md', title: '第三者ライセンス', group: 'ライセンス' },
];

export function getHelpMarkdown(id: string): string {
  return markdownModules[`../docs/${id}`] ?? '';
}
