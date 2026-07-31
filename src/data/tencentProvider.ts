import { IntradayPoint, KlinePoint, Quote, QuoteProvider } from '../types';

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

function toNumber(value: string | undefined, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatTencentTime(value: string | undefined): string {
  if (!value || value.length < 14) return new Date().toLocaleString('zh-CN', { hour12: false });
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)} ${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}`;
}

function formatMinute(value: string): string {
  return value.length === 4 ? `${value.slice(0, 2)}:${value.slice(2)}` : value;
}

async function fetchGbkText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`腾讯行情请求失败：HTTP ${response.status}`);
  const buffer = await response.arrayBuffer();
  return new TextDecoder('gbk').decode(buffer);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`腾讯行情请求失败：HTTP ${response.status}`);
  return (await response.json()) as T;
}

function chunk<T>(rows: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < rows.length; index += size) output.push(rows.slice(index, index + size));
  return output;
}

export class TencentQuoteProvider implements QuoteProvider {
  constructor(private readonly symbols: string[] = DEFAULT_SYMBOLS) {}

  async listQuotes(): Promise<Quote[]> {
    const groups = chunk(this.symbols, 40);
    const payloads = await Promise.all(
      groups.map(async (group) => {
        try {
          return await fetchGbkText(`https://qt.gtimg.cn/q=${group.join(',')}`);
        } catch {
          return '';
        }
      })
    );
    const quotes: Quote[] = [];

    payloads.forEach((text) => {
      const matches = text.matchAll(/v_([a-z0-9]+)="([^"]*)"/gi);
      for (const match of matches) {
        const code = match[1].toLowerCase();
        const fields = match[2].split('~');
        if (fields.length < 47 || !fields[2]) continue;
        const prevClose = toNumber(fields[4]);
        const last = toNumber(fields[3], prevClose);
        const changePct = toNumber(fields[32], prevClose ? ((last - prevClose) / prevClose) * 100 : 0);
        quotes.push({
          code,
          name: fields[1] || code,
          sector: 'A股',
          last,
          prevClose,
          open: toNumber(fields[5], last),
          high: toNumber(fields[33], last),
          low: toNumber(fields[34], last),
          changePct,
          volume: toNumber(fields[6]),
          amount: toNumber(fields[37]),
          turnoverRate: toNumber(fields[38]),
          volumeRatio: 1,
          pe: toNumber(fields[39]),
          pb: toNumber(fields[46]),
          marketCap: toNumber(fields[44]),
          dividendYield: 0,
          updatedAt: formatTencentTime(fields[30])
        });
      }
    });

    if (quotes.length === 0) throw new Error('腾讯行情未返回可用股票列表');
    return quotes.sort((a, b) => b.amount - a.amount);
  }

  async getKline(code: string, limit = 120): Promise<KlinePoint[]> {
    const payload = await fetchJson<{
      data?: Record<string, { qfqday?: string[][]; day?: string[][] }>;
    }>(`https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${encodeURIComponent(code)},day,,,${limit},qfq`);
    const node = payload.data?.[code];
    const rows = node?.qfqday ?? node?.day ?? [];
    return rows.map((row) => ({
      date: row[0] ?? '',
      open: toNumber(row[1]),
      close: toNumber(row[2]),
      high: toNumber(row[3]),
      low: toNumber(row[4]),
      volume: toNumber(row[5])
    }));
  }

  async getIntraday(code: string): Promise<IntradayPoint[]> {
    const payload = await fetchJson<{
      data?: Record<string, { data?: { data?: string[] } }>;
    }>(`https://ifzq.gtimg.cn/appstock/app/minute/query?code=${encodeURIComponent(code)}`);
    const rows = payload.data?.[code]?.data?.data ?? [];
    let previousVolume = 0;

    return rows.map((row) => {
      const [time = '', price = '0', cumulativeVolume = '0', cumulativeAmount = '0'] = row.split(' ');
      const totalVolume = toNumber(cumulativeVolume);
      const totalAmount = toNumber(cumulativeAmount);
      const volume = Math.max(0, totalVolume - previousVolume);
      previousVolume = totalVolume;
      return {
        time: formatMinute(time),
        price: toNumber(price),
        avgPrice: totalVolume > 0 ? totalAmount / (totalVolume * 100) : toNumber(price),
        volume
      } satisfies IntradayPoint;
    });
  }
}
