/* 交互冒烟：在真实浏览器里点击并断言关键交互 */
const { chromium } = require('/Users/ryderdu/.workbuddy/binaries/node/workspace/node_modules/playwright');

const BASE = 'http://127.0.0.1:5199/#';
let fail = 0;
function ok(name, cond, extra = '') {
  if (!cond) fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' :: ' + extra : ''}`);
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  // 首页
  await page.goto(BASE + '/', { waitUntil: 'load' });
  ok('首页渲染标题', await page.getByText('把 AI 接入工厂的实际流程').isVisible());

  // 搜索 + 分类组合
  await page.getByLabel('搜索场景').fill('焊接');
  await page.waitForTimeout(150);
  const afterSearch = await page.locator('article').count();
  ok('搜索命中质量场景', afterSearch === 1, `cards=${afterSearch}`);

  await page.getByLabel('搜索场景').fill('不存在的关键词xyz');
  await page.waitForTimeout(150);
  ok('空结果状态', await page.getByText('没有匹配的场景').isVisible());
  await page.getByRole('button', { name: '清除筛选' }).click();
  await page.waitForTimeout(150);
  ok('清除筛选后恢复 9 张', (await page.locator('article').count()) === 9);

  // 分类过滤
  await page.getByRole('button', { name: '销售与报价' }).click();
  await page.waitForTimeout(150);
  ok('分类过滤：销售与报价 = 2', (await page.locator('article').count()) === 2);
  await page.getByRole('button', { name: '全部' }).click();
  await page.waitForTimeout(150);

  // 导航：体验报价演示
  await page.getByRole('link', { name: '体验报价演示' }).click();
  await page.waitForTimeout(400);
  ok('导航到报价场景', page.url().includes('/scenario/quote'), page.url());

  // 报价演示：载入示例
  await page.getByRole('button', { name: '载入示例' }).click();
  await page.waitForTimeout(900);
  ok('报价：出现识别条件', await page.getByText('识别出的询价条件').isVisible());
  const bodyText = await page.textContent('body');
  ok('报价：解析出 5000 台', bodyText.includes('5,000 台'), '');
  ok('报价：含税单价出现', /含税单价/.test(bodyText));

  // 修改数量 -> stale -> 重新计算
  const qtyInput = page.locator('input[type=number]').first();
  await qtyInput.fill('10000');
  await page.waitForTimeout(150);
  ok('修改输入后提示旧结果', await page.getByText('输入已修改，下方结果为上一次计算的旧结果').isVisible());
  await page.getByRole('button', { name: '重新计算' }).click();
  await page.waitForTimeout(900);
  const t2 = await page.textContent('body');
  ok('重算后数量变 10,000', t2.includes('10,000 台'));

  // 缺价场景
  await page.getByRole('button', { name: /关键物料缺价/ }).click();
  await page.getByRole('button', { name: /运行演示|重新计算/ }).click();
  await page.waitForTimeout(900);
  const t3 = await page.textContent('body');
  ok('缺价：成本待补全', t3.includes('成本待补全'));
  ok('缺价：不能出正式报价', t3.includes('不能生成正式报价'));
  ok('缺价：确认按钮锁定', await page.getByRole('button', { name: '模拟负责人确认' }).isDisabled());

  // 过期场景
  await page.getByRole('button', { name: /报价已过期/ }).click();
  await page.getByRole('button', { name: /运行演示|重新计算/ }).click();
  await page.waitForTimeout(900);
  const t4 = await page.textContent('body');
  ok('过期：提示需采购更新', t4.includes('需采购更新或书面确认'));

  // 回到完整数据并确认出单
  await page.getByRole('button', { name: /数据完整/ }).click();
  await page.getByRole('button', { name: /运行演示|重新计算/ }).click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: '模拟负责人确认' }).click();
  await page.waitForTimeout(300);
  const t5 = await page.textContent('body');
  ok('确认后生成演示报价单', t5.includes('已生成演示报价单'));
  ok('打印区存在', (await page.locator('.print-area').count()) > 0);

  // 重置
  await page.getByRole('button', { name: '重置' }).click();
  await page.waitForTimeout(300);
  ok('重置回到未运行', await page.getByText('尚未运行').isVisible());

  // 比价场景
  await page.goto(BASE + '/scenario/sourcing-compare', { waitUntil: 'load' });
  await page.getByRole('button', { name: '载入示例' }).click();
  await page.waitForTimeout(700);
  const t6 = await page.textContent('body');
  ok('比价：推荐方案出现', t6.includes('推荐方案'));
  ok('比价：最低单价不等于最优', /名义含税单价最低的是 供应商 A/.test(t6));
  ok('比价：推荐供应商 B', /推荐方案[\s\S]{0,200}供应商 B/.test(t6), t6.slice(t6.indexOf('推荐方案'), t6.indexOf('推荐方案') + 120));

  // BOM 对比
  await page.goto(BASE + '/scenario/bom-diff', { waitUntil: 'load' });
  await page.getByRole('button', { name: '载入示例' }).click();
  await page.waitForTimeout(700);
  const t7 = await page.textContent('body');
  ok('BOM：已知成本差异 +15.10', t7.includes('+15.10'), t7.match(/[+-]?\d+\.\d\d/g)?.slice(0, 5).join(','));
  ok('BOM：缺价待确认', t7.includes('待确认'));

  // 其余 6 个场景可运行
  for (const id of ['kit-shortage', 'insert-order', 'quality-evidence', 'eco-impact', 'cost-review', 'service-ticket']) {
    await page.goto(`${BASE}/scenario/${id}`, { waitUntil: 'load' });
    await page.getByRole('button', { name: '载入示例' }).click();
    await page.waitForTimeout(700);
    const txt = await page.textContent('body');
    ok(`[${id}] 运行后有结果`, !txt.includes('尚未运行') && /完成|待补充数据/.test(txt));
  }

  // 移动端无横向溢出
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(BASE + '/scenario/quote', { waitUntil: 'load' });
  await page.getByRole('button', { name: '载入示例' }).click();
  await page.waitForTimeout(900);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('移动端无横向溢出（报价页）', overflow <= 1, `overflow=${overflow}`);
  await page.goto(BASE + '/', { waitUntil: 'load' });
  const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('移动端无横向溢出（首页）', overflow2 <= 1, `overflow=${overflow2}`);

  ok('无 JS 运行时错误', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILED`);
  process.exit(fail === 0 ? 0 : 1);
})();
