# 股票看盘选股终端（手机可用）

React + TypeScript + ECharts 实现的单页股票看盘与选股工具，可静态托管、手机浏览器直接访问。

## 功能
- 行情列表：红涨绿跌、成交额 / 换手率 / 量比 / PE / 市值
- 板块成交额热力、板块平均涨跌幅
- 个股分时图、日 K + 成交量
- 自选股标记、自动刷新
- 条件选股 + 快捷策略（强势上涨 / 放量突破 / 低估值 / 高股息 / 大盘蓝筹）

## 数据源（顶部可切换）
- 本地模拟行情（默认，保证可运行）
- 券商 HTTP 行情（需自备 /quotes、/kline、/intraday 接口 + Token）
- 腾讯公开行情（无需 Token，纯前端直连，公开行情仅演示用）

## 本地运行
```bash
npm install      # 若网络受限，加 --cache .npm-cache --no-audit --no-fund
npm run dev      # 默认 http://127.0.0.1:5173
npm run build    # 产物在 dist/
npm run preview  # 预览构建产物
```

## 部署到 GitHub Pages（手机访问）
1. 在 GitHub 新建空仓库（例如 `stock-dashboard`）。
2. 在本项目目录执行：
   ```bash
   git init
   git add .
   git commit -m "init stock dashboard"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/stock-dashboard.git
   git push -u origin main
   ```
   > 确保主分支名为 `main`（与 `.github/workflows/deploy.yml` 一致）。
3. 仓库 → Settings → Pages → Build and deployment → Source 选 **GitHub Actions**。
4. 推送后 Actions 自动构建并发布；访问 `https://<你的用户名>.github.io/stock-dashboard/` 即可，手机浏览器直接打开。

> 提示：`vite.config.ts` 的 `base` 已设为 `./`，项目页子路径可正常加载。
> 若接券商行情 + Token，请勿把 Token 写进前端，需自建后端代理。
