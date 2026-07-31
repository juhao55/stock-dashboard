import { DEFAULT_CORS_PROXY, proxied } from './proxy';

export interface SearchHit {
  market: string; // sh / sz / bj
  code: string; // 6 位纯数字
  name: string;
}

// 把 \uXXXX 这类 JSON 风格转义还原成中文（腾讯 smartbox 返回的是转义后的名称）
function decodeUnicodeEscapes(input: string): string {
  return input.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// 腾讯智能选股联想接口：smartbox.gtimg.cn —— 注意该域名不返回 CORS 头，
// 因此纯前端（如 GitHub Pages）必须经由 CORS 代理访问；名称搜索依赖此接口。
// 返回形如 v_hint="sh~600519~\u8d35\u5dde\u8305\u53f0~gzmt~GP-A^sz~000001~..."
export async function searchStocks(keyword: string, proxy?: string): Promise<SearchHit[]> {
  const target = `https://smartbox.gtimg.cn/s3/?v=2&t=all&q=${encodeURIComponent(keyword)}`;
  const url = proxied(target, proxy || DEFAULT_CORS_PROXY);
  const response = await fetch(url, { headers: { Referer: 'https://gu.qq.com/' } });
  if (!response.ok) throw new Error(`搜索请求失败：HTTP ${response.status}`);
  const text = await response.text();
  const match = text.match(/v_hint="([^"]*)"/);
  if (!match) return [];
  const inner = decodeUnicodeEscapes(match[1]);
  return inner
    .split('^')
    .map((entry) => {
      const [market = '', code = '', name = ''] = entry.split('~');
      return { market, code, name };
    })
    .filter((hit) => /^\d{6}$/.test(hit.code) && (hit.market === 'sh' || hit.market === 'sz' || hit.market === 'bj'));
}

// 把用户输入补全为完整的带市场前缀代码（如 600519 -> sh600519）。
// 返回 null 表示无法识别。
export function normalizeCode(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (!value) return null;
  if (/^(sh|sz|bj)\d{6}$/.test(value)) return value;
  if (/^\d{6}$/.test(value)) {
    const head = value[0];
    if (head === '6' || head === '9') return `sh${value}`; // 沪市 / 科创板(688) / 沪市配股等
    if (head === '0' || head === '3') return `sz${value}`; // 深市 / 创业板
    if (head === '4' || head === '8') return `bj${value}`; // 北交所
  }
  return null;
}
