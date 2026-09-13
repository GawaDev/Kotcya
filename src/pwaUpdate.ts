import { registerSW } from 'virtual:pwa-register';

export function initPwaUpdate() {
  registerSW({
    immediate: true,
    onNeedReload() {
      // 編集中の画像を失わないよう自動再読み込みは行わない。
      // 次回起動時に更新済みアセットを使用する。
    },
  });
}
