'use client';
import { useEffect, useState } from 'react';
export default function Send() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('正在读取接收设备…');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const value = location.hash.slice(1);
    setToken(value);
    setStatus(value ? '接收设备已配对。可以关闭接收端页面，再点击下方按钮。' : '还未配对。请先在接收端启用通知，再打开生成的专属发送链接。');
  }, []);
  async function send() {
    setBusy(true); setStatus('正在发送…');
    try {
      const response = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setStatus(data.message);
    } catch (error) { setStatus(error instanceof Error ? error.message : '发送失败，请稍后重试'); }
    finally { setBusy(false); }
  }
  return <main><a className="brand" href="/">◉ PUSH LAB</a><div className="eyebrow">02 / SEND</div><h1>按一下，<br/><span>送达另一端。</span></h1><p className="intro">发送一条真实的 Web Push 测试通知。</p><section className="panel"><div className="status" role="status">{status}</div><button disabled={!token || busy} onClick={send}>{busy ? '正在发送…' : '发送推送'}<span>↗</span></button></section><footer>{!token && <a href="/receive">前往接收端配对 ↗</a>}<p>通知标题：收到一条测试推送<br/>点击通知 → 是 / 否 → 弹出 alert</p></footer></main>;
}
