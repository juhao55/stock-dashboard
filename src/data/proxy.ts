// 新浪实时快照与东方财富都不返回 CORS 头，纯前端（如 GitHub Pages）直连会被浏览器拦截。
// 通过可选的 CORS 代理转发请求即可正常使用。
//
// 约定：代理地址为"前缀"，目标 URL 会以 encodeURIComponent 追加在其后。
// 例如默认 allorigins：`https://api.allorigins.win/raw?url=` + encodeURIComponent(target)
//
// 注意：
// - 新浪实时快照接口（hq.sinajs.cn）还会校验 Referer，需使用会转发
//   `Referer: https://finance.sina.com.cn` 的代理；新浪的 K线/分时走 JSONP，无需代理。
// - 公共代理可能不稳定，可在界面里替换成你自己的后端代理地址。
// - 留空 '' 表示直连（仅腾讯公开行情可直连；新浪/东财需代理或由自建后端转发）。

export const DEFAULT_CORS_PROXY = 'https://api.allorigins.win/raw?url=';

export function proxied(url: string, proxy: string | undefined): string {
  if (!proxy) return url;
  return proxy + encodeURIComponent(url);
}
