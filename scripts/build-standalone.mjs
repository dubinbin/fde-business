/**
 * 生成完全内联的单文件版本 standalone.html：
 * 所有 JS 与 CSS 内嵌进一个 HTML 文件，双击即可打开，不依赖任何服务器。
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const outDir = join(tmpdir(), 'fde-standalone');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2019'],
  outdir: outDir,
  entryNames: 'app',
  define: { 'process.env.NODE_ENV': '"production"' },
  jsx: 'automatic',
  logLevel: 'error',
});

const js = readFileSync(join(outDir, 'app.js'), 'utf8');
const css = readFileSync(join(outDir, 'app.css'), 'utf8');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>FDE 场景实验室</title>
<meta name="description" content="面向制造业的 FDE 场景实验室：可交互业务场景演示，全部为模拟数据。" />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23101312'/%3E%3Cpath d='M8 21.5V11h3.2l4 7.2V11h3v10.5h-3.1l-4.1-7.3v7.3H8z' fill='%233FD6B0'/%3E%3C/svg%3E" />
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${js.replace(/<\/script>/gi, '<\\/script>')}</script>
</body>
</html>
`;

writeFileSync('standalone.html', html);
console.log('standalone.html written:', (html.length / 1024).toFixed(0) + ' KB');
