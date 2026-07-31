import { IntradayPoint, KlinePoint, Quote, QuoteProvider } from '../types';
import { sinaJsonp } from './jsonp';
import { proxied } from './proxy';

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

async function fetchGbkText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { Referer: 'https://finance.sina.com.cn' } });
  if (!response.ok) throw new Error(`新浪行情请求失败：HTTP ${response.status}`);
  const buffer = await response.arrayBuffer();
  return new TextDecoder('gbk').decode(buffer);
}

// 新浪实时快照（hq.sinajs.cn）：
// 字段按逗号分隔，常用索引：
// [0]名称 [1]今开 [2]昨收 [3]当前价 [4]最高 [5]最低
// [8]成交量(股) [9]成交额(元) [30]日期 [31]时间
// 该接口无 CORS 头且校验 Referer，需经会转发 Referer 的代理访问。
export class SinaQuoteProvider implements QuoteProvider {
  constructor(private readonly symbols: string[] = DEFAULT_SYMBOLS, private readonly proxy = '') {}

  async listQuotes(): Promise<Quote[]> {
    const groups = chunk(this.symbols, 50);
    const payloads = await Promise.all(
      groups.map((group) => fetchGbkText(proxied(`https://hq.sinajs.cn/list=${group.join(',')}`, this.proxy)))
    );
    const quotes: Quote[] = [];

    payloads.forEach((text) => {
      const matches = text.matchAll(/var\s+hq_str_([a-z0-9]+)="([^"]*)"/gi);
      for (const match of matches) {
        const code = match[1].toLowerCase();
        const fields = match[2].split(',');
        if (fields.length < 30 || !fields[0]) continue;
        const prevClose = toNumber(fields[2]);
        const last = toNumber(fields[3], prevClose);
        const changePct = prevClose ? ((last - prevClose) / prevClose) * 100 : 0;
        quotes.push({
          code,
          name: fields[0] || code,
          sector: 'A股',
          last,
          prevClose,
          open: toNumber(fields[1], last),
          high: toNumber(fields[4], last),
          low: toNumber(fields[5], last),
          changePct,
          volume: toNumber(fields[8]) / 100,
          amount: toNumber(fields[9]) / 10000,
          turnoverRate: 0,
          volumeRatio: 1,
          pe: 0,
          pb: 0,
          marketCap: 0,
          dividendYield: 0,
          updatedAt: `${fields[30] ?? ''} ${fields[31] ?? ''}`.trim()
        });
      }
    });

    if (quotes.length === 0) {
      throw new Error('新浪行情未返回可用股票（若使用代理，请确认代理会转发 Referer: finance.sina.com.cn）');
    }
    return quotes.sort((a, b) => b.amount - a.amount);
  }

  // 新浪日K / 分时 均通过 JSONP 接口（CN_MarketData.getKLineData）获取，可浏览器直连。
  // scale=240 为日K；scale=5 为5分钟K（用作分时近似）。
  async getKline(code: string, limit = 120): Promise<KlinePoint[]> {
    const url = `https://money.finance.sina.com.cn/quotes_service/api/jsonp_v2.php/var%20t=/CN_MarketData.getKLineData?symbol=${code}&scale=240&ma=no&datalen=${limit}`;
    const rows = (await sinaJsonp<Record<string, string>[]>(url)) ?? [];
    return rows.map((row) => ({
      date: row.day ?? '',
      open: toNumber(row.open),
      close: toNumber(row.close),
      high: toNumber(row.high),
      low: toNumber(row.low),
      volume: toNumber(row.volume) / 100
    }));
  }

  async getIntraday(code: string): Promise<IntradayPoint[]> {
    const url = `https://money.finance.sina.com.cn/quotes_service/api/jsonp_v2.php/var%20t=/CN_MarketData.getKLineData?symbol=${code}&scale=5&ma=no&datalen=48`;
    const rows = (await sinaJsonp<Record<string, string>[]>(url)) ?? [];
    return rows.map((row) => {
      const fullTime = row.day ?? '';
      const time = fullTime.split(' ')[1] ?? '';
      const high = toNumber(row.high);
      const low = toNumber(row.low);
      const close = toNumber(row.close);
      return {
        time: time.length >= 5 ? time.slice(0, 5) : time,
        price: close,
        avgPrice: (high + low + close) / 3,
        volume: toNumber(row.volume) / 100
      };
    });
  }
}
