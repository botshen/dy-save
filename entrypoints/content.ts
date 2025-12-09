import { injectScript } from 'wxt/utils/inject-script';

export default defineContentScript({
  matches: ['*://*.douyin.com/*'],
  async main() {
    console.error('[DY-SAVE][CONTENT] Content script 已加载');

    // 注入 injected script 到 main world
    await injectScript('/injected.js', {
      keepInDom: true
    });
    console.error('[DY-SAVE][CONTENT] Injected script 已注入');

    // 监听来自 injected script 的响应
    window.addEventListener('message', (event) => {
      // 只接受来自当前页面的消息
      if (event.source !== window) return;

      if (event.data.type === 'DY_SAVE_RESPONSE') {
        console.error('[DY-SAVE][CONTENT] 收到 injected script 响应:', event.data);

        // 将数据转发给 popup/background
        browser.runtime.sendMessage({
          type: 'DY_SAVE_RESPONSE',
          action: event.data.action,
          data: event.data.data,
          error: event.data.error,
          success: event.data.success
        }).catch(err => {
          console.error('[DY-SAVE][CONTENT] 发送消息到 runtime 失败:', err);
        });
      }
    });

    // 监听来自 popup/background 的消息
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.error('[DY-SAVE][CONTENT] 收到 runtime 消息:', message);

      if (message.action === 'fetchAweme') {
        // 转发给 injected script
        window.postMessage({
          type: 'DY_SAVE_REQUEST',
          action: 'fetchAweme',
          awemeId: message.awemeId
        }, '*');

        console.error('[DY-SAVE][CONTENT] 已转发消息到 injected script, awemeId:', message.awemeId);
      }

      return true; // 保持消息通道开启
    });
  },
});
