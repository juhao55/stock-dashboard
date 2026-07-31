import { IntradayPoint, KlinePoint, Quote, QuoteProvider } from '../types';
import { proxied } from './proxy';
import { TencentQuoteProvider } from './tencentProvider';

const DEFAULT_SYMBOLS = [
  'sh600519', 'sh600036', 'sh601318', 'sh600030', 'sh601166', 'sh600276', 'sh600900', 'sh601888',
  'sh600585', 'sh600309', 'sh601012', 'sh600438', 'sh601899', 'sh600111', 'sh600050', 'sh601988',
  'sh601288', 'sh601398', 'sh601857', 'sh601088', 'sh600000', 'sh600016', 'sh601601', 'sh601211',
  'sh601688', 'sh600837', 'sh600703', 'sh600690', 'sh600887', 'sh601633', 'sh600406', 'sh600570',
  'sh600588', 'sh601360', 'sh601138', 'sh600745', 'sh600584', 'sh603501', 'sh603986', 'sh688981',
  'sh688012', 'sh688111', 'sh688008', 'sz000001', 'sz000002', 'sz000063', 'sz000100', 'sz000333',
  'sz000651', 'sz000858', 'sz002415', 'sz002475', 'sz002594', 'sz002714', 'sz002304', 'sz002352',
  'sz002460', 'sz002466', 'sz300059', 'sz300124', 'sz300274', 'sz300308', 'sz300433', 'sz300750', 'sz300760'
];

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function chunk<T>(rows: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < rows.length; index += size) output.push(rows.slice(index, index + size));
  return output;
}

