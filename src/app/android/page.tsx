'use client';
import { useEffect, useState } from 'react';
export default function AndroidSend() {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('正在读取接收设备…');
  useEffect(() => {
    const value = location.hash.slice(1); setToken(value);
    setStatus(value ? 'Android 设备已配对。可以将 App 切到后台或锁屏，再发送通知。' : '请先在 Android App 启用通知，再复制 App 中的专属发送链接到电脑打开。');
  }, []);
  async function send() {
    setBusy(true); setStatus('正在发送…');
    try {
      const response = await fetch('/api/android/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setStatus(data.message);
    } catch (error) { setStatus(error instanceof Error ? error.message : '发送失败'); }
    finally { setBusy(false); }
  }
  return <main><a className="brand" href="/">◉ PUSH LAB</a><div className="eyebrow">03 / ANDROID · FCM</div><h1>原生通知，<br/><span>送到 Android。</span></h1><p className="intro">Flutter App + Firebase Cloud Messaging 真机测试。</p><section className="panel"><div className="status" role="status">{status}</div><button disabled={!token || busy} onClick={send}>{busy ? '正在发送…' : '发送 Android 推送'}<span>↗</span></button></section><footer>点击系统通知 → 是 / 否 → 弹窗<br/>FCM 接收成功不代表设备已送达。请勿公开专属链接。</footer></main>;
}
