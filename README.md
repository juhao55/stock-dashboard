# 股票看盘选股终端（手机可用）

React + TypeScript + ECharts 实现的单页股票看盘与选股工具，可静态托管、手机浏览器直接访问。

## 功能
- 行情列表：红涨绿跌、成交额 / 换手率 / 量比 / PE / 市值
- 板块成交额热力、板块平均涨跌幅
- 个股分时图、日 K + 成交量
- 自选股标记、自动刷新
- 条件选股 + 快捷策略（强势上涨 / 放量突破 / 低估值 / 高股息 / 大盘蓝筹）
- **股票搜索**：默认列表约 70 只，可在「行情」页顶部搜索框 **按代码（如 600519）或按名称/拼音（如「茅台」「maotai」）联想添加**；名称搜索走内置离线字典，**无需联网、无需代理**，词典未收录的个股可直接输入 6 位代码添加任意股票
- **数据源标识**：界面顶部实时显示「当前数据源」与「列表实际取自」，个股图表下方显示分时 / 日 K 实际接口的生效来源，一眼看清现在用的是哪个接口

## 数据源（顶部可切换）
- **腾讯公开行情（默认，推荐）**：列表 / 日 K / 分时均返回 `Access-Control-Allow-Origin: *`，**浏览器/手机可直连，无需代理**，打开即用，为真实行情。
- 本地模拟行情
- 券商 HTTP 行情（需自备 /quotes、/kline、/intraday 接口 + Token）

> 已移除新浪、东方财富两个数据源：它们在纯浏览器（如 GitHub Pages）下没有 CORS 头，实时列表/图表需依赖 CORS 代理，公共代理极不稳定，实测几乎无法稳定使用。为保证开箱即用、稳定真实，现仅保留可直接浏览器直连的腾讯公开行情（以及本地模拟、券商接口）。

### 关于股票搜索
- **按代码添加（推荐）**：在搜索框输入 6 位代码（如 `600519`、`000001`）或带前缀（`sh600519`），回车即加入自选并查看，直连腾讯行情，**无需代理、支持任意 A股/科创板/创业板/北交所代码**。
- **按名称 / 拼音联想**：输入中文名称（如「茅台」「宁德」）或全拼（如 `maotai`、`ningde`），基于内置股票字典（含 A股主板 / 科创 / 创业 / 北交所主流标的）即时联想，**完全离线、不依赖网络或代理**，结果稳定可用。
- 字典仅覆盖主流标的；若搜不到想加的个股，直接输入其 6 位代码即可添加任意股票。

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
