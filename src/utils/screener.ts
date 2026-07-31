import { Quote, ScreenerCriteria, StrategyId } from '../types';

export const defaultCriteria: ScreenerCriteria = {
  sector: '全部',
  minChangePct: undefined,
  maxChangePct: undefined,
  maxPe: 30,
  minTurnoverRate: undefined,
  minVolumeRatio: undefined,
  minAmount: undefined,
  minMarketCap: undefined,
  maxMarketCap: undefined,
  minDividendYield: undefined
};

export interface StrategyDef {
  id: StrategyId;
  name: string;
  description: string;
  predicate: (quote: Quote) => boolean;
}

export const strategies: StrategyDef[] = [
  {
    id: 'all',
    name: '全部股票',
    description: '仅按左侧条件过滤',
    predicate: () => true
  },
  {
    id: 'strong',
    name: '强势上涨',
    description: '涨幅 ≥ 3%，量比 ≥ 1.5',
    predicate: (quote) => quote.changePct >= 3 && quote.volumeRatio >= 1.5
  },
  {
    id: 'breakout',
    name: '放量突破',
    description: '涨幅 ≥ 2%，量比 ≥ 2，且接近当日高点',
    predicate: (quote) => quote.changePct >= 2 && quote.volumeRatio >= 2 && quote.last >= quote.high * 0.995
  },
  {
    id: 'lowValuation',
    name: '低估值',
    description: 'PE 0~15，PB ≤ 2',
    predicate: (quote) => quote.pe > 0 && quote.pe <= 15 && quote.pb <= 2
  },
  {
    id: 'dividend',
    name: '高股息',
    description: '股息率 ≥ 3%',
    predicate: (quote) => quote.dividendYield >= 3
  },
  {
    id: 'largeCap',
    name: '大盘蓝筹',
    description: '总市值 ≥ 1000 亿',
    predicate: (quote) => quote.marketCap >= 1000
  }
];

function inRange(value: number, min?: number, max?: number): boolean {
  if (typeof min === 'number' && value < min) return false;
  if (typeof max === 'number' && value > max) return false;
  return true;
}

export function filterQuotes(quotes: Quote[], criteria: ScreenerCriteria, strategyId: StrategyId): Quote[] {
  const strategy = strategies.find((item) => item.id === strategyId) ?? strategies[0];
  return quotes
    .filter((quote) => (criteria.sector === '全部' ? true : quote.sector === criteria.sector))
    .filter((quote) => inRange(quote.changePct, criteria.minChangePct, criteria.maxChangePct))
    .filter((quote) => (typeof criteria.maxPe === 'number' ? quote.pe > 0 && quote.pe <= criteria.maxPe : true))
    .filter((quote) => (typeof criteria.minTurnoverRate === 'number' ? quote.turnoverRate >= criteria.minTurnoverRate : true))
    .filter((quote) => (typeof criteria.minVolumeRatio === 'number' ? quote.volumeRatio >= criteria.minVolumeRatio : true))
    .filter((quote) => (typeof criteria.minAmount === 'number' ? quote.amount >= criteria.minAmount : true))
    .filter((quote) => inRange(quote.marketCap, criteria.minMarketCap, criteria.maxMarketCap))
    .filter((quote) => (typeof criteria.minDividendYield === 'number' ? quote.dividendYield >= criteria.minDividendYield : true))
    .filter(strategy.predicate)
    .sort((a, b) => b.changePct - a.changePct || b.amount - a.amount);
}

export function uniqueSectors(quotes: Quote[]): string[] {
  return ['全部', ...Array.from(new Set(quotes.map((quote) => quote.sector))).sort((a, b) => a.localeCompare(b, 'zh-CN'))];
}
