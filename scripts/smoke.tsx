import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { Route, Routes } from 'react-router-dom';
import Home from '../src/pages/Home';
import ScenarioDetail from '../src/pages/ScenarioDetail';
import { SCENARIOS } from '../src/data/scenarios';

let fail = 0;
function ok(name: string, cond: boolean, extra = '') {
  if (!cond) fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' :: ' + extra : ''}`);
}

function render(path: string) {
  return renderToString(
    <StaticRouter location={path}>
      <Routes>
        <Route path="/scenario/:id" element={<ScenarioDetail />} />
      </Routes>
    </StaticRouter>,
  );
}

const home = renderToString(
  <StaticRouter location="/">
    <Home />
  </StaticRouter>,
);

ok('首页：主标题', home.includes('把 AI 接入工厂的实际流程'));
ok('首页：小标签', home.includes('MANUFACTURING / FORWARD DEPLOYED ENGINEERING'));
ok('首页：模拟声明', home.includes('以下为模拟数据交互演示，可按企业实际流程部署'));
ok('首页：交付标题', home.includes('从一个流程开始，做到可以验收'));
ok('首页：交付范围句', home.includes('交付范围包括数据连接、业务规则、操作界面、测试样本和运行记录'));
ok('首页：无虚构效率数字', !/%\s*(提升|效率)/.test(home));
ok('首页：分类齐全', ['全部', '销售与报价', '采购与供应链', '工程与数据', '生产与交付', '质量与售后'].every((c) => home.includes(c)));
ok(
  '首页：9 张卡片全部渲染',
  SCENARIOS.every((s) => home.includes(s.name)),
  SCENARIOS.filter((s) => !home.includes(s.name)).map((s) => s.name).join(','),
);
ok('首页：典型输入/输出物', home.includes('典型输入') && home.includes('输出物'));
ok('首页：打开演示按钮', (home.match(/打开演示/g) ?? []).length === 9);

for (const s of SCENARIOS) {
  const html = render(`/scenario/${s.id}`);
  ok(`[${s.id}] 标题`, html.includes(s.name));
  ok(`[${s.id}] 业务问题`, html.includes(s.question.slice(0, 8)));
  ok(`[${s.id}] 返回场景库`, html.includes('返回场景库'));
  ok(`[${s.id}] 演示区三按钮`, ['载入示例', '运行演示', '重置'].every((t) => html.includes(t)));
  ok(`[${s.id}] 处理依据入口`, html.includes('查看处理依据'));
  ok(`[${s.id}] 落地折叠区`, html.includes('落地到企业需要什么'));
  ok(`[${s.id}] 待测指标说明`, html.includes('不是已实现的提升'));
  ok(`[${s.id}] 模拟声明`, html.includes('模拟数据'));
}

const quote = render('/scenario/quote');
ok('报价：自然语言示例', quote.includes('给客户A报5000件控制器，目标毛利15%'));
ok('报价：产品编号', quote.includes('CTRL-001'));
ok('报价：数据状态三选', ['数据完整', '关键物料缺价', '报价已过期'].every((t) => quote.includes(t)));
ok('报价：未运行态', quote.includes('尚未运行'));

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
