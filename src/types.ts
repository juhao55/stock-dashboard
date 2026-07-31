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
}

export interface ProviderConfig {
  mode: 'mock' | 'tencent-public' | 'sina-public' | 'eastmoney-public' | 'broker-http';
  brokerBaseUrl?: string;
  brokerToken?: string;
  corsProxy?: string;
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
