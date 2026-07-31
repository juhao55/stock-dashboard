export interface Quote {
  code: string;
  name: string;
  sector: string;
  last: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  changePct: number;
  volume: number; // 手
  amount: number; // 万元
  turnoverRate: number; // %
  volumeRatio: number;
  pe: number;
  pb: number;
  marketCap: number; // 亿元
  dividendYield: number; // %
  updatedAt: string;
}

export interface KlinePoint {
  date: string;
  open: number;
  close: number;
  low: number;
  high: number;
  volume: number;
}

export interface IntradayPoint {
  time: string;
  price: number;
  avgPrice: number;
  volume: number;
}

export interface QuoteProvider {
  listQuotes(): Promise<Quote[]>;
  getKline(code: string, limit?: number): Promise<KlinePoint[]>;
  getIntraday(code: string): Promise<IntradayPoint[]>;
  // 按代码查询单只股票（供搜索后加入自选），查不到返回 null
  getQuote(code: string): Promise<Quote | null>;
  // 运行期实际生效的数据接口（用于界面如实展示"现在用的是哪个接口"）
  lastListSource?: string;
  lastKlineSource?: string;
  lastIntradaySource?: string;
}

export interface ProviderConfig {
  mode: 'mock' | 'tencent-public' | 'broker-http';
  brokerBaseUrl?: string;
  brokerToken?: string;
}

export interface ScreenerCriteria {
  sector: string;
  minChangePct?: number;
  maxChangePct?: number;
  maxPe?: number;
  minTurnoverRate?: number;
  minVolumeRatio?: number;
  minAmount?: number; // 万元
  minMarketCap?: number; // 亿元
  maxMarketCap?: number; // 亿元
  minDividendYield?: number;
}

export type StrategyId = 'all' | 'strong' | 'breakout' | 'lowValuation' | 'dividend' | 'largeCap';
