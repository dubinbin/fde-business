'use client';
import { useEffect, useState } from 'react';
export default function Receive() {
  const [status, setStatus] = useState('在这台设备上启用通知，然后把发送链接交给发送端。');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    const ok = window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (!ok) setStatus('当前环境不支持 Web Push。请使用 HTTPS 下的 Chrome、Edge、Firefox 或受支持的 Safari。iPhone / iPad 需要先添加到主屏幕再打开。');
    else navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => setStatus('Service Worker 注册失败，请刷新页面重试。'));
  }, []);
  async function enable() {
    setBusy(true); setLink('');
    try {
      // Ask on the user gesture, before network requests (required by Safari).
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('通知未获允许。请在浏览器的网站设置中允许通知后重试。');
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const registration = await navigator.serviceWorker.ready;
      const configResponse = await fetch('/api/config', { cache: 'no-store' });
      const config = await configResponse.json();
      if (!configResponse.ok) throw new Error(config.error);
      const bytes = Uint8Array.from(atob(config.publicKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && subscription.options.applicationServerKey &&
          Array.from(new Uint8Array(subscription.options.applicationServerKey)).join() !== Array.from(bytes).join()) {
        await subscription.unsubscribe(); subscription = null;
      }
      subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
      const response = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setLink(`${location.origin}/send#${data.token}`);
      setStatus('接收端已就绪。复制下面的链接到发送设备，即可关闭本页面测试推送。');
    } catch (error) { setStatus(error instanceof Error ? error.message : '启用失败，请重试'); }
    finally { setBusy(false); }
  }
  return <main><a className="brand" href="/">◉ PUSH LAB</a><div className="eyebrow">01 / RECEIVE</div><h1>让消息<br/><span>找到这台设备。</span></h1><p className="intro">一次授权，后台接收。点击通知后进入选择页面。</p><section className="panel"><div className="status" role="status">{status}</div><button disabled={busy || !supported} onClick={enable}>{busy ? '正在连接…' : link ? '重新生成发送链接' : '启用接收通知'}<span>↗</span></button>{link && <div className="share"><label htmlFor="send-link">此设备的专属发送链接（30 天有效）</label><textarea id="send-link" readOnly value={link} onFocus={event => event.target.select()}/><button className="secondary" onClick={async () => { try { await navigator.clipboard.writeText(link); setStatus('链接已复制，可以在另一台设备上打开发送。'); } catch { setStatus('请选中上方链接，手动复制。'); } }}>复制发送链接 <span>⧉</span></button><small>持有链接的人可以向这台设备推送，请仅分享给测试人员。</small></div>}</section><footer>iPhone / iPad：Safari → 分享 → 添加到主屏幕 → 从主屏幕打开。<br/>页面关闭后仍可接收；断网时等待恢复网络。系统与浏览器需要允许通知。</footer></main>;
}
