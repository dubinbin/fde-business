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

## Android / Flutter FCM

Flutter 接收端位于 `/Users/ryderdu/Desktop/testapp/pushapp`，Android 包名 `com.example.pushapp`，Firebase 测试项目 `push-lab-android-20261022`。

1. 在 Android App 点击「启用通知」，允许系统通知。
2. 将 App 生成的专属链接复制到电脑打开（`/android#...`）。
3. 按 Home 或锁屏，在电脑点击「发送 Android 推送」。
4. 点击系统通知进入原生「是 / 否」页面，点击任一按钮弹出对应对话框。

后台／未运行时使用 FCM notification 消息由系统展示，前台由 flutter_local_notifications 展示同一通知渠道 `push_test`。链接包含 AES-GCM 加密的单设备 FCM token，30 天有效，不依赖内存或数据库；FCM token 轮换后 App 自动重新配对。链接持有者可向该设备发送固定测试通知，请勿公开。App 不保存用户回复。

Vercel Production 增加服务端环境变量 `FIREBASE_SERVICE_ACCOUNT_JSON`（完整服务账号 JSON，不得添加 NEXT_PUBLIC_ 前缀或提交 Git）。专用账号 `vercel-push-sender` 仅授予该测试项目的 `roles/firebasecloudmessaging.admin`。沿用 `PUSH_TOKEN_SECRET` 加密配对链接。`POST /api/android/register` 接收设备 token，返回发送链接；`POST /api/android/push` 要求同源请求及有效链接，只发送固定测试内容。

这仍是单设备测试工具，未提供生产级账户授权、撤销链接或分布式限流。API 成功只表示 FCM 接受消息，不能据此判断已送达。Android 系统「强行停止」后需重新打开 App；Google 服务网络、通知权限及厂商省电策略仍可能影响投递。
