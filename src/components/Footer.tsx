import { BrandMark } from './Nav';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line-soft">
      <div className="shell py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-2.5">
              <BrandMark size={20} />
              <span className="text-[13.5px] text-cream">
                 <span className="text-teal">FDE</span> 场景实验室
              </span>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
              本站是场景演示环境：所有数据均为匿名化的模拟数据，计算逻辑在浏览器本地执行，未连接任何
              ERP、MES、PLM 或供应商系统，也未接入真实模型服务。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-[12.5px] sm:text-right">
            <span className="text-muted">场景数量</span>
            <span className="num text-cream">9</span>
            <span className="text-muted">数据来源</span>
            <span className="text-cream">本地模拟数据</span>
            <span className="text-muted">模型调用</span>
            <span className="text-cream">无（规则计算）</span>
          </div>
        </div>
        <p className="mt-8 border-t border-line-soft pt-5 text-[11.5px] leading-relaxed text-muted">
          2026 © FDE 场景实验室. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
