import { STOCK_DICT, type DictStock } from './stockDict';

export interface SearchHit {
  market: string; // sh / sz / bj
  code: string; // 6 位纯数字
  name: string;
}

// 离线搜索：按「代码 / 名称 / 拼音」匹配内置股票字典，无需联网、无需 CORS 代理。
// 名称搜索走本地字典，稳定可用；字典未收录的个股可直接输入 6 位代码添加（见 normalizeCode）。
export async function searchStocks(keyword: string): Promise<SearchHit[]> {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return [];
  const isDigit = /^\d+$/.test(kw);
  const matches = STOCK_DICT.filter((item: DictStock) => {
    if (isDigit) return item.code.includes(kw);
    return item.name.toLowerCase().includes(kw) || item.py.includes(kw);
  }).slice(0, 40);
  return matches.map((item) => ({ market: item.market, code: item.code, name: item.name }));
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
