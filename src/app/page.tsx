import Link from 'next/link';
export default function Home() {
  return <main><a className="brand" href="/">◉ PUSH LAB</a><div className="eyebrow">WEB PUSH / PLAYGROUND</div><h1>页面关了，<br/><span>消息也能到。</span></h1><p className="intro">一个简单的离线推送实验。连接接收设备，发送通知，点击后用「是 / 否」回应。</p><div className="cards"><Link className="card" href="/receive"><span className="number">01 / RECEIVE</span><h2>我是接收端 ↗</h2><p>先在需要接收通知的设备上开启通知。</p></Link><Link className="card" href="/send"><span className="number">02 / SEND</span><h2>我是发送端 ↗</h2><p>用接收端生成的专属链接发送一条推送。</p></Link><Link className="card" href="/android"><span className="number">03 / ANDROID</span><h2>Android 原生推送 ↗</h2><p>使用 Flutter App 的专属链接发送 FCM 通知。</p></Link></div><footer>Next.js · Web Push · Service Worker<br/>无需保持页面打开 · 设备需要联网</footer></main>;
}
