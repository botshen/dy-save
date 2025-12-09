export default defineBackground(() => {
  console.error('[DY-SAVE][BACKGROUND] Background script 已加载', { id: browser.runtime.id });

  // 监听来自 popup 的下载请求
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.error('[DY-SAVE][BACKGROUND] 收到消息:', message);

    if (message.action === 'downloadVideo') {
      handleDownload(message.videoInfo, message.quality);
    }

    return true;
  });

  async function handleDownload(videoInfo: any, quality: any) {
    try {
      console.error('[DY-SAVE][BACKGROUND] 开始下载视频:', videoInfo, quality);

      // 获取第一个可用的 URL，优先使用包含 douyin.com 的链接
      const douyinUrl = quality.urls.find((url: string) => url.includes('douyin.com'));
      const downloadUrl = douyinUrl || quality.urls[0];
      if (!downloadUrl) {
        console.error('[DY-SAVE][BACKGROUND] 没有可用的下载链接');
        return;
      }

      console.error('[DY-SAVE][BACKGROUND] 选择的 URL 类型:', douyinUrl ? '抖音官方链接' : '备用链接');

      // 生成文件名
      const sanitizeFilename = (name: string) => {
        // 1. 先移除换行符、回车符、制表符等控制字符,替换为空格
        // 2. 过滤文件名中的非法字符,包括: < > : " / \ | ? * # % [ ]
        // 3. 将多个连续空格替换为单个空格
        // 4. 去除首尾空格
        return name
          .replace(/[\r\n\t]/g, ' ')
          .replace(/[<>:"/\\|?*#%\[\]]/g, '_')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 100);
      };

      const filename = `${sanitizeFilename(videoInfo.author)}_${sanitizeFilename(videoInfo.title)}_${quality.height}p.${quality.format}`;

      console.error('[DY-SAVE][BACKGROUND] 下载链接:', downloadUrl);
      console.error('[DY-SAVE][BACKGROUND] 文件名:', filename);

      // 使用 Chrome Downloads API 下载
      const downloadId = await browser.downloads.download({
        url: downloadUrl,
        filename,
        saveAs: true,
        conflictAction: 'uniquify'
      });

      console.error('[DY-SAVE][BACKGROUND] 下载已开始，ID:', downloadId);

      // 监听下载完成事件
      browser.downloads.onChanged.addListener((delta) => {
        if (delta.id === downloadId && delta.state?.current === 'complete') {
          console.error('[DY-SAVE][BACKGROUND] 下载完成:', filename);
        }
        if (delta.id === downloadId && delta.error) {
          console.error('[DY-SAVE][BACKGROUND] 下载失败:', delta.error.current);
        }
      });
    } catch (error) {
      console.error('[DY-SAVE][BACKGROUND] 下载失败:', error);
    }
  }
});
