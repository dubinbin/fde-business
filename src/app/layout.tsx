import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Push Lab · 离线推送测试', description: 'Web Push + Service Worker 测试', manifest: '/manifest.webmanifest', referrer: 'no-referrer' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
