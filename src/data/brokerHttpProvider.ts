import { IntradayPoint, KlinePoint, Quote, QuoteProvider } from '../types';
import { nowText } from '../utils/format';

function pickNumber(source: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = source[key];
    const parsed = typeof value === 'string' ? Number(value) : value;
    if (typeof parsed === 'number' && Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function pickString(source: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return fallback;
}

export class BrokerHttpProvider implements QuoteProvider {
  lastListSource?: string;
  lastKlineSource?: string;
  lastIntradaySource?: string;

  constructor(
    private readonly baseUrl: string,
    private readonly token?: string
  ) {}

  private async request<T>(path: string): Promise<T> {
    if (!this.baseUrl) {
      throw new Error('券商行情接口地址未配置');
    }
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : undefined
    });
    if (!response.ok) {
      throw new Error(`券商行情接口请求失败：HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  }

  async listQuotes(): Promise<Quote[]> {
    const payload = await this.request<unknown>('/quotes');
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { data?: unknown[] }).data)
        ? (payload as { data: unknown[] }).data
        : [];
    this.lastListSource = '券商 HTTP 接口';
    this.lastKlineSource = '券商 HTTP 接口';
    this.lastIntradaySource = '券商 HTTP 接口';
    return rows.map((row) => this.normalizeQuote(row as Record<string, unknown>));
  }

  async getQuote(code: string): Promise<Quote | null> {
    try {
      const payload = await this.request<unknown>(`/quote?code=${encodeURIComponent(code)}`);
      const row = (Array.isArray(payload) ? payload[0] : (payload as { data?: unknown }).data) as Record<string, unknown> | undefined;
      if (!row) return null;
      this.lastListSource = '券商 HTTP 接口';
      return this.normalizeQuote(row);
    } catch {
      return null;
    }
  }

  async getKline(code: string, limit = 80): Promise<KlinePoint[]> {
    const payload = await this.request<unknown>(`/kline?code=${encodeURIComponent(code)}&limit=${limit}`);
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { data?: unknown[] }).data)
        ? (payload as { data: unknown[] }).data
        : [];
    return rows.map((row) => {
      const item = row as Record<string, unknown>;
      return {
        date: pickString(item, ['date', 'day', 'tradeDate', 'time'], ''),
        open: pickNumber(item, ['open', 'o']),
        close: pickNumber(item, ['close', 'c', 'last']),
        low: pickNumber(item, ['low', 'l']),
        high: pickNumber(item, ['high', 'h']),
        volume: pickNumber(item, ['volume', 'vol', 'v'])
      } satisfies KlinePoint;
    });
  }

  async getIntraday(code: string): Promise<IntradayPoint[]> {
    const payload = await this.request<unknown>(`/intraday?code=${encodeURIComponent(code)}`);
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { data?: unknown[] }).data)
        ? (payload as { data: unknown[] }).data
        : [];
    return rows.map((row) => {
      const item = row as Record<string, unknown>;
      return {
        time: pickString(item, ['time', 'minute', 'tradeTime'], ''),
        price: pickNumber(item, ['price', 'last', 'close']),
        avgPrice: pickNumber(item, ['avgPrice', 'avg', 'averagePrice']),
        volume: pickNumber(item, ['volume', 'vol'])
      } satisfies IntradayPoint;
    });
  }

  private normalizeQuote(item: Record<string, unknown>): Quote {
    const prevClose = pickNumber(item, ['prevClose', 'preClose', 'yesterdayClose', 'close'], 1);
    const last = pickNumber(item, ['last', 'price', 'now', 'current'], prevClose);
    const changePct = pickNumber(item, ['changePct', 'pctChange', 'riseFallRate'], prevClose ? ((last - prevClose) / prevClose) * 100 : 0);
    return {
      code: pickString(item, ['code', 'symbol', 'stockCode'], 'UNKNOWN'),
      name: pickString(item, ['name', 'stockName', 'displayName'], '未命名标的'),
      sector: pickString(item, ['sector', 'industry', 'board'], '未分类'),
      last,
      prevClose,
      open: pickNumber(item, ['open', 'todayOpen'], last),
      high: pickNumber(item, ['high', 'dayHigh'], last),
      low: pickNumber(item, ['low', 'dayLow'], last),
      changePct,
      volume: pickNumber(item, ['volume', 'vol']),
      amount: pickNumber(item, ['amount', 'turnover', 'amountWan']),
      turnoverRate: pickNumber(item, ['turnoverRate', 'turnoverRatio']),
      volumeRatio: pickNumber(item, ['volumeRatio', 'volRatio'], 1),
      pe: pickNumber(item, ['pe', 'peTtm', 'PE_TTM']),
      pb: pickNumber(item, ['pb', 'PB']),
      marketCap: pickNumber(item, ['marketCap', 'totalMarketCap', 'mv']),
      dividendYield: pickNumber(item, ['dividendYield', 'dy', 'dividendRate']),
      updatedAt: pickString(item, ['updatedAt', 'time', 'quoteTime'], nowText())
    };
  }
}
