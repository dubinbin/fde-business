import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '門禁控制 · 開門審批', description: '門禁申請及推送審批示範', manifest: '/manifest.webmanifest', referrer: 'no-referrer' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-HK"><body>{children}</body></html>;
}
