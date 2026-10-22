# Push Lab

Next.js App Router + Web Push + Service Worker 的端到端测试应用，部署于 Vercel。

## 测试流程

1. 接收设备打开 `/receive`，点击「启用接收通知」并允许通知。
2. 复制生成的专属发送链接，在发送设备打开。也可以在同一设备的另一标签页打开。
3. 关闭接收端网页，点击发送页面唯一的「发送推送」按钮。
4. 在接收设备点击系统通知，打开 `/respond.html`，页面只有「是」「否」两个按钮，点击弹出对应 alert。

页面关闭不影响 Web Push。设备需要联网，浏览器和系统需允许后台通知；强制退出浏览器、系统省电策略等可能阻止或延迟送达。iOS / iPadOS 16.4+ 需先添加到主屏幕，再从主屏幕授权。API 返回成功仅代表推送服务已接受，不表示用户已经收到。

## 本地开发

Node.js 22+，`npm ci`。复制 `.env.example` 为 `.env.local`。运行 `npx web-push generate-vapid-keys` 生成 VAPID 密钥对，以 `openssl rand -hex 32` 生成 PUSH_TOKEN_SECRET。填写 VAPID_SUBJECT（站点 HTTPS URL 或 mailto 联系地址），执行 `npm run dev`。

`npm test` 验证加密配对、失效、篡改与地址验证；`npm run build` 验证完整构建。

## Vercel

仓库 `vercel.json` 设置 Next.js 框架、构建和输出目录。Vercel 环境变量设置 `.env.example` 中四个变量，再 push 到 main 自动部署。服务端私钥与 token secret 不可使用 NEXT_PUBLIC_ 前缀，不可提交到 Git。密钥轮换后在接收端重新启用通知。

## 无数据库配对

订阅由服务端使用 AES-256-GCM 加密签名为 30 天有效的 token，放在专属发送链接的 URL fragment 内；fragment 不会随页面请求发送至服务器。发送时经 POST 交给同一站点后端，解密后由 web-push 真实投递到浏览器推送服务。不使用内存订阅列表或本地文件，适用于 Vercel 多实例与冷启动。

专属链接相当于对该设备的测试发送权限，请勿公开。测试版每个链接只发送给一个接收设备，不提供广播、账号管理、回复持久化；「是 / 否」只在本地弹出 alert。链接过期或订阅失效后重新生成。通知响应页由 Service Worker 预缓存，可离线打开。