// 东方财富用 secid 标识标的：沪市 1.xxxxxx，深市 0.xxxxxx。
function toSecid(code: string): string {
  if (code.startsWith('sh')) return `1.${code.slice(2)}`;
  if (code.startsWith('sz')) return `0.${code.slice(2)}`;
  return `1.${code}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`东方财富请求失败：HTTP ${response.status}`);
  return (await response.json()) as T;
}

// 列表字段：f12代码 f13市场 f14名称 f2现价 f3涨跌幅% f4涨跌额 f6成交额(元)
// f7换手率% f9市盈率(静) f10量比 f15最高 f16最低 f17今开 f18昨收 f20总市值(元) f21流通市值 f23市净率
const LIST_FIELDS = 'f12,f13,f14,f2,f3,f4,f6,f7,f9,f10,f15,f16,f17,f18,f20,f21,f23';

export class EastMoneyQuoteProvider implements QuoteProvider {
  lastListSource?: string;
  lastKlineSource?: string;
  lastIntradaySource?: string;

  constructor(private readonly symbols: string[] = DEFAULT_SYMBOLS, private readonly proxy = '') {}

  async listQuotes(): Promise<Quote[]> {
    try {
      const groups = chunk(this.symbols.map(toSecid), 50);
      const payloads = await Promise.all(
        groups.map(async (group) => {
          try {
            return await fetchJson<{ data?: { diff?: Record<string, number>[] } }>(
              proxied(
                `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=${LIST_FIELDS}&secids=${group.join(',')}`,
                this.proxy
              )
            );
          } catch {
            return null;
          }
        })
      );

      const quotes: Quote[] = [];
      payloads.forEach((payload) => {
        const diff = payload?.data?.diff ?? [];
        diff.forEach((d) => {
        const code = (d.f13 === 1 ? 'sh' : 'sz') + d.f12;
        const last = toNumber(d.f2);
        const prevClose = toNumber(d.f18);
        const amount = toNumber(d.f6); // 元
        const marketCap = toNumber(d.f20); // 元
        quotes.push({
          code,
          name: String(d.f14 ?? code),
          sector: 'A股',
          last,
          prevClose,
          open: toNumber(d.f17, last),
          high: toNumber(d.f15, last),
          low: toNumber(d.f16, last),
          changePct: toNumber(d.f3),
          // 成交额(元) / 均价(≈现价) / 100 ≈ 成交量(手)
          volume: last ? amount / (last * 100) : 0,
          amount: amount / 10000, // 万元
          turnoverRate: toNumber(d.f7),
          volumeRatio: toNumber(d.f10),
          pe: toNumber(d.f9),
          pb: toNumber(d.f23),
          marketCap: marketCap / 1e8, // 亿元
          dividendYield: 0,
          updatedAt: new Date().toLocaleString('zh-CN', { hour12: false })
        });
      });
    });

    if (quotes.length === 0) throw new Error('东方财富未返回可用股票');
    this.lastListSource = '东方财富（经 CORS 代理）';
    return quotes.sort((a, b) => b.amount - a.amount);
    } catch {
      // 东方财富接口无 CORS 头，公共代理不通时回退腾讯直连，保证列表/选股可用。
      const fallback = await new TencentQuoteProvider(this.symbols).listQuotes();
      this.lastListSource = '腾讯公开行情（东方财富接口不可用，已自动回退）';
      return fallback;
    }
  }

  async getQuote(code: string): Promise<Quote | null> {
    try {
      const payload = await fetchJson<{ data?: { diff?: Record<string, unknown> } }>(
        proxied(
          `https://push2.eastmoney.com/api/qt/stock/get?secid=${toSecid(code)}&fields=${LIST_FIELDS}`,
          this.proxy
        )
      );
      const d = payload?.data?.diff;
      if (!d) return null;
      const last = toNumber(d.f2);
      const prevClose = toNumber(d.f18);
      const amount = toNumber(d.f6);
      const marketCap = toNumber(d.f20);
      return {
        code,
        name: String(d.f14 ?? code),
        sector: 'A股',
        last,
        prevClose,
        open: toNumber(d.f17, last),
        high: toNumber(d.f15, last),
        low: toNumber(d.f16, last),
        changePct: toNumber(d.f3),
        volume: last ? amount / (last * 100) : 0,
        amount: amount / 10000,
        turnoverRate: toNumber(d.f7),
        volumeRatio: toNumber(d.f10),
        pe: toNumber(d.f9),
        pb: toNumber(d.f23),
        marketCap: marketCap / 1e8,
        dividendYield: 0,
        updatedAt: new Date().toLocaleString('zh-CN', { hour12: false })
      };
    } catch {
      return new TencentQuoteProvider([code]).getQuote(code);
    }
  }

  async getKline(code: string, limit = 120): Promise<KlinePoint[]> {
    const url = proxied(
      `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${toSecid(code)}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58&klt=101&fqt=1&end=20500101&lmt=${limit}`,
      this.proxy
    );
    try {
      const payload = await fetchJson<{ data?: { klines?: string[] } }>(url);
      this.lastKlineSource = '东方财富日K（经 CORS 代理）';
      return (payload.data?.klines ?? []).map((line) => {
        const parts = line.split(',');
        return {
          date: parts[0] ?? '',
          open: toNumber(parts[1]),
          close: toNumber(parts[2]),
          high: toNumber(parts[3]),
          low: toNumber(parts[4]),
          volume: toNumber(parts[5]) // 手
        };
      });
    } catch {
      const fallback = await new TencentQuoteProvider([code]).getKline(code, limit);
      this.lastKlineSource = '腾讯公开行情（东方财富日K失败，已回退）';
      return fallback;
    }
  }

  async getIntraday(code: string): Promise<IntradayPoint[]> {
    const url = proxied(
      `https://push2his.eastmoney.com/api/qt/stock/trends2/get?secid=${toSecid(code)}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58&iscr=0&ndays=1`,
      this.proxy
    );
    try {
      const payload = await fetchJson<{ data?: { trends?: string[] } }>(url);
      this.lastIntradaySource = '东方财富分时（经 CORS 代理）';
      return (payload.data?.trends ?? []).map((line) => {
        const parts = line.split(',');
        const fullTime = parts[0] ?? '';
        const time = fullTime.split(' ')[1] ?? '';
        return {
          time: time.length >= 5 ? time.slice(0, 5) : time,
          price: toNumber(parts[2]),
          avgPrice: toNumber(parts[7]),
          volume: toNumber(parts[5]) // 手
        };
      });
    } catch {
      const fallback = await new TencentQuoteProvider([code]).getIntraday(code);
      this.lastIntradaySource = '腾讯分时（东方财富分时失败，已回退）';
      return fallback;
    }
  }
}
