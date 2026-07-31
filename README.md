# 股票看盘选股终端（手机可用）

React + TypeScript + ECharts 实现的单页股票看盘与选股工具，可静态托管、手机浏览器直接访问。

## 功能
- 行情列表：红涨绿跌、成交额 / 换手率 / 量比 / PE / 市值
- 板块成交额热力、板块平均涨跌幅
- 个股分时图、日 K + 成交量
- 自选股标记、自动刷新
- 条件选股 + 快捷策略（强势上涨 / 放量突破 / 低估值 / 高股息 / 大盘蓝筹）

## 数据源（顶部可切换）
- **腾讯公开行情（默认，推荐）**：列表 / 日 K / 分时均返回 `Access-Control-Allow-Origin: *`，**浏览器/手机可直连，无需代理**，打开即用。
- 新浪公开行情
  - 日 K / 分时：官方 JSONP 接口，**浏览器可直连**
  - 实时快照（`hq.sinajs.cn`）：该接口无 CORS 头且浏览器不允许 JS 设置 `Referer`，纯前端几乎无法获取；**失败时自动回退腾讯**以保证列表/选股可用
- 东方财富公开行情
  - 列表 / 日 K / 分时（`push2` / `push2his`）均无 CORS 头，需 CORS 代理；**代理不通时自动回退腾讯**以保证列表/选股可用
- 本地模拟行情
- 券商 HTTP 行情（需自备 /quotes、/kline、/intraday 接口 + Token）

### 关于容错
默认数据源为腾讯（直连最稳）。新浪实时、东方财富列表/图表依赖 CORS 代理，公共代理常不稳定；
代码已内置「代理失败 → 回退腾讯直连」的兜底，并给列表请求加了分组容错（单组超时不会整盘失败），
因此无论切换哪个公开源，行情列表与条件选股都不会再出现整页「请求失败」。

### 关于 CORS 代理
新浪实时快照与东方财富都不返回 CORS 头，纯前端（如 GitHub Pages）直连会被浏览器拦截。
界面切换新浪/东方财富后会出现「CORS 代理」输入框（默认 `https://api.allorigins.win/raw?url=`），
可替换为自建代理。代理地址为前缀，目标 URL 会自动 `encodeURIComponent` 追加。
公共代理可能不稳定，生产环境建议自建轻量代理（东方财富无需 Referer；新浪代理需转发 Referer）。
若代理不可用，上述兜底逻辑会自动改用腾讯数据，不影响使用。

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
