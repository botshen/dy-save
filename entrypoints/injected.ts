 
export default defineUnlistedScript(async () => {
  console.warn('[DY-SAVE][INJECTED] 注入脚本已加载');

  // 从 main world 中获取抖音数据的函数
  const fetchAwemeData = async (awemeId: string) => {
    const queryString = `aweme_id=${awemeId}&aid=6383&version_code=190500`;
    const url = `https://www.douyin.com/aweme/v1/web/aweme/detail?${queryString}`;

    try {
      console.error('[DY-SAVE][INJECTED] 开始请求抖音 API, awemeId:', awemeId);
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();
      console.error('[DY-SAVE][INJECTED] 抖音 API 响应:', data);

      // 解析视频清晰度信息
      const awemeDetail = data.aweme_detail;
      if (!awemeDetail) {
        throw new Error('视频数据不存在');
      }

      // 提取并排序清晰度选项（从高到低）
      const qualities = (awemeDetail.video?.bit_rate || [])
        .map((item: any) => {
          // 确定编码格式 - ByteVC1 优先级最高
          let codec = 'H264';
          if (item.is_bytevc1 === 1) {
            codec = 'ByteVC1';
          } else if (item.is_h265 === 1) {
            codec = 'H265';
          }

          console.error(`[DY-SAVE][INJECTED] 清晰度选项: ${item.gear_name}, 编码: ${codec}, is_bytevc1: ${item.is_bytevc1}, is_h265: ${item.is_h265}`);

          return {
            quality: item.gear_name,
            qualityType: item.quality_type,
            bitRate: item.bit_rate,
            width: item.play_addr?.width || 0,
            height: item.play_addr?.height || 0,
            size: item.play_addr?.data_size || 0,
            urls: item.play_addr?.url_list || [],
            format: item.format,
            isH265: item.is_h265 === 1,
            isByteVC1: item.is_bytevc1 === 1,
            codec: codec,
            fps: item.FPS || 0
          };
        })
        .sort((a: any, b: any) => {
          // 1. 先按分辨率（高度）降序
          if (b.height !== a.height) {
            return b.height - a.height;
          }

          // 2. 分辨率相同时，按编码效率排序：ByteVC1 > H265 > H264
          const codecPriority: any = { 'ByteVC1': 3, 'H265': 2, 'H264': 1 };
          const codecDiff = (codecPriority[b.codec] || 0) - (codecPriority[a.codec] || 0);
          if (codecDiff !== 0) {
            return codecDiff;
          }

          // 3. 如果编码格式相同，按比特率降序
          return b.bitRate - a.bitRate;
        });

      const videoInfo = {
        awemeId: awemeDetail.aweme_id,
        title: awemeDetail.desc || '未命名视频',
        author: awemeDetail.author?.nickname || '未知作者',
        duration: awemeDetail.duration,
        cover: awemeDetail.video?.cover?.url_list?.[0] || '',
        qualities: qualities,
        // 无水印下载地址
        downloadUrls: awemeDetail.video?.download_addr?.url_list || []
      };

      console.error('[DY-SAVE][INJECTED] 解析后的视频信息:', videoInfo);

      // 将结果发送回 content script
      window.postMessage({
        type: 'DY_SAVE_RESPONSE',
        action: 'fetchAweme',
        data: videoInfo,
        success: true
      }, '*');
    } catch (error) {
      console.error('[DY-SAVE][INJECTED] 请求抖音 API 失败:', error);

      // 发送错误信息回 content script
      window.postMessage({
        type: 'DY_SAVE_RESPONSE',
        action: 'fetchAweme',
        error: error instanceof Error ? error.message : '未知错误',
        success: false
      }, '*');
    }
  };

  // 监听来自 content script 的消息
  window.addEventListener('message', (event) => {
    // 只接受来自当前页面的消息
    if (event.source !== window) return;

    if (event.data.type === 'DY_SAVE_REQUEST' && event.data.action === 'fetchAweme') {
      console.error('[DY-SAVE][INJECTED] 收到 fetchAweme 请求');
      const awemeId = event.data.awemeId;
      if (awemeId) {
        fetchAwemeData(awemeId);
      } else {
        console.error('[DY-SAVE][INJECTED] 缺少 awemeId 参数');
      }
    }
  });
});
