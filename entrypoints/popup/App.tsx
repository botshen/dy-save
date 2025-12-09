import { useState, useEffect } from 'react';
import "./App.css";

interface VideoQuality {
  quality: string;
  qualityType: number;
  bitRate: number;
  width: number;
  height: number;
  size: number;
  urls: string[];
  format: string;
  isH265: boolean;
  isByteVC1: boolean;
  codec: string;
  fps: number;
}

interface VideoInfo {
  awemeId: string;
  title: string;
  author: string;
  duration: number;
  cover: string;
  qualities: VideoQuality[];
  downloadUrls: string[];
}

function App() {
  const [awemeId, setAwemeId] = useState('7573511267193880283');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 监听来自 content script 的消息
    browser.runtime.onMessage.addListener((message) => {
      console.error('[DY-SAVE][POPUP] 收到消息:', message);

      if (message.type === 'DY_SAVE_RESPONSE' && message.action === 'fetchAweme') {
        setLoading(false);

        if (message.success) {
          setVideoInfo(message.data);
          setError('');
          console.error('[DY-SAVE][POPUP] 视频信息:', message.data);
        } else {
          setError(message.error || '获取视频信息失败');
          setVideoInfo(null);
        }
      }
    });
  }, []);

  const handleFetch = async () => {
    if (!awemeId.trim()) {
      setError('请输入视频 ID');
      return;
    }

    setLoading(true);
    setError('');
    setVideoInfo(null);

    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      browser.tabs.sendMessage(tab.id, {
        action: 'fetchAweme',
        awemeId: awemeId.trim()
      });
    }
  };

  const handleDownload = async (quality: VideoQuality) => {
    if (!videoInfo) return;

    console.error('[DY-SAVE][POPUP] 开始下载，清晰度:', quality);

    // 发送下载请求到 background
    browser.runtime.sendMessage({
      action: 'downloadVideo',
      videoInfo: {
        awemeId: videoInfo.awemeId,
        title: videoInfo.title,
        author: videoInfo.author
      },
      quality: quality
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getQualityLabel = (quality: VideoQuality) => {
    const { width, height, codec, fps } = quality;
    const fpsText = fps > 0 ? ` ${fps}fps` : '';
    return `${height}p (${width}x${height})${fpsText} - ${codec}`;
  };

  return (
    <div style={{ padding: '20px', minWidth: '400px' }}>
      <h2>抖音视频下载</h2>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>
          视频 ID:
        </label>
        <input
          type="text"
          value={awemeId}
          onChange={(e) => setAwemeId(e.target.value)}
          placeholder="请输入抖音视频 ID"
          style={{
            width: '100%',
            padding: '8px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <button
        onClick={handleFetch}
        disabled={loading}
        style={{
          width: '100%',
          padding: '10px',
          marginBottom: '20px'
        }}
      >
        {loading ? '获取中...' : '获取视频信息'}
      </button>

      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#fee',
          color: '#c00',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {videoInfo && (
        <div>
          <h3 style={{ marginTop: 0 }}>视频信息</h3>
          <div style={{ marginBottom: '15px' }}>
            <p><strong>标题:</strong> {videoInfo.title}</p>
            <p><strong>作者:</strong> {videoInfo.author}</p>
            <p><strong>时长:</strong> {Math.round(videoInfo.duration / 1000)}秒</p>
          </div>

          <h3>选择清晰度下载</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {videoInfo.qualities.map((quality, index) => (
              <button
                key={index}
                onClick={() => handleDownload(quality)}
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#f9f9f9',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>
                  {getQualityLabel(quality)}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  大小: {formatSize(quality.size)} | 格式: {quality.format.toUpperCase()} | 比特率: {Math.round(quality.bitRate / 1000)}kbps
                </div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                  {quality.quality}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
