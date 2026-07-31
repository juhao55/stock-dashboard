import { IntradayPoint, KlinePoint, Quote, QuoteProvider } from '../types';
import { nowText } from '../utils/format';

interface SeedStock {
  code: string;
  name: string;
  sector: string;
  basePrice: number;
  marketCap: number;
  pe: number;
  pb: number;
  dividendYield: number;
}

const SECTORS = ['银行', '证券', '白酒', '医药', '半导体', '新能源车', '光伏', '软件', '消费电子', '军工', '地产', '有色'];

function hashCode(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildUniverse(): SeedStock[] {
  const result: SeedStock[] = [];
  for (let i = 1; i <= 72; i += 1) {
    const sector = SECTORS[(i - 1) % SECTORS.length];
    const code = `SIM${String(600000 + i * 7).padStart(6, '0')}`;
    const basePrice = 4 + (hashCode(code) % 1800) / 18;
    const marketCap = round(35 + (hashCode(`${code}-mc`) % 2600) + (sector === '银行' ? 1800 : 0), 0);
    result.push({
      code,
      name: `模拟${sector}${String(i).padStart(2, '0')}`,
      sector,
      basePrice: round(basePrice, 2),
      marketCap,
      pe: round(6 + (hashCode(`${code}-pe`) % 520) / 10, 1),
      pb: round(0.6 + (hashCode(`${code}-pb`) % 70) / 10, 1),
      dividendYield: round((hashCode(`${code}-dy`) % 65) / 10, 2)
    });
  }
  return result;
}

export class MockQuoteProvider implements QuoteProvider {
  private quotes: Quote[];

  constructor() {
    this.quotes = buildUniverse().map((item, index) => {
      const drift = ((hashCode(item.code) % 120) - 60) / 100;
      const prevClose = item.basePrice;
      const last = round(prevClose * (1 + drift / 100), 2);
      const open = round(prevClose * (1 + (((hashCode(item.code + '-o') % 80) - 40) / 10000)), 2);
      const high = round(Math.max(open, last) * 1.012, 2);
      const low = round(Math.min(open, last) * 0.988, 2);
      const amount = round(3500 + (hashCode(item.code + '-amt') % 240000), 0);
      const volume = round(amount / Math.max(last, 0.01) * 100, 0);
      return {
        code: item.code,
        name: item.name,
        sector: item.sector,
        last,
        prevClose,
        open,
        high,
        low,
        changePct: round(((last - prevClose) / prevClose) * 100, 2),
        volume,
        amount,
        turnoverRate: round(0.5 + (hashCode(item.code + '-tr') % 120) / 10, 2),
        volumeRatio: round(0.6 + (hashCode(item.code + '-vr') % 42) / 10, 2),
        pe: item.pe,
        pb: item.pb,
        marketCap: item.marketCap,
        dividendYield: item.dividendYield,
        updatedAt: nowText()
      } satisfies Quote;
    });
  }

  async listQuotes(): Promise<Quote[]> {
    this.quotes = this.quotes.map((quote) => {
      const tick = (Math.random() - 0.485) * 0.85;
      const last = round(Math.max(0.01, quote.last * (1 + tick / 100)), 2);
      const high = round(Math.max(quote.high, last), 2);
      const low = round(Math.min(quote.low, last), 2);
      const amount = round(quote.amount * (1 + Math.random() * 0.012), 0);
      const volume = round(amount / Math.max(last, 0.01) * 100, 0);
      return {
        ...quote,
        last,
        high,
        low,
        volume,
        amount,
        changePct: round(((last - quote.prevClose) / quote.prevClose) * 100, 2),
        turnoverRate: round(Math.max(0.05, quote.turnoverRate * (1 + (Math.random() - 0.5) * 0.03)), 2),
        volumeRatio: round(Math.max(0.1, quote.volumeRatio * (1 + (Math.random() - 0.5) * 0.08)), 2),
        updatedAt: nowText()
      };
    });
    return [...this.quotes];
  }

  async getKline(code: string, limit = 80): Promise<KlinePoint[]> {
    const quote = this.quotes.find((item) => item.code === code) ?? this.quotes[0];
    const points: KlinePoint[] = [];
    let close = quote.prevClose * 0.86;
    const today = new Date();
    for (let i = limit; i >= 1; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const drift = (Math.random() - 0.47) * 3.4;
      const open = close * (1 + (Math.random() - 0.5) * 0.018);
      close = Math.max(1, close * (1 + drift / 100));
      const high = Math.max(open, close) * (1 + Math.random() * 0.018);
      const low = Math.min(open, close) * (1 - Math.random() * 0.018);
      points.push({
        date: date.toISOString().slice(0, 10),
        open: round(open, 2),
        close: round(close, 2),
        low: round(low, 2),
        high: round(high, 2),
        volume: round((quote.amount / Math.max(close, 0.01)) * (70 + Math.random() * 80), 0)
      });
    }
    points[points.length - 1].close = quote.last;
    points[points.length - 1].high = Math.max(points[points.length - 1].high, quote.high);
    points[points.length - 1].low = Math.min(points[points.length - 1].low, quote.low);
    return points;
  }

  async getIntraday(code: string): Promise<IntradayPoint[]> {
    const quote = this.quotes.find((item) => item.code === code) ?? this.quotes[0];
    const points: IntradayPoint[] = [];
    let cumVolume = 0;
    let cumAmount = 0;
    for (let i = 0; i <= 240; i += 1) {
      const hour = 9 + Math.floor((30 + i) / 60);
      const minute = (30 + i) % 60;
      const wave = Math.sin(i / 18) * 0.7 + Math.cos(i / 31) * 0.4;
      const noise = (Math.random() - 0.5) * 0.35;
      const price = round(Math.max(0.01, quote.prevClose * (1 + (quote.changePct * (i / 240)) / 100 + (wave + noise) / 100)), 2);
      const volume = round(quote.volume / 240 * (0.5 + Math.random()), 0);
      cumVolume += volume;
      cumAmount += volume * price;
      points.push({
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        price,
        avgPrice: round(cumAmount / Math.max(cumVolume, 1), 2),
        volume
      });
    }
    points[points.length - 1].price = quote.last;
    return points;
  }
}
